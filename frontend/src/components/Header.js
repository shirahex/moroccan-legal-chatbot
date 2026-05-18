import React from 'react';
import { Book, Download, RefreshCw } from 'lucide-react';

const Header = ({ onExport, onNewConversation }) => {
  return (
    <header className="header">
      <div className="header-logo">
        <div className="logo">
          <Book color="#e9c46a" size={32} />
        </div>
        <div>
          <h1>Assistant Juridique Marocain</h1>
          <div className="header-subtitle">
            Votre guide pour comprendre le Code pénal marocain
          </div>
        </div>
      </div>
      <div className="header-actions">
        <button className="button" onClick={onExport}>
          <Download size={16} style={{ marginRight: '6px' }} />
          Exporter la conversation
        </button>
        <button className="button" onClick={onNewConversation}>
          <RefreshCw size={16} style={{ marginRight: '6px' }} />
          Nouvelle conversation
        </button>
      </div>
    </header>
  );
};

export default Header;