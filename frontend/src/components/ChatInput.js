import React, { useState } from 'react';
import { Send } from 'lucide-react';

const ChatInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    
    // Auto resize the textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  return (
    <form className="input-container" onSubmit={handleSubmit}>
      <textarea
        className="input-field"
        placeholder="Posez votre question juridique ici..."
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      <button type="submit" className="send-button" disabled={!message.trim()}>
        <Send size={20} />
      </button>
    </form>
  );
};

export default ChatInput;