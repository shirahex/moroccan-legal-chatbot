# backend/fullpipeline_google.py

# 📦 Imports
import json
import re
import time
import os
import faiss
import requests # Kept for potential future use, not actively used by Gemini pipeline
import numpy as np # FAISS might use it, good to have
from typing import List, Dict, Any, Tuple, Optional

from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS as LangchainFAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from rank_bm25 import BM25Okapi
from Levenshtein import distance as levenshtein_distance
from datetime import datetime
from dotenv import load_dotenv

try:
    from langdetect import detect as detect_language
    from langdetect.lang_detect_exception import LangDetectException
except ImportError:
    print("WARNING: langdetect library not found. pip install langdetect. Language detection will be disabled.")
    def detect_language(text): raise LangDetectException("langdetect not installed", text) # Mock function
    class LangDetectException(Exception): pass


# --- CONFIGURATION ---
load_dotenv() 

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY is None:
    print("🚨 CRITICAL: GOOGLE_API_KEY environment variable not set.")
    print("   Please ensure a .env file exists in the 'backend' directory with:")
    print("   GOOGLE_API_KEY='your_google_ai_studio_api_key_here'")
    exit()

# Model Names
GOOGLE_EMBEDDING_MODEL = os.getenv("GOOGLE_EMBEDDING_MODEL", "models/embedding-001")
GOOGLE_CHAT_MODEL = os.getenv("GOOGLE_CHAT_MODEL", "models/gemini-1.5-flash-latest") 
GOOGLE_TRANSLATE_MODEL = os.getenv("GOOGLE_TRANSLATE_MODEL", GOOGLE_CHAT_MODEL) # Using Flash for speed in translation

# Data file paths
PENAL_CODE_PATH = "penal_code_chunks_themes_expanded.jsonl"
PROCEDURE_CODE_PATH = "legal_articles_dataset.json"
FAISS_INDEX_PATH_GOOGLE = os.getenv("FAISS_INDEX_PATH_GOOGLE", "faiss_index_moroccan_legal_google") # For Google embeddings
CONVERSATION_MEMORY_FILE = "conversation_memory_google.json" # For standalone interactive mode

# --- CONVERSATION MEMORY CLASS ---
class ConversationMemory:
    def __init__(self, max_history: int = 10, memory_file: Optional[str] = None):
        self.history = []
        self.max_history = max_history
        self.memory_file = memory_file
        self.user_info = {} # For potential future use
        
        if memory_file and os.path.exists(memory_file):
            try:
                with open(memory_file, 'r', encoding='utf-8') as f:
                    saved_data = json.load(f)
                    self.history = saved_data.get('history', [])
                    self.user_info = saved_data.get('user_info', {})
                # print(f"✅ Loaded {len(self.history)} conversation turns from {memory_file}")
            except Exception as e:
                print(f"⚠️ Error loading memory file '{memory_file}': {e}")
                self.history, self.user_info = [], {}
    
    def add_interaction(self, question: str, answer: str, relevant_articles: List[Dict] = None, lang: str = 'fr'):
        # lang parameter stores the language of the user's question for context
        turn = {
            'timestamp': datetime.now().isoformat(),
            'question': question, # Store original question
            'answer': answer,     # Store final answer in user's language
            'relevant_articles': relevant_articles or [],
            'lang': lang          # Language of the original question
        }
        self.history.append(turn)
        if len(self.history) > self.max_history: 
            self.history = self.history[-self.max_history:]
        self._save_to_file()
        
    def get_conversation_history(self, last_n: int = None) -> List[Dict]:
        if last_n is None or last_n >= len(self.history):
            return self.history
        return self.history[-last_n:]
    
    def get_formatted_history(self, last_n: int = 3, target_lang_for_llm: str = 'fr') -> str:
        # History for the LLM should ideally be in the LLM's processing language (French)
        recent_history = self.get_conversation_history(last_n)
        if not recent_history: 
            return ""
        
        formatted = "Historique de conversation récente (traduit en français si nécessaire pour le contexte du modèle):\n"
        for i, turn in enumerate(recent_history, 1):
            q_text = turn['question']
            a_text = turn['answer']
            turn_lang = turn.get('lang', 'fr')

            if turn_lang != target_lang_for_llm:
                # This is a simplification. In a real scenario, you'd store translated versions
                # or translate on-the-fly if the LLM can't handle mixed-language history well.
                # For now, we just indicate the original language.
                # For Gemini, it's often good at handling mixed context, but explicit translation can be better.
                formatted += f"Question {i} (originale en {turn_lang}): {q_text}\n"
                # If answer was also in a different lang, we might need to translate it too for LLM context.
                # For now, assume LLM can handle it or the system prompt guides it.
                formatted += f"Réponse {i} (probablement en {turn_lang}): {a_text[:150] + '...' if len(a_text) > 150 else a_text}\n\n"
            else:
                formatted += f"Question {i}: {q_text}\n"
                formatted += f"Réponse {i}: {a_text[:150] + '...' if len(a_text) > 150 else a_text}\n\n"
        return formatted
    
    def _save_to_file(self):
        if self.memory_file:
            try:
                with open(self.memory_file, 'w', encoding='utf-8') as f:
                    json.dump({'history': self.history, 'user_info': self.user_info}, f, ensure_ascii=False, indent=2)
            except Exception as e: 
                print(f"⚠️ Error saving memory file '{self.memory_file}': {e}")

    def clear_history(self): # Useful for API if a session is truly reset
        self.history = []
        self.user_info = {}
        self._save_to_file()

# --- TRANSLATION FUNCTION ---
def translate_text_gemini(text: str, target_language_code: str, source_language_code: Optional[str] = None) -> str:
    if not text or not text.strip(): return text

    lang_map = {"fr": "French", "ar": "Arabic", "en": "English"}
    target_lang_full = lang_map.get(target_language_code.lower(), target_language_code)
    
    if source_language_code:
        source_lang_full = lang_map.get(source_language_code.lower(), source_language_code)
        prompt_instruction = f"Translate the following text from {source_lang_full} to {target_lang_full}."
    else:
        prompt_instruction = f"Translate the following text to {target_lang_full}."

    translator_chat = ChatGoogleGenerativeAI(model=GOOGLE_TRANSLATE_MODEL, temperature=0.05, google_api_key=GOOGLE_API_KEY) # Low temp for translation
    
    system_content = (
        f"{prompt_instruction} "
        f"Your goal is to provide a fluent and accurate translation. "
        f"If the input appears to be legal text, try to maintain its formal tone and use appropriate terminology in {target_lang_full} if known. "
        f"Output ONLY the translated text. Do not add any preambles, explanations, or apologies."
    )
    messages = [ SystemMessage(content=system_content), HumanMessage(content=text) ]
    
    try:
        response = translator_chat.invoke(messages)
        translated_text = response.content.strip()
        # print(f"DEBUG Translation: FROM '{text[:50]}...' TO '{translated_text[:50]}...' (Target: {target_lang_full})")
        return translated_text
    except Exception as e:
        print(f"❌ Exception during Gemini translation to {target_lang_full}: {e}")
        return text # Fallback to original text on error

# --- GOOGLE GEMINI LLM QUERY FUNCTION ---
def query_google_llm(prompt: str, system_prompt: str, model_name: str = GOOGLE_CHAT_MODEL, temperature: float = 0.7):
    chat = ChatGoogleGenerativeAI(model=model_name, temperature=temperature, google_api_key=GOOGLE_API_KEY, convert_system_message_to_human=True)
    messages = []
    if system_prompt:
        messages.append(SystemMessage(content=system_prompt))
    messages.append(HumanMessage(content=prompt))
    
    try:
        response = chat.invoke(messages)
        return response.content.strip()
    except Exception as e:
        print(f"❌ Exception when calling Google Gemini API (model: {model_name}): {e}")
        if "API_KEY_INVALID" in str(e) or "PermissionDenied" in str(e) or "Quota" in str(e):
            print("   Ensure GOOGLE_API_KEY is correct, Gemini API is enabled, and you are within usage quotas.")
        return "Erreur de communication avec le modèle d'intelligence artificielle. Veuillez réessayer plus tard."

# --- DATA LOADING ---
def load_dataset(penal_code_path=PENAL_CODE_PATH, procedure_code_path=PROCEDURE_CODE_PATH):
    data = []
    # Load penal code
    try:
        with open(penal_code_path, "r", encoding="utf-8") as f:
            penal_data_loaded = [json.loads(line) for line in f]
            for item in penal_data_loaded:
                item["metadata"] = item.get("metadata", {}) # Ensure metadata exists
                item["metadata"]["source"] = "penal_code"
                article_num = item["metadata"].get("article")
                text_content = item.get("text", "")
                if article_num:
                    item["text"] = f"Code Pénal Article {article_num}: {text_content}"
                else:
                    item["text"] = text_content
                data.append(item)
    except FileNotFoundError:
        print(f"⚠️ Penal code file not found: {penal_code_path}")
    except Exception as e:
        print(f"⚠️ Error loading penal code from '{penal_code_path}': {e}")

    # Load procedure code
    try:
        with open(procedure_code_path, "r", encoding="utf-8") as f:
            procedure_data_raw = json.load(f)
            procedure_data_list = []
            if isinstance(procedure_data_raw, list):
                procedure_data_list = procedure_data_raw
            elif isinstance(procedure_data_raw, dict):
                found_list = next((procedure_data_raw[k] for k in procedure_data_raw if isinstance(procedure_data_raw.get(k), list)), None)
                if found_list is not None:
                    procedure_data_list = found_list
                elif "text" in procedure_data_raw: 
                     procedure_data_list = [procedure_data_raw]
                else:
                    print(f"⚠️ Procedure data in '{procedure_code_path}' is a dict but not a recognized list wrapper or single item structure.")
            
            for item in procedure_data_list:
                metadata = {
                    "article": item.get("article_number"), "book": item.get("book"),
                    "title": item.get("title"), "chapter": item.get("chapter"),
                    "section": item.get("section"), "source": "procedure_code"
                }
                article_num = metadata.get("article")
                text_content = item.get("text", "")
                if article_num:
                    new_text = f"Code de Procédure Pénale Article {article_num}: {text_content}"
                else:
                    new_text = text_content
                
                standardized_item = {"text": new_text, "metadata": metadata}
                data.append(standardized_item)
    except FileNotFoundError:
        print(f"⚠️ Procedure code file not found: {procedure_code_path}")
    except Exception as e:
        print(f"⚠️ Error loading procedure code from '{procedure_code_path}': {e}")
        
    if not data:
        print(f"❌ CRITICAL: No data loaded. Chatbot cannot function. Check paths:\n   Penal='{penal_code_path}'\n   Procedure='{procedure_code_path}'. Exiting.")
        exit()
        
    print(f"Loaded and pre-processed {len(data)} legal chunks with article info in text.")
    return data

# --- TEXT PREPROCESSING ---
def preprocess_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text) 
    text = re.sub(r'\s+', ' ', text).strip() 
    return text

def extract_tokens(text: str) -> List[str]:
    return re.findall(r'\b\w{3,}\b', preprocess_text(text))

# --- SYNONYM MAP ---
def build_enhanced_synonym_map() -> Dict[str, List[str]]:
    synonym_map = {
        "crime": ["crime", "infraction", "délit", "contravention", "violation", "illégal", "criminel", "offense", "acte criminel"],
        "accusation": ["accusé", "inculpé", "prévenu", "mis en examen", "poursuite", "charge", "procès", "chef d'accusation"],
        "victime": ["victime", "plaignant", "partie civile", "personne lésée", "préjudice", "lésé"],
        "violence": ["violence", "agression", "coups", "blessures", "voie de fait", "brutalité", "maltraitance", "rixe"],
        "homicide": ["meurtre", "assassinat", "homicide", "tué", "mort", "décès criminel", "infanticide"],
        "blessure": ["blessure", "lésion", "préjudice corporel", "dommage physique", "traumatisme", "atteinte physique"],
        "vol": ["vol", "larcin", "soustraction", "dérober", "voler", "cambriolage", "chapardage", "effraction", "pillage"],
        "fraude": ["fraude", "escroquerie", "tromperie", "arnaque", "falsification", "contrefaçon", "abus de confiance"],
        "destruction": ["dégradation", "destruction", "vandalisme", "sabotage", "détérioration", "dommage matériel"],
        "viol": ["viol", "agression sexuelle", "attentat à la pudeur", "abus sexuel", "harcèlement sexuel grave"],
        "harcèlement": ["harcèlement", "harcèlement sexuel", "intimidation", "menace", "pression", "persécution"],
        "insulte": ["insulte", "injure", "outrage", "diffamation", "calomnie", "offense", "atteinte à l'honneur", "propos injurieux"],
        "menace": ["menace", "intimidation", "chantage", "coercition", "pression verbale"],
        "plainte": ["plainte", "dénonciation", "requête", "poursuite", "action en justice", "signalement"],
        "témoignage": ["témoignage", "déposition", "déclaration", "attestation", "preuve testimoniale", "récit des faits"],
        "jugement": ["jugement", "verdict", "sentence", "décision", "arrêt", "condamnation", "ordonnance", "décision de justice"],
        "emprisonnement": ["prison", "détention", "incarcération", "emprisonnement", "réclusion", "peine de prison"],
        "droits": ["droit", "prérogative", "liberté", "garantie juridique", "protection légale", "droit fondamental"],
        "peine": ["peine", "sanction", "punition", "châtiment", "amende", "sentence pénale", "condamnation"],
        "appel": ["appel", "recours", "pourvoi", "contestation", "révision judiciaire", "voie de recours"],
        "mariage": ["mariage", "union", "alliance", "époux", "conjoint", "contrat de mariage"],
        "divorce": ["divorce", "séparation", "dissolution", "répudiation", "rupture de mariage"],
        "famille": ["famille", "foyer", "ménage", "parenté", "filiation", "liens familiaux"],
        "mineur": ["mineur", "enfant", "adolescent", "jeune", "pupille", "personne mineure"],
        "tutelle": ["tutelle", "garde", "curatelle", "autorité parentale", "kafala", "protection des mineurs"],
        "corruption": ["corruption", "pot-de-vin", "concussion", "prévarication", "malversation", "trafic d'influence"],
        "blanchiment": ["blanchiment", "blanchiment d'argent", "recel", "dissimulation de fonds", "argent sale"],
        "drogue": ["drogue", "stupéfiant", "substance illicite", "narcotique", "toxicomanie", "trafic de drogue"],
        "arme": ["arme", "arme à feu", "arme blanche", "explosif", "munition", "port d'arme"],
        "terrorisme": ["terrorisme", "acte terroriste", "extrémisme", "radicalisation", "association de malfaiteurs terroriste"],
        "légitime défense": ["légitime défense", "défense personnelle", "se défendre", "riposte", "protection personnelle", "état de nécessité"],
        "tentative": ["tentative", "essai", "effort", "commencement d'exécution", "tentative punissable"],
        "récidive": ["récidive", "répétition", "réitération", "rechute criminelle", "multi-récidiviste"]
    }
    darija_terms = {
        "vol": ["serqa", "tcheflih", "khetfou", "نشل", "شفارة"],
        "violence": ["drb", "jarh", "d'ruba", "مضاربة", "عنف"],
        "police": ["lbolis", "shorta", "lmkhazniya", "بوليس", "شرطة"],
        "prison": ["lhabs", "sjn", "zinzana", "حبس", "سجن"],
        "justice": ["l3adala", "haq", "mahkama", "عدالة", "محكمة"],
        "argent": ["flouss", "lkorti", "lkhwden", "فلوس"],
        "avocat": ["lmouhami", "difa3", "محامي"],
        "juge": ["qadi", "hakim", "قاضي"]
    }
    procedure_terms = {
        "appel": ["appel", "recours", "pourvoi", "contestation", "révision judiciaire"],
        "procédure": ["procédure", "processus", "formalité", "démarche", "protocole judiciaire", "règles de procédure"],
        "audience": ["audience", "séance", "comparution", "session", "débat judiciaire", "séance de tribunal"],
        "détention": ["détention", "incarcération", "emprisonnement", "rétention", "garde à vue", "détention provisoire"],
        "prévenu": ["prévenu", "accusé", "inculpé", "mis en cause", "suspecté", "mis en examen"],
        "instruction": ["instruction", "enquête", "investigation", "information judiciaire", "juge d'instruction"],
        "comparution": ["comparution", "présentation", "convocation", "citation à comparaître", "mandat de comparution"],
        "témoin": ["témoin", "déposition", "attestation", "témoignage oculaire"],
        "avocat": ["avocat", "défenseur", "conseil", "représentant légal", "assistance juridique"],
        "tribunal": ["tribunal", "cour", "juridiction", "instance", "magistrature", "palais de justice"],
        "cassation": ["cassation", "cour de cassation", "annulation de jugement", "révocation", "invalidation"]
    }

    for key, values in procedure_terms.items():
        if key in synonym_map:
            synonym_map[key].extend(val for val in values if val not in synonym_map[key])
        else:
            synonym_map[key] = list(values)
    for key, values in darija_terms.items():
        if key in synonym_map:
            synonym_map[key].extend(val for val in values if val not in synonym_map[key])
        else:
            synonym_map[key] = list(values)
    return synonym_map

# --- INPUT HANDLING & NORMALIZATION ---
def is_greeting(text: str) -> bool:
    greetings = [
        "bonjour", "salut", "bonsoir", "coucou", "hey", "hello", "hi", "slt", "bjr",
        "comment ça va", "ça va", "comment vas-tu", "comment allez-vous", "ca va",
        "salam", "salem", "salaam", "salam alaykoum", "salamou alaykoum", "slm",
        "sbah lkhir", "masa lkhir", "labas", "labass", "la bas", "lkhir",
        "ahlan", "marhba", "merhba", "bikhir", "cv", "ki dayr", "ki dayra"
    ]
    clean_text_no_punct = re.sub(r'[^\w\s]', '', text.lower().strip())
    if clean_text_no_punct in greetings: return True
    for greeting in greetings:
        if clean_text_no_punct.startswith(greeting) and len(text.split()) <= 5: return True
    return False

def is_farewell(text: str) -> bool:
    farewells = [
        "au revoir", "a bientot", "à bientôt", "adieu", "à plus tard", "a plus", "à plus", "a+",
        "bonne journée", "bonne soirée", "salut", "bye", "ciao", "je dois y aller", "je pars",
        "merci au revoir", "merci bye", "merci bonne journée",
        "beslama", "bslama", "ma'a salama", "ma salama", "allah yselmek", "tbark allah 3lik",
        "nshufek men ba3d", "bqa 3la khir", "yallah", "thalla"
    ]
    clean_text_no_punct = re.sub(r'[^\w\s]', '', text.lower().strip())
    if clean_text_no_punct in farewells: return True
    for farewell in farewells:
        if clean_text_no_punct.startswith(farewell) and len(text.split()) <= 5: return True
    farewell_patterns = [
        r'\bmerci.*(au revoir|bye|a bientot|à bientôt)\b', r'\b(je te remercie|remercie).*(au revoir|bye)\b', 
        r'\bje dois partir\b', r'\bje m\'en vais\b', r'\bà la prochaine\b'
    ]
    for pattern in farewell_patterns:
        if re.search(pattern, text.lower().strip()): return True
    return False

def get_farewell_response() -> str:
    import random
    responses = [
        "Au revoir! N'hésitez pas à revenir si vous avez d'autres questions juridiques.",
        "À bientôt! Je reste disponible pour répondre à vos questions sur le droit marocain.",
        "Merci de votre visite. Bonne journée et à bientôt!",
        "Beslama! Je serai là si vous avez besoin d'autres informations juridiques."
    ]
    return random.choice(responses)

def handle_empty_input(text: str) -> Tuple[bool, str]:
    clean_text = text.strip()
    if not clean_text or len(clean_text) < 2:
        return True, "Je n'ai pas bien compris votre message. Pourriez-vous reformuler votre question juridique s'il vous plaît?"
    if len(clean_text) < 5 and not any(c.isalpha() for c in clean_text):
        return True, "Il semble que votre message soit incomplet ou contienne des caractères non pertinents. Pourriez-vous poser une question claire concernant le droit marocain?"
    return False, ""

def normalize_french_text(text: str, corpus_texts: Optional[List[str]] = None) -> str: # corpus_texts arg kept for potential future use
    common_misspellings = {
        "legitime": "légitime", "defense": "défense", "procedure": "procédure",
        "penal": "pénal", "penale": "pénale", "legalite": "légalité",
        "cour dapel": "cour d'appel", "tribunal dapel": "tribunal d'appel",
        "vole": "vol", "voler": "vol", "volé": "vol", 
        "agression sexuel": "agression sexuelle", "violence conjugal": "violence conjugale",
        "harcelement": "harcèlement", "harcelemente": "harcèlement",
        "temoignage": "témoignage", "avoca": "avocat", 
        "apel": "appel", "apelle": "appel",
        "contitution": "constitution", "enfent": "enfant"
    }
    normalized = text.lower()
    for misspelling, correction in common_misspellings.items():
        pattern = r'\b' + re.escape(misspelling) + r'\b'
        normalized = re.sub(pattern, correction, normalized)
    return normalized
    
def get_greeting_response(greeting_text: str) -> str:
    import random
    name_match = re.search(r"(?:bonjour|salam|salut)\s*([A-Za-zÀ-ÖØ-öø-ÿ]+)", greeting_text, re.IGNORECASE)
    name_part = ""
    if name_match and len(name_match.group(1)) > 2 :
        name_part = f" {name_match.group(1)}"
    
    responses = [
        f"Bonjour{name_part}! Je suis votre assistant juridique marocain. Comment puis-je vous aider avec le Code pénal ou de procédure pénale aujourd'hui?",
        f"Salam{name_part}! Je suis là pour répondre à vos questions concernant le droit marocain. Que voulez-vous savoir?",
        f"Merhba{name_part}! Je suis votre assistant juridique. Posez-moi une question sur le droit pénal ou de procédure pénale marocain."
    ]
    return random.choice(responses)

# --- CHATBOT COMPONENTS BUILDING ---
def build_moroccan_legal_chatbot():
    print("🏗️ Building Google Gemini-Powered Moroccan Legal Chatbot...")
    all_data = load_dataset()
    if not all_data: 
        return None
        
    chunk_bank = []
    for i, item in enumerate(all_data):
        chunk_bank.append({
            "text": item["text"],
            "metadata": {**item["metadata"], "original_index": i},
            "tokens": extract_tokens(item["text"])
        })
    print(f"📚 Prepared {len(chunk_bank)} legal text chunks for processing.")
    
    tokenized_corpus_for_bm25 = [chunk["tokens"] for chunk in chunk_bank]
    bm25 = BM25Okapi(tokenized_corpus_for_bm25)
    print("✅ BM25 keyword index created.")
    
    try:
        google_embedding_engine = GoogleGenerativeAIEmbeddings(model=GOOGLE_EMBEDDING_MODEL, google_api_key=GOOGLE_API_KEY)
    except Exception as e:
        print(f"❌ CRITICAL: Failed to initialize Google Embeddings (model: {GOOGLE_EMBEDDING_MODEL}): {e}")
        return None

    if os.path.exists(FAISS_INDEX_PATH_GOOGLE) and os.listdir(FAISS_INDEX_PATH_GOOGLE):
        try:
            print(f"🔄 Loading existing FAISS index for Google embeddings from {FAISS_INDEX_PATH_GOOGLE}...")
            vector_store = LangchainFAISS.load_local(FAISS_INDEX_PATH_GOOGLE, google_embedding_engine, allow_dangerous_deserialization=True)
            print(f"✅ FAISS vector index (Google) loaded.")
        except Exception as e:
            print(f"⚠️ Error loading FAISS index (Google) from '{FAISS_INDEX_PATH_GOOGLE}': {e}. Rebuilding index.")
            vector_store = None
    else:
        vector_store = None

    if vector_store is None:
        print(f"🔄 Creating Google embeddings ({GOOGLE_EMBEDDING_MODEL}) and new FAISS index at {FAISS_INDEX_PATH_GOOGLE}...")
        try:
            langchain_documents = []
            for chunk_item in chunk_bank:
                doc = Document(page_content=chunk_item["text"], metadata=chunk_item["metadata"])
                langchain_documents.append(doc)

            vector_store = LangchainFAISS.from_documents(langchain_documents, google_embedding_engine)
            vector_store.save_local(FAISS_INDEX_PATH_GOOGLE)
            print(f"✅ FAISS vector index (Google) created and saved.")
        except Exception as e:
            print(f"❌ Error creating Google embeddings or FAISS index: {e}")
            return None

    synonym_map = build_enhanced_synonym_map()
    print("✅ Enhanced legal synonym map created.")
    
    system_prompt = """
Tu es un assistant juridique marocain expert et dévoué, conçu pour aider les citoyens à comprendre le Code pénal et le Code de procédure pénale marocains. Ton rôle est de fournir des informations claires et accessibles basées STRICTEMENT et UNIQUEMENT sur les textes des articles juridiques qui te sont fournis dans le CONTEXTE.

👤 **À qui tu parles :**
Imagine que tu t'adresses à un citoyen ordinaire qui n'a pas de formation juridique. Utilise un langage simple et direct. Sois toujours respectueux, patient et professionnel.

💡 **Ta mission principale - Comment répondre :**

**A. Pour les questions GÉNÉRALES sur un sujet juridique (par exemple, "quelles sont les peines pour vol ?", "comment fonctionne la légitime défense ?") :**
1.  Identifie les articles pertinents dans le CONTEXTE qui traitent du sujet de la question.
2.  **Synthétise** les informations clés de ces articles pour répondre à la question de l'utilisateur. Explique les concepts avec tes propres mots, en te basant fidèlement sur le contenu des articles.
3.  Lorsque tu présentes une information ou une règle, **fais référence aux numéros d'articles** qui la soutiennent (par exemple, "Selon l'article X du Code pénal...", ou "Les articles Y et Z précisent que...").
4.  **NE CITE PAS le texte intégral des articles, sauf si l'article est très court ET qu'il répond directement et de manière concise à une partie de la question.** L'objectif est d'expliquer, pas de simplement lister les textes.
5.  Structure ta réponse de manière logique et facile à comprendre. Utilise des phrases courtes si possible.

**B. Si l'utilisateur demande SPÉCIFIQUEMENT le contenu d'un article précis (par exemple, "quel est le texte de l'article 512 ?", "que dit l'article X ?") :**
1.  Si l'article demandé est présent dans le CONTEXTE :
    a. Indique le numéro de l'article et sa source.
    b. **Cite le texte EXACT et COMPLET de cet article spécifique.**
    c. Si pertinent, ajoute une brève explication de cet article en langage simple.
2.  Si l'article demandé N'EST PAS dans le CONTEXTE, informe l'utilisateur poliment que tu n'as pas cet article spécifique sous les yeux (en utilisant la formulation de la section C).

**C. Si AUCUN article fourni dans le CONTEXTE ne permet de répondre (pour les questions générales OU spécifiques) :**
1.  **Ne mentionne PAS les articles qui ne sont pas pertinents ou qui ne répondent pas.** Ne dis PAS à l'utilisateur "l'article X ne contient pas la réponse".
2.  Réponds simplement et poliment quelque chose comme : "Je suis désolé, mais sur la base des informations dont je dispose actuellement, je ne peux pas répondre précisément à votre question. Pourriez-vous reformuler votre question ou la poser d'une manière différente ? Si votre situation est complexe, il est toujours recommandé de consulter un professionnel du droit."
3.  **Ne cite JAMAIS un article si tu n'es pas sûr qu'il réponde à la question.**

⚠️ **Règles cruciales à respecter IMPÉRATIVEMENT :**
-   Base TOUTE ta réponse EXCLUSIVEMENT sur les articles fournis dans le CONTEXTE. N'utilise aucune connaissance extérieure.
-   Ne fais JAMAIS de suppositions, d'extrapolations, ou de généralisations.
-   Sois objectif et neutre. N'exprime pas d'opinions personnelles et ne donne pas de conseils juridiques.
-   Cite toujours la source (Code pénal / Code de procédure pénale) avec le numéro d'article lorsque tu y fais référence.

🇫🇷 **Langue :** Par défaut, réponds en français. Si la question de l'utilisateur est dans une autre langue (par exemple, l'arabe), et que la réponse est générée en français basée sur le contexte français, la réponse finale à l'utilisateur doit être traduite dans la langue originale de sa question.
"""
    print("✅ Expert system prompt configured.")
    
    return {
        "chunk_bank": chunk_bank,
        "bm25": bm25,
        "system_prompt": system_prompt,
        "synonym_map": synonym_map,
        "vector_store": vector_store,
    }

# --- HYBRID SEARCH ---
def hybrid_search(
    question: str, 
    chatbot_components: Dict[str, Any],
    vector_top_k: int = 10,
    bm25_top_k: int = 10,
    final_top_k: int = 6,
    fuzzy_threshold: int = 2
) -> List[Dict]:
    start_time = time.time()
    
    chunk_bank = chatbot_components["chunk_bank"]
    vector_store = chatbot_components["vector_store"]
    bm25 = chatbot_components["bm25"]
    synonym_map = chatbot_components["synonym_map"]
    
    question_for_bm25_tokens = extract_tokens(question) # Use original question for BM25
    
    vector_results = []
    try:
        vector_relevance_threshold = 0.70 
        docs_scores = vector_store.similarity_search_with_relevance_scores(question, k=vector_top_k) # Query with original question for embeddings
        for doc, score in docs_scores:
            original_idx = doc.metadata.get("original_index")
            if original_idx is not None and score > vector_relevance_threshold:
                vector_results.append((original_idx, float(score)))
    except Exception as e:
        print(f"⚠️ Error during vector search: {e}")
    
    bm25_scores_all = bm25.get_scores(question_for_bm25_tokens)
    bm25_results = sorted(
        [(i, bm25_scores_all[i]) for i in range(len(bm25_scores_all)) if bm25_scores_all[i] > 0.1],
        key=lambda x: x[1],
        reverse=True
    )[:bm25_top_k]

    combined_scores = {} 
    for idx, score in vector_results:
        combined_scores[idx] = combined_scores.get(idx, 0) + (score * 0.6) 

    max_bm25_score = max(s for _, s in bm25_results) if bm25_results else 1.0
    for idx, score in bm25_results:
        normalized_bm25_score = score / max_bm25_score if max_bm25_score > 0 else 0
        combined_scores[idx] = combined_scores.get(idx, 0) + (normalized_bm25_score * 0.4)

    combined_results_with_base_scores = list(combined_scores.items())

    question_lower = question.lower() # Use original question for keyword matching
    procedure_keywords = ["procédure", "jugement", "audience", "appel", "pourvoi", "avocat", "tribunal", "comparution", "instruction", "enquête", "cassation", "recours", "juge", "procès", "plainte", "plaidoirie", "défense"]
    is_procedural = any(kw in question_lower for kw in procedure_keywords)

    def fuzzy_match_keywords(word, keywords_list, threshold=fuzzy_threshold):
        for kw in keywords_list:
            if len(kw) >= 3 and levenshtein_distance(word, kw) <= threshold:
                return kw
        return None

    question_words_for_fuzzy = re.findall(r'\b\w{4,}\b', question_lower)
    
    all_legal_synonyms_flat = []
    term_to_main_category = {}
    for category, terms_list in synonym_map.items():
        all_legal_synonyms_flat.append(category)
        term_to_main_category[category] = category
        for term in terms_list:
            all_legal_synonyms_flat.append(term)
            term_to_main_category[term] = category
    all_legal_synonyms_flat = list(set(all_legal_synonyms_flat))

    fuzzy_matched_categories = set()
    for word_in_q in question_words_for_fuzzy:
        matched_synonym = fuzzy_match_keywords(word_in_q, all_legal_synonyms_flat)
        if matched_synonym:
            fuzzy_matched_categories.add(term_to_main_category[matched_synonym])
    
    direct_matched_categories = set()
    for category, terms_list in synonym_map.items():
        if category in question_lower or any(syn in question_lower for syn in terms_list):
            direct_matched_categories.add(category)
            
    final_matched_categories = direct_matched_categories.union(fuzzy_matched_categories)

    boosted_final_scores = []
    for original_idx, base_score in combined_results_with_base_scores:
        if not (0 <= original_idx < len(chunk_bank)): continue

        chunk = chunk_bank[original_idx]
        text_lower = chunk["text"].lower() # Text of the chunk
        meta = chunk["metadata"]
        
        boosts = 0.0
        themes = meta.get("themes", [])
        if themes and any(cat in " ".join(themes).lower() for cat in final_matched_categories): boosts += 0.25
        if meta.get("article"): boosts += 0.15
        
        keyword_hits_in_chunk = sum(1 for cat in final_matched_categories if cat in text_lower or any(syn in text_lower for syn in synonym_map.get(cat,[])))
        if final_matched_categories:
            density = keyword_hits_in_chunk / len(final_matched_categories)
            boosts += min(0.20, density * 0.5)
        
        section = str(meta.get("section", "")).lower()
        title = str(meta.get("title", "")).lower()
        if any(cat in section for cat in final_matched_categories): boosts += 0.10
        if any(cat in title for cat in final_matched_categories): boosts += 0.10
            
        source_code = meta.get("source")
        if is_procedural and source_code == "procedure_code": boosts += 0.20
        elif not is_procedural and source_code == "penal_code": boosts += 0.20
            
        final_score_with_boost = base_score + boosts
        boosted_final_scores.append((original_idx, final_score_with_boost))
    
    top_boosted_results = sorted(boosted_final_scores, key=lambda x: x[1], reverse=True)[:final_top_k]
    
    # print(f"Total hybrid search returned {len(top_boosted_results)} chunks in {time.time() - start_time:.3f}s.")
    return [chunk_bank[idx] for idx, _ in top_boosted_results]

# --- CONTEXT FORMATTING ---
def format_chunk_with_metadata(chunk: Dict) -> str:
    meta = chunk["metadata"]
    text = chunk["text"] # This text already has "Code Penal/Procedure Article X:" prepended
    # The prepended info serves as the header, so we might not need to reconstruct it here
    # unless we want a more structured one. For now, the text itself is formatted.
    return f"{text}\n" # Simpler, as text from load_dataset is already prefixed

# --- MAIN QUESTION ANSWERING FUNCTION ---
def answer_legal_question(original_question: str, chatbot_components: Dict[str, Any], memory: ConversationMemory) -> str:
    total_start_time = time.time()
    print(f"\n📝 Original Question: {original_question}")
    
    # 1. Handle Empty/Greeting/Farewell for the original question
    is_empty, empty_response = handle_empty_input(original_question)
    if is_empty: 
        memory.add_interaction(original_question, empty_response, [], lang='fr') # Assume fr for these
        return empty_response
    
    if is_greeting(original_question):
        greeting_response = get_greeting_response(original_question)
        # Detect lang of greeting to store it correctly
        try: greeting_lang = detect_language(original_question)
        except LangDetectException: greeting_lang = 'fr'
        memory.add_interaction(original_question, greeting_response, [], lang=greeting_lang)
        # Greeting response is always in French as per current get_greeting_response
        # If greeting was Arabic, translate greeting_response to Arabic
        if greeting_lang == 'ar':
            return translate_text_gemini(greeting_response, "ar", "fr")
        return greeting_response
        
    if is_farewell(original_question):
        farewell_response = get_farewell_response()
        try: farewell_lang = detect_language(original_question)
        except LangDetectException: farewell_lang = 'fr'
        memory.add_interaction(original_question, farewell_response, [], lang=farewell_lang)
        if farewell_lang == 'ar':
            return translate_text_gemini(farewell_response, "ar", "fr")
        return farewell_response

    # 2. Language Detection and Query Translation
    question_for_rag = original_question
    detected_lang = 'fr' # Default
    try:
        detected_lang = detect_language(original_question)
        print(f"Detected language: {detected_lang}")
        if detected_lang == 'ar':
            print("Translating Arabic query to French for RAG...")
            question_for_rag = translate_text_gemini(original_question, "fr", "ar")
            print(f"Translated query for RAG: {question_for_rag}")
            if not question_for_rag or question_for_rag == original_question: # Translation failed or returned original
                print("WARN: Translation of Arabic query might have failed. Using original for RAG.")
                question_for_rag = original_question # Fallback, RAG might struggle
    except LangDetectException:
        print(f"Language detection failed for: '{original_question[:50]}...'. Assuming French.")
        detected_lang = 'fr'
    except Exception as e:
        print(f"Unexpected error during language detection/translation setup: {e}")
        detected_lang = 'fr'


    # 3. Retrieval (using French query for RAG)
    # Normalized French query might be better for retrieval robustness
    normalized_french_query_for_rag = normalize_french_text(question_for_rag)
    
    search_start_time = time.time()
    top_chunks = hybrid_search(normalized_french_query_for_rag, chatbot_components) 
    # search_time = time.time() - search_start_time

    # 4. Context Formatting and LLM Prompt Construction
    if not top_chunks:
        no_context_response_fr = (
            "Je suis désolé, mais sur la base des informations dont je dispose actuellement, "
            "je ne peux pas répondre précisément à votre question. Pourriez-vous reformuler "
            "votre question ou la poser d'une manière différente ? Si votre situation est complexe, "
            "il est toujours recommandé de consulter un professionnel du droit."
        )
        final_answer = no_context_response_fr
        if detected_lang == 'ar':
            final_answer = translate_text_gemini(no_context_response_fr, "ar", "fr")
        
        memory.add_interaction(original_question, final_answer, [], lang=detected_lang)
        print(f"⏱️ No relevant chunks found. Total time: {time.time() - total_start_time:.2f}s")
        return final_answer

    combined_context_fr = "\n---\n".join([format_chunk_with_metadata(chunk) for chunk in top_chunks])
    
    # History for LLM prompt should be primarily in French if possible
    conversation_history_for_llm_fr = memory.get_formatted_history(last_n=3, target_lang_for_llm='fr')
    system_prompt_llm = chatbot_components["system_prompt"]
    
    # The user_question part of the prompt for the LLM should be in French (question_for_rag)
    # as the system_prompt and context are in French.
    full_user_prompt_for_llm = f"""{conversation_history_for_llm_fr}
Contexte juridique pertinent (baser la réponse EXCLUSIVEMENT sur ces extraits en français):
{combined_context_fr}

Question de l'utilisateur (traduite en français si besoin pour compréhension, l'originale était en '{detected_lang}'): {question_for_rag}

Instructions supplémentaires pour la réponse:
- Génère ta réponse principale en FRANÇAIS.
- Cite les numéros d'article et la source (Code pénal / Code de procédure pénale) pour chaque point.
- Sois précis, concis et réponds directement à la question posée (question_for_rag).
- Si le contexte fourni ne permet pas de répondre, indique-le clairement sans inventer d'informations, en suivant les directives du rôle système.

Réponse détaillée et structurée (en FRANÇAIS):"""

    # 5. Generate Answer in French
    llm_start_time = time.time()
    response_text_fr = query_google_llm(full_user_prompt_for_llm, system_prompt_llm)
    # llm_time = time.time() - llm_start_time
    
    # 6. Post-processing and Translation to User's Language
    final_answer_to_user = response_text_fr
    if detected_lang == 'ar' and response_text_fr:
        print("Translating French LLM response to Arabic for user...")
        # Add a small disclaimer IN ARABIC before the translated content
        arabic_disclaimer = "يرجى ملاحظة أن هذه المعلومات مقدمة بناءً على ترجمة آلية للنصوص القانونية الفرنسية وقد لا تكون دقيقة تمامًا. للحصول على استشارة قانونية دقيقة، يرجى التواصل مع محترف قانوني.\n\n"
        translated_answer_ar = translate_text_gemini(response_text_fr, "ar", "fr")
        final_answer_to_user = arabic_disclaimer + translated_answer_ar
        print(f"Final Arabic answer (with disclaimer): {final_answer_to_user[:100]}...")
    
    # Hallucination filter (on French response before potential translation)
    if "constitution marocaine" in response_text_fr.lower() and "constitution" not in combined_context_fr.lower():
        hallucination_response_fr = (
            "Je suis désolé, mais votre question semble se référer à des textes (comme la Constitution) "
            "qui ne font pas partie de ma base de connaissances actuelle (Code pénal et Code de procédure pénale). "
            "Pourriez-vous reformuler votre question en lien avec ces codes?"
        )
        final_answer_to_user = hallucination_response_fr
        if detected_lang == 'ar':
             final_answer_to_user = translate_text_gemini(hallucination_response_fr, "ar", "fr")
        
    total_response_time = time.time() - total_start_time
    print(f"⏱️ Total question processing time: {total_response_time:.2f}s (Lang: {detected_lang})")
    
    relevant_articles_for_memory = [{"article": c["metadata"].get("article", "N/A"), "source": c["metadata"].get("source")} for c in top_chunks]
    memory.add_interaction(original_question, final_answer_to_user, relevant_articles_for_memory, lang=detected_lang)
    
    return final_answer_to_user

# --- INTERACTIVE MODE (Example for direct execution of this file) ---
def run_interactive_mode_google(chatbot_components_google):
    print("\n" + "=" * 60)
    print("🤖 Assistant Juridique Marocain (Google Gemini) - Mode Interactif")
    print("=" * 60)
    print("Tapez 'quit', 'exit', 'quitter', ou 'q' pour quitter.")
    
    memory_instance = ConversationMemory(max_history=10, memory_file=CONVERSATION_MEMORY_FILE)
    
    while True:
        print("\n" + "-" * 60)
        try:
            user_question = input("🧑‍⚖️ Votre question: ").strip()
        except KeyboardInterrupt:
            print("\nAu revoir! 👋")
            break
            
        if user_question.lower() in ['quit', 'exit', 'quitter', 'q']:
            print("Au revoir! 👋")
            break
            
        if not user_question:
            print("Veuillez entrer une question.")
            continue
            
        response = answer_legal_question(user_question, chatbot_components_google, memory_instance)
        print("\n💬 Réponse de l'Assistant Juridique:")
        print(response)

# --- MAIN ENTRY POINT (Example for direct execution of this file) ---
if __name__ == "__main__":
    print("🚀 Initialisation du Chatbot Juridique Marocain (Google Gemini Version)...")
    
    chatbot_resources_google = build_moroccan_legal_chatbot()
    
    if chatbot_resources_google:
        print("✅ Chatbot initialisé avec succès.")
        run_interactive_mode_google(chatbot_resources_google)
    else:
        print("❌ CRITICAL: Impossible de démarrer le chatbot (Google). Vérifiez les erreurs ci-dessus.")