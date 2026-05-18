// src/components/HelpView.js
import { useState } from "react";
import { Book, MessageSquare, Info, ChevronDown, ChevronUp, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqSections = [
  {
    id: "general",
    title: "Informations générales",
    icon: <Info size={18} />,
    items: [
      {
        question: "Qu'est-ce que Qanouni ?",
        answer: "Qanouni est un assistant juridique marocain conçu pour répondre à vos questions concernant le Code pénal marocain."
      },
      {
        question: "Les informations sont-elles fiables ?",
        answer: "Qanouni est mis à jour régulièrement, mais il ne remplace pas un conseil juridique officiel."
      }
    ]
  },
  {
    id: "usage",
    title: "Comment utiliser Qanouni",
    icon: <MessageSquare size={18} />,
    items: [
      {
        question: "Comment poser une question ?",
        answer: "Écrivez votre question en bas de l'écran et appuyez sur Envoyer."
      },
      {
        question: "Comment consulter l'historique ?",
        answer: "Cliquez sur 'Historique' pour voir vos conversations passées."
      }
    ]
  },
  {
    id: "features",
    title: "Fonctionnalités",
    icon: <Book size={18} />,
    items: [
      {
        question: "Puis-je exporter une conversation ?",
        answer: "Oui, utilisez le bouton 'Exporter' pour télécharger votre conversation."
      }
    ]
  }
];

export default function HelpView() {
  const [expandedSection, setExpandedSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const filterFaqItems = (items) => {
    if (!searchQuery.trim()) return items;
    return items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Centre d'aide Qanouni</h1>
        <p className="text-gray-600 dark:text-gray-400">Trouvez des réponses à vos questions sur l'utilisation de Qanouni</p>
        <div className="flex items-center gap-2 mt-4">
          <Search size={20} className="text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher dans l'aide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-6">
        {faqSections.map((section) => {
          const filteredItems = filterFaqItems(section.items);
          if (searchQuery && filteredItems.length === 0) return null;

          return (
            <div key={section.id} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
              <button
                onClick={() => toggleSection(section.id)}
                className="flex justify-between items-center w-full text-left"
              >
                <div className="flex items-center gap-3 text-lg font-semibold text-gray-800 dark:text-gray-200">
                  {section.icon}
                  {section.title}
                </div>
                {expandedSection === section.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              <AnimatePresence>
                {(expandedSection === section.id || searchQuery) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-4 mt-2"
                  >
                    {filteredItems.map((item, index) => (
                      <div key={index}>
                        <h4 className="text-md font-semibold text-blue-600 dark:text-blue-400">{item.question}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.answer}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Besoin d'une aide supplémentaire ? Contactez-nous à <span className="text-blue-600 dark:text-blue-400">support@qanouni.ma</span>
      </div>
    </div>
  );
}
