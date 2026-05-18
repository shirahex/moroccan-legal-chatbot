# backend/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import time
from datetime import datetime
import sys
import re


# Get the current directory of app.py
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

try:
    from fullpipeline import ( 
        build_moroccan_legal_chatbot,
        answer_legal_question,
        ConversationMemory
    )
except ImportError as e:
    print(f"CRITICAL ERROR: Could not import from Google pipeline file. Ensure it's in the backend directory: {e}")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

print("Backend: Building the Moroccan Legal Chatbot components (Google Version)...")
chatbot_components = build_moroccan_legal_chatbot()
if not chatbot_components:
    print("CRITICAL ERROR: Chatbot components (Google) failed to build. Exiting.")
    sys.exit(1)
print("Backend: Chatbot components (Google) ready!")

# conversations dictionary will store active sessions that have had at least one interaction
# session_id -> {'history_for_frontend': [], 'created_at': ..., 'memory_instance': ConversationMemory_obj}
conversations = {} 

def enhance_response_with_metadata(response_text, processing_time_seconds, relevant_articles_from_llm_context=None):
    metadata = {
        'processing_time': f"{processing_time_seconds:.2f}s",
        'referenced_articles': relevant_articles_from_llm_context if relevant_articles_from_llm_context is not None else extract_article_references_from_text(response_text),
    }
    return response_text, metadata

def extract_article_references_from_text(text):
    article_pattern = r"(?:l'article|les articles|article|articles)\s+(?:CP|CPP|code pénal|code de procédure pénale)?\s*([\d\s,-et]+(?:bis|ter)?)"
    raw_matches = re.findall(article_pattern, text, re.IGNORECASE)
    extracted_articles = []
    for match_group in raw_matches:
        individual_refs = re.findall(r'\d+(?:bis|ter)?', match_group)
        extracted_articles.extend(individual_refs)
    return list(set(extracted_articles))

@app.route('/api/new-session', methods=['POST'])
def create_new_session():
    session_id = f"session_google_{int(time.time() * 1000)}_{os.urandom(4).hex()}"
    created_at_iso = datetime.now().isoformat()
    print(f"Backend: /api/new-session generated potential new session ID: {session_id}")
    # Session is NOT added to 'conversations' here. It's added on the first /api/chat call.
    return jsonify({
        'session_id': session_id,
        'created_at': created_at_iso 
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    question = data.get('message', '')
    session_id = data.get('session_id') 

    if not session_id:
        # Fallback, though frontend should always send one
        session_id = f"default_chat_session_{int(time.time())}"
        print(f"Backend Warning: /api/chat called without session_id, using temporary: {session_id}")

    if not question: 
        return jsonify({'error': 'Message content is empty'}), 400

    # If this is the first message for this session_id, create its entry in 'conversations'
    if session_id not in conversations:
        print(f"Backend: First message for session {session_id}. Creating entry in 'conversations'.")
        conversations[session_id] = {
            'history_for_frontend': [], 
            'created_at': datetime.now().isoformat(), # Or use created_at if frontend passed it for consistency
            'memory_instance': ConversationMemory(max_history=10, memory_file=None) 
        }
    
    session_data = conversations[session_id]
    llm_memory_instance = session_data['memory_instance']

    start_time = time.time()
    raw_response_text = answer_legal_question(question, chatbot_components, llm_memory_instance) 
    processing_time = time.time() - start_time

    # Extract relevant articles from the last interaction in ConversationMemory
    last_bot_interaction = next((h for h in reversed(llm_memory_instance.history) if h['answer'] == raw_response_text), None)
    relevant_articles = []
    if last_bot_interaction and last_bot_interaction.get('relevant_articles'):
        relevant_articles = [str(ra.get('article', 'N/A')) for ra in last_bot_interaction['relevant_articles'] if ra.get('article')]
    
    final_response_text, response_metadata = enhance_response_with_metadata(
        raw_response_text,
        processing_time,
        relevant_articles_from_llm_context=relevant_articles
    )

    user_msg = {'type': 'user', 'content': question, 'timestamp': datetime.now().isoformat()}
    bot_msg = {'type': 'bot', 'content': final_response_text, 'timestamp': datetime.now().isoformat(), 'metadata': response_metadata}
    
    session_data['history_for_frontend'].extend([user_msg, bot_msg])

    return jsonify({
        'response': final_response_text,
        'session_id': session_id, 
        'processing_time': response_metadata['processing_time'],
        'metadata': response_metadata # Includes referenced_articles
    })

@app.route('/api/history/<session_id>', methods=['GET'])
def get_history(session_id):
    if session_id not in conversations:
        print(f"Backend: Session {session_id} not found for /api/history.")
        return jsonify({'error': 'Session not found'}), 404
    
    # print(f"Backend: Retrieving history for session {session_id}.")
    session_data = conversations[session_id]
    return jsonify({
        'session_id': session_id,
        'history': session_data['history_for_frontend'], 
        'created_at': session_data['created_at']
    })

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    print("Backend: /api/sessions called to retrieve all session summaries.")
    sessions_list = []
    for session_id_key, session_data_val in conversations.items():
        # Ensure we only list sessions that actually have messages (are "active")
        if not session_data_val.get('history_for_frontend'):
            continue # Skip sessions that were initiated by /new-session but never had a chat

        session_title = f"Conversation {session_id_key[-6:]}" # Default fallback title
        
        # Try to get a title from the first user message in history_for_frontend
        first_user_message_obj = next((msg for msg in session_data_val['history_for_frontend'] if msg.get('type') == 'user'), None)
        if first_user_message_obj and first_user_message_obj.get('content'):
            content_preview = first_user_message_obj['content']
            session_title = content_preview[:60] + ('...' if len(content_preview) > 60 else '')
        elif session_data_val.get('history_for_frontend'): # If history exists but no user message first
            session_title = "Début de la conversation..." 
        
        last_activity_ts = session_data_val.get('created_at', datetime.now().isoformat()) # Default
        if session_data_val.get('history_for_frontend'):
            last_activity_ts = session_data_val['history_for_frontend'][-1].get('timestamp', last_activity_ts)
            
        sessions_list.append({
            'session_id': session_id_key,
            'title': session_title, # THIS IS THE TITLE FIELD FOR THE FRONTEND
            'created_at': session_data_val.get('created_at'),
            'last_activity': last_activity_ts, 
            'message_count': len(session_data_val.get('history_for_frontend', [])),
        })
    
    # Sort by last_activity, newest first
    sessions_list.sort(key=lambda x: x.get('last_activity', x.get('created_at', '')), reverse=True)
    
    # print(f"Backend: Returning {len(sessions_list)} active sessions for history view. Example title: {sessions_list[0]['title'] if sessions_list else 'N/A'}")
    return jsonify({
        'sessions': sessions_list
    })

if __name__ == '__main__':
    if not chatbot_components: 
        print("Backend: Chatbot (Google) components not loaded. API cannot start.")
    else: 
        print("Backend: Starting Flask API server (Google Version) on http://127.0.0.1:5000/")
        app.run(debug=True, host='0.0.0.0', port=5000)