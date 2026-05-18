// frontend/src/App.js
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MessageBubble from "./components/MessageBubble";
import LandingPage from "./components/LandingPage";
import Sidebar from "./components/Sidebar";
import SettingsView from "./components/SettingsView";
import HistoryView from "./components/HistoryView";
import PenalCodeView from "./components/PenalCodeView";
import HelpView from "./components/HelpView";
import { SettingsProvider } from "./contexts/SettingsContext";
import { v4 as uuidv4 } from "uuid";
import { Send } from "lucide-react";
import TypingLoader from "./components/TypingLoader";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [sessionId, setSessionId] = useState(() => {
    const storedSessionId = localStorage.getItem('qanouniChatSessionId');
    // console.log("Initial sessionId from localStorage:", storedSessionId);
    return storedSessionId || uuidv4();
  });

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false); // Main trigger for async operations
  const [showDelayedLoader, setShowDelayedLoader] = useState(false); // Controls actual loader visibility
  const [inputMessage, setInputMessage] = useState('');
  const [currentView, setCurrentView] = useState('conversation');
  const [sessionHistoryList, setSessionHistoryList] = useState([]);
  const chatContainerRef = useRef(null);
  const initialLoadAttemptedForSession = useRef({});
  const loaderTimeoutRef = useRef(null); // Ref for the loader delay timeout

  // Effect to manage the delayed loader based on the main 'loading' state
  useEffect(() => {
    if (loading) {
      // If loading becomes true, set a timeout to show the delayed loader
      // console.log("useEffect: 'loading' is true, setting timeout for delayed loader.");
      loaderTimeoutRef.current = setTimeout(() => {
        // console.log("useEffect: Timeout fired, setShowDelayedLoader(true).");
        setShowDelayedLoader(true);
      }, 300); // 300ms delay - adjust as needed
    } else {
      // If loading becomes false, clear any existing timeout and hide the delayed loader immediately
      // console.log("useEffect: 'loading' is false, clearing timeout and setShowDelayedLoader(false).");
      clearTimeout(loaderTimeoutRef.current);
      setShowDelayedLoader(false);
    }

    // Cleanup timeout on component unmount or if 'loading' changes before timeout fires
    return () => {
      clearTimeout(loaderTimeoutRef.current);
    };
  }, [loading]); // This effect depends only on the 'loading' state

  useEffect(() => {
    // console.log("Persisting sessionId to localStorage:", sessionId);
    localStorage.setItem('qanouniChatSessionId', sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (currentView === 'history') {
      // console.log("App.js useEffect: currentView is 'history', fetching session list.");
      fetchSessionList();
    }
  }, [currentView]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, showDelayedLoader]); // Also trigger scroll when loader visibility changes

  useEffect(() => {
    // Initial load for current session if messages are empty and not already loading something else
    if (sessionId && currentView === 'conversation' && messages.length === 0 && !initialLoadAttemptedForSession.current[sessionId] && !loading) {
      // console.log(`App.js useEffect initial load: Attempting for session: ${sessionId}`);
      initialLoadAttemptedForSession.current[sessionId] = true;
      loadSessionMessages(sessionId, false); 
    }
  }, [sessionId, currentView, messages.length, loading]);

  const fetchSessionList = async () => {
    // This function should NOT set the main 'loading' or 'showDelayedLoader' state.
    // If HistoryView needs its own loader, it manages it internally.
    // console.log("Frontend: fetchSessionList called");
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setSessionHistoryList(data.sessions || []);
    } catch (error) {
      console.error('Error fetching session list:', error);
      setSessionHistoryList([]);
    }
  };

  const handleSendMessage = async (content) => {
    if (!content.trim() || loading) return;
    const userMessage = { id: uuidv4(), content, isUser: true, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true); // START main loading state for bot response
    setInputMessage('');
  
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, session_id: sessionId }),
      });
      if (!response.ok) { 
        const errorData = await response.json().catch(() => ({ error: "Network error or invalid JSON." }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      const data = await response.json();
      const botMessage = {
        id: uuidv4(), content: data.response, isUser: false, timestamp: Date.now(),
        metadata: { processing_time: data.processing_time || 'N/A', referenced_articles: data.metadata?.referenced_articles || [] }
      };
      setMessages(prev => [...prev, botMessage]);
      if (data.session_id && data.session_id !== sessionId) {
          setSessionId(data.session_id);
      }
    } catch (error) {
        console.error('Error sending message:', error);
        const errorMsg = { id: uuidv4(), content: `Erreur: ${error.message}`, isUser: false, timestamp: Date.now(), metadata: { error: true } };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false); // END main loading state
    }
  };
  
  const handleNewConversation = async () => {
    // This function should be quick and NOT trigger the main 'loading' or 'showDelayedLoader'.
    // console.log("Frontend: handleNewConversation called");
    try {
      const response = await fetch(`${API_BASE_URL}/api/new-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      initialLoadAttemptedForSession.current = {}; 
      initialLoadAttemptedForSession.current[data.session_id] = true; // Mark as "attempted" to avoid immediate re-load if empty
      setSessionId(data.session_id); 
      setMessages([]); 
      setInputMessage(''); 
      setCurrentView('conversation'); 
    } catch (error) {
      console.error('Error creating new session:', error);
    } 
    // console.log("Frontend: handleNewConversation finished.");
  };
  
  const loadSessionMessages = async (selectedSessionId, switchToConversationView = true) => {
    if (!selectedSessionId) return;
    // console.log(`Frontend: loadSessionMessages called for ${selectedSessionId}. switchToView: ${switchToConversationView}`);
    setLoading(true); // YES - this fetches data, set main loading state
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/${selectedSessionId}`);
      if (!response.ok) { 
          if(response.status === 404) { setMessages([]); } 
          else { throw new Error(`HTTP error! status: ${response.status}`); }
      } else {
        const data = await response.json();
        if (data.error) { setMessages([]); } 
        else {
            const convertedMessages = (data.history || []).map(msg => ({ 
              id: uuidv4(), content: msg.content, isUser: msg.type === 'user', 
              timestamp: new Date(msg.timestamp).getTime(), metadata: msg.metadata || {} 
            }));
            setMessages(convertedMessages);
        }
      }
      initialLoadAttemptedForSession.current = {};
      initialLoadAttemptedForSession.current[selectedSessionId] = true;
      setSessionId(selectedSessionId); 
      if (switchToConversationView) {
        setCurrentView('conversation');
      }
    } catch (error) { 
        console.error('Error loading session messages:', error); setMessages([]); 
    } finally {
      setLoading(false); // END main loading state
      // console.log(`Frontend: loadSessionMessages finished for ${selectedSessionId}, loading set to false.`);
    }
  };

  const handleLogout = () => {
    // This function should be quick and NOT trigger the main 'loading' or 'showDelayedLoader'.
    // console.log("Frontend: handleLogout called");
    localStorage.removeItem('qanouniChatSessionId');
    const newSessionForLogout = uuidv4();
    initialLoadAttemptedForSession.current = {};
    setSessionId(newSessionForLogout);
    setMessages([]);
    setInputMessage('');
    setCurrentView('conversation');
  };

  const handleInputChange = (e) => setInputMessage(e.target.value);
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim()) { e.preventDefault(); handleSendMessage(inputMessage); }};
  const handleSubmitClick = () => { if (inputMessage.trim()) { handleSendMessage(inputMessage); }};
  
  const renderMainContent = () => {
    switch (currentView) {
      case 'history':
        return <HistoryView sessions={sessionHistoryList} onSelectSession={loadSessionMessages} />;
      case 'penalcode': return <PenalCodeView />;
      case 'help': return <HelpView />;
      case 'settings': return <SettingsView />;
      default: // 'conversation' view
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatContainerRef}>
              <AnimatePresence>
                {messages.length === 0 && !showDelayedLoader ? ( // Show landing if no messages AND delayed loader is not active
                  <motion.div
                    key="landing"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}
                    className="h-full flex items-center justify-center"
                  >
                    <LandingPage 
                        setInputMessage={setInputMessage} 
                        onExampleQueryClick={(query) => { setInputMessage(query); handleSendMessage(query);}} 
                    />
                  </motion.div>
                ) : (
                  <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {messages.map((msg) => ( <MessageBubble key={msg.id} message={msg} /> ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Render TypingLoader based on showDelayedLoader state */}
              {showDelayedLoader && (
                <div className={`w-full flex ${messages.length === 0 ? 'items-center justify-center h-full' : 'justify-start pl-2 py-2'}`}>
                  <TypingLoader />
                </div>
              )}
            </div>

            {/* INPUT BAR - Use your previously working button className structure here */}
            <div className="bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <textarea
                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight) + 'px'; }}}
                  onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = (e.target.scrollHeight) + 'px';}}
                  rows={1}
                  className="flex-1 resize-none p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-full text-sm bg-gray-50 dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow shadow-sm"
                  placeholder="Posez votre question juridique ici..."
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={loading} // Disable input based on the original 'loading' state
                  style={{ maxHeight: '120px', overflowY: 'auto' }} 
                />
                {/* !!! IMPORTANT: Use the exact button className and structure that was working for your button's functionality !!! */}
                <button
                  type="submit"
                  onClick={handleSubmitClick}
                  disabled={!inputMessage.trim() || loading} // Disable button based on original 'loading'
                  className={`p-3 rounded-full text-white transition-all duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                    (inputMessage.trim() && !loading) // Condition based on original 'loading'
                      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      : "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                  }`}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <SettingsProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Sidebar 
            currentView={currentView} 
            setCurrentView={(view) => { 
              // console.log(`Sidebar: setCurrentView to ${view}. Current loading: ${loading}, showDelayedLoader: ${showDelayedLoader}`);
              // It's generally safe to turn off loaders when view changes, as the new view might have its own loading logic or none.
              if (loading) setLoading(false); // This will also trigger setShowDelayedLoader(false) via useEffect
              setCurrentView(view);
            }} 
            handleLogout={handleLogout} 
            handleNewConversation={handleNewConversation} 
        />
        <main className="flex-1 overflow-hidden">{renderMainContent()}</main>
      </div>
    </SettingsProvider>
  );
}

export default App;