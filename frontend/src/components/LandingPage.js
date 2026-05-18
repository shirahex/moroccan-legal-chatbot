// src/components/LandingPage.js
import { motion } from "framer-motion";

const exampleQueries = [
  "Quelles sont les peines pour vol au Maroc?",
  "Comment est définie la légitime défense?",
  "Quels sont mes droits si je suis arrêté?",
];

export default function LandingPage({ setInputMessage }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-4">
      <motion.h1 
        className="text-4xl font-bold text-gray-800 dark:text-white"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Bienvenue sur <span className="text-blue-600">Qanouni</span>
      </motion.h1>

      <motion.p
        className="text-gray-600 dark:text-gray-400 max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        Votre assistant juridique pour explorer facilement le Code Pénal Marocain.
      </motion.p>

      <motion.div
        className="flex flex-col items-center gap-3 mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        {exampleQueries.map((query, idx) => (
          <button
            key={idx}
            onClick={() => setInputMessage(query)}
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition px-6 py-3 rounded-full shadow-md text-gray-700 dark:text-gray-300 text-sm font-medium"
          >
            {query}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
