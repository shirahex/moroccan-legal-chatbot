// src/components/MessageBubble.js
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import React from "react";

function highlightArticles(text) {
  const articleRegex = /(Article\s\d+)/gi;
  const parts = text.split(articleRegex);

  return parts.map((part, index) => {
    if (part.match(articleRegex)) {
      return (
        <span
          key={index}
          className="inline-block bg-blue-100 text-blue-700 font-semibold px-2 py-1 rounded-lg mx-1 text-sm"
        >
          {part}
        </span>
      );
    } else {
      return <span key={index}>{part}</span>;
    }
  });
}

export default function MessageBubble({ message }) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isUser = message.isUser;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} px-4 py-2`}
    >
      <div
        className={`relative max-w-2xl px-6 py-4 rounded-3xl shadow-lg ${
          isUser
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm"
            : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-bl-sm"
        }`}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "1rem",
          lineHeight: "1.75",
          whiteSpace: "pre-line",
        }}
      >
        {/* Main message */}
        <div className="text-base font-medium">
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <span>{highlightArticles(message.content)}</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-xs text-white/80">
          <span className="opacity-80">{formattedTime}</span>

          {!isUser && message.metadata && (
            <div className="flex items-center gap-3">
              {message.metadata.processing_time && (
                <div className="flex items-center gap-1">
                  <Clock size={14} /> {parseFloat(message.metadata.processing_time).toFixed(2)}s
                </div>
              )}
              {message.metadata.referenced_articles?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {message.metadata.referenced_articles.map((art, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 rounded-full text-[10px] font-semibold"
                    >
                      {art}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
