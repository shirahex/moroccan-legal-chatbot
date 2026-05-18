// src/components/TypingLoader.js
import React from "react";
import { motion } from "framer-motion";

export default function TypingLoader() {
  return (
    <div className="flex justify-start px-4">
      <div className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-3xl shadow-md max-w-fit">
        <motion.span
          className="w-2 h-2 bg-gray-500 rounded-full"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
        <motion.span
          className="w-2 h-2 bg-gray-500 rounded-full"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
        />
        <motion.span
          className="w-2 h-2 bg-gray-500 rounded-full"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
        />
      </div>
    </div>
  );
}
