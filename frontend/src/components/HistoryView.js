// src/components/HistoryView.js
import { motion } from "framer-motion";

export default function HistoryView({ sessions, onSelectSession }) {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Historique des conversations</h1>

      {sessions.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
          Aucune session trouvée pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session, idx) => {
            // const firstUserMessage = session.history?.find(m => m.type === 'user'); // NO LONGER NEEDED HERE
            // const title = firstUserMessage ? firstUserMessage.content.slice(0, 50) + '...' : `Session ${idx + 1}`; // NO LONGER NEEDED HERE

            return (
              <motion.div
                key={session.session_id || idx} // Prefer session.session_id as key
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectSession(session.session_id)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate mb-2">
                  {session.title || `Conversation ${new Date(session.created_at || Date.now()).toLocaleTimeString()}`} {/* Use session.title from props */}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {session.created_at 
                    ? new Date(session.created_at).toLocaleDateString() + " " + new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : "Date inconnue"}
                </p>
                {/* You could also display session.message_count here if you want */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {session.message_count} message(s)
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}