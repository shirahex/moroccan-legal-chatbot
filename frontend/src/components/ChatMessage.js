// Add this to your ChatMessage.js component

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

// Enhanced message component with collapsible sections
const ChatMessage = ({ message }) => {
  const [expandedSections, setExpandedSections] = useState({});
  
  // Parse message content to identify legal articles
  useEffect(() => {
    if (!message.isUser && message.content) {
      // Process message to identify article references 
      processMessageContent();
    }
  }, [message]);
  
  const processMessageContent = () => {
    // This would process the content to find legal article references
    // and structure them for collapsible display
  };
  
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Render legal articles as clickable references
  const renderArticleReference = (articleNum) => {
    return (
      <span 
        className="article-reference"
        onClick={() => toggleSection(`article-${articleNum}`)}
      >
        <BookOpen size={14} style={{ marginRight: '4px' }} />
        Article {articleNum}
      </span>
    );
  };
  
  // Add tooltip definitions to legal terms
  const renderLegalTerms = (content) => {
    // Dictionary of legal terms with definitions
    const legalTerms = {
      'légitime défense': 'Situation où une personne est autorisée à utiliser la force pour protéger sa vie ou ses biens',
      'tentative': 'Commencement d\'exécution d\'un crime qui n\'a été suspendu que par des circonstances indépendantes de la volonté de son auteur',
      // Add more terms as needed
    };
    
    // Replace legal terms with span elements containing tooltips
    let processedContent = content;
    Object.keys(legalTerms).forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      processedContent = processedContent.replace(regex, 
        `<span class="legal-term" data-definition="${legalTerms[term]}">${term}</span>`
      );
    });
    
    return processedContent;
  };
  
  return (
    <div className={`message ${message.isUser ? 'user-message' : 'bot-message'}`}>
      {/* Render message content with enhanced formatting */}
      <div dangerouslySetInnerHTML={{ 
        __html: message.isUser ? message.content : renderLegalTerms(message.content)
      }} />
      
      {/* Show collapsible sections for articles if present */}
      {message.metadata?.referenced_articles?.map(article => (
        <div 
          key={`article-${article}`} 
          className={`collapsible-section ${expandedSections[`article-${article}`] ? 'open' : ''}`}
        >
          <div 
            className="collapsible-header"
            onClick={() => toggleSection(`article-${article}`)}
          >
            <span>Article {article} du Code pénal marocain</span>
            {expandedSections[`article-${article}`] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          <div className="collapsible-content">
            {/* Article content would be fetched and displayed here */}
            {/* This is placeholder text */}
            <p>Contenu de l'article {article}...</p>
          </div>
        </div>
      ))}
      
      <div className="message-time">
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
      
      {/* Enhanced processing info */}
      {!message.isUser && message.metadata && (
        <div className="processing-info">
          {/* Processing info content */}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;