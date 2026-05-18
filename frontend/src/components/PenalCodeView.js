// src/components/PenalCodeView.js
import { useState, useEffect } from "react";
import { Search, BookOpen, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// 📚 Your Penal Code Structure
const penalCodeStructure = [
  {
    id: "livre1",
    title: "PREFACE",
    chapters: [
      {
        id: "l1ch1",
        title: "Chapitre dispositions preliminaires",
        articles: [
          { id: "art1", number: "1", content: "La loi pénale détermine et constitue en infractions les faits de l'homme qui, à raison du trouble social qu'ils provoquent, justifient l'application à leur auteur de peines ou de mesures de sûreté." },
          { id: "art2", number: "2", content: "Nul ne peut être condamné pour un fait qui, selon la loi en vigueur au temps où il a été commis, ne constituait pas une infraction." },
          { id: "art3", number: "3", content: "Nul ne peut être condamné pour un fait qui n'est pas expressément prévu comme infraction par la loi, ni puni de peines que la loi n'a pas édictées." },
          { id: "art4", number: "4", content: "Nul ne peut être condamné pour un fait qui, selon la loi en vigueur au temps où il a été commis, ne constituait pas une infraction. " },
          { id: "art5", number: "5", content: "Nul ne peut être condamné pour un fait qui, par l'effet d'une loi postérieure à sa commission, ne constitue plus une infraction; si une condamnation a été prononcée, il est mis fin à l'exécution des peines tant principales qu'accessoires. " },
          { id: "art6", number: "6", content: "Lorsque plusieurs lois ont été en vigueur entre le moment où l'infraction a été commise et le jugement définitif, la loi, dont les dispositions sont les moins rigoureuses, doit recevoir application." },
          { id: "art7", number: "7", content: "Les dispositions des articles 5 et 6 ci-dessus ne concernent pas les lois temporaires. Celles-ci, même après qu'elles aient cessé d'être en  vigueur, continuent à régir les infractions commises pendant la durée de leur application." },
          { id: "art8", number: "8", content: "Nulle mesure de sûreté ne peut être prononcée que dans les cas et conditions prévus par la loi. Les mesures de sûreté applicables sont celles édictées par la loi en vigueur au moment du jugement de l'infraction." },
          { id: "art9", number: "9", content: "L'exécution d'une mesure de sûreté cesse lorsque le fait qui l'avait motivée n'est plus constitutif d'infraction par l'effet d'une loi postérieure ou lorsque cette mesure de sûreté est elle-même supprimée par la loi." },
          { id: "art10", number: "10", content: "Sont soumis à la loi pénale marocaine, tous ceux qui, nationaux, étrangers ou apatrides, se trouvent sur le territoire du Royaume, sauf les exceptions établies par le droit public interne ou le droit international." },
          { id: "art11", number: "11", content: "Sont considérés comme faisant partie du territoire, les navires ou les aéronefs marocains quel que soit l'endroit où ils se trouvent, sauf s'ils sont soumis, en vertu du droit international, à une loi étrangère." },
          { id: "art12", number: "12", content: "La loi pénale marocaine s'applique aux infractions commises hors du Royaume lorsqu'elles relèvent de la compétence des juridictions répressives marocaines en vertu des dispositions des articles 751 à 756 du code de procédure pénale." },
          
        ]
      },
      {
        id: "l1ch2",
        title: "Chapitre II: De l'application de la loi pénale",
        articles: [
          { id: "artii1", number: "3", content: "Nul ne peut exciper de son ignorance de la loi pénale." },
          { id: "artii2", number: "4", content: "Sont soumis à la loi pénale marocaine, tous ceux, nationaux, étrangers ou apatrides qui, sur le territoire du Royaume, ont commis des infractions." }
        ]
      }
    ]
  },
  {
    id: "livre2",
    title: "LIVRE PREMIER DES PEINES ET DES MESURES DE SURETE",
    chapters: [
      {
        id: "l1ch11",
        title: "Chapitre dispositions preliminaires",
        articles: [
          { id: "artii11", number: "1", content: "La loi pénale détermine et constitue en infractions les faits de l'homme qui, à raison du trouble social qu'ils provoquent, justifient l'application à leur auteur de peines ou de mesures de sûreté." },
          { id: "artii22", number: "2", content: "Nul ne peut être condamné pour un fait qui, selon la loi en vigueur au temps où il a été commis, ne constituait pas une infraction." },
          { id: "artii33", number: "3", content: "Nul ne peut être condamné pour un fait qui n'est pas expressément prévu comme infraction par la loi, ni puni de peines que la loi n'a pas édictées." },
          { id: "artii44", number: "4", content: "Nul ne peut être condamné pour un fait qui, selon la loi en vigueur au temps où il a été commis, ne constituait pas une infraction. " },
          { id: "artii55", number: "5", content: "Nul ne peut être condamné pour un fait qui, par l'effet d'une loi postérieure à sa commission, ne constitue plus une infraction; si une condamnation a été prononcée, il est mis fin à l'exécution des peines tant principales qu'accessoires. " },
          { id: "artii66", number: "6", content: "Lorsque plusieurs lois ont été en vigueur entre le moment où l'infraction a été commise et le jugement définitif, la loi, dont les dispositions sont les moins rigoureuses, doit recevoir application." },
          { id: "artii77", number: "7", content: "Les dispositions des articles 5 et 6 ci-dessus ne concernent pas les lois temporaires. Celles-ci, même après qu'elles aient cessé d'être en  vigueur, continuent à régir les infractions commises pendant la durée de leur application." },
          { id: "artii88", number: "8", content: "Nulle mesure de sûreté ne peut être prononcée que dans les cas et conditions prévus par la loi. Les mesures de sûreté applicables sont celles édictées par la loi en vigueur au moment du jugement de l'infraction." },
          { id: "artii99", number: "9", content: "L'exécution d'une mesure de sûreté cesse lorsque le fait qui l'avait motivée n'est plus constitutif d'infraction par l'effet d'une loi postérieure ou lorsque cette mesure de sûreté est elle-même supprimée par la loi." },
          { id: "artii1010", number: "10", content: "Sont soumis à la loi pénale marocaine, tous ceux qui, nationaux, étrangers ou apatrides, se trouvent sur le territoire du Royaume, sauf les exceptions établies par le droit public interne ou le droit international." },
          { id: "artii1111", number: "11", content: "Sont considérés comme faisant partie du territoire, les navires ou les aéronefs marocains quel que soit l'endroit où ils se trouvent, sauf s'ils sont soumis, en vertu du droit international, à une loi étrangère." },
          { id: "artii1212", number: "12", content: "La loi pénale marocaine s'applique aux infractions commises hors du Royaume lorsqu'elles relèvent de la compétence des juridictions répressives marocaines en vertu des dispositions des articles 751 à 756 du code de procédure pénale." },
          
        ]
      },
      {
        id: "l1ch22",
        title: "Chapitre II: De l'application de la loi pénale",
        articles: [
          { id: "artiii1", number: "3", content: "Nul ne peut exciper de son ignorance de la loi pénale." },
          { id: "artiii2", number: "4", content: "Sont soumis à la loi pénale marocaine, tous ceux, nationaux, étrangers ou apatrides qui, sur le territoire du Royaume, ont commis des infractions." }
        ]
      }
    ]
  },
  // Add your other books and chapters here
];

export default function PenalCodeView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBooks, setExpandedBooks] = useState({});
  const [expandedChapters, setExpandedChapters] = useState({});
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const initialBooks = {};
    penalCodeStructure.forEach(book => {
      initialBooks[book.id] = false;
    });
    setExpandedBooks(initialBooks);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    const lower = searchTerm.toLowerCase();
    const results = [];

    penalCodeStructure.forEach(book => {
      book.chapters.forEach(chapter => {
        chapter.articles.forEach(article => {
          if (
            article.number.includes(lower) ||
            article.content.toLowerCase().includes(lower)
          ) {
            results.push({
              articleId: article.id,
              articleNumber: article.number,
              preview: article.content.slice(0, 100) + (article.content.length > 100 ? "..." : "")
            });
          }
        });
      });
    });

    setSearchResults(results);
  }, [searchTerm]);

  const toggleBook = (id) => {
    setExpandedBooks(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleChapter = (id) => {
    setExpandedChapters(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const viewArticle = (id) => {
    let found = null;
    penalCodeStructure.forEach(book => {
      book.chapters.forEach(chap => {
        const art = chap.articles.find(a => a.id === id);
        if (art) {
          found = { ...art, bookTitle: book.title, chapterTitle: chap.title };
        }
      });
    });
    setSelectedArticle(found);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar (TOC) */}
      <div className="w-1/3 bg-gray-100 dark:bg-gray-900 p-4 overflow-y-auto space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="text-gray-500 dark:text-gray-400" size={20} />
          <input
            type="text"
            className="w-full bg-white dark:bg-gray-800 p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {searchTerm && searchResults.length > 0 ? (
          <div className="space-y-3">
            {searchResults.map(res => (
              <div
                key={res.articleId}
                onClick={() => viewArticle(res.articleId)}
                className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition"
              >
                <div className="font-bold text-blue-600 dark:text-blue-400">
                  Article {res.articleNumber}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  {res.preview}
                </div>
              </div>
            ))}
          </div>
        ) : searchTerm && searchResults.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Aucun résultat pour "{searchTerm}"
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <BookOpen /> Table des matières
            </h2>

            {penalCodeStructure.map(book => (
              <div key={book.id} className="space-y-2">
                <button
                  onClick={() => toggleBook(book.id)}
                  className="flex justify-between items-center w-full p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                  <span className="text-sm font-semibold">{book.title}</span>
                  {expandedBooks[book.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                <AnimatePresence>
                  {expandedBooks[book.id] && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden pl-4 space-y-1"
                    >
                      {book.chapters.map(chap => (
                        <div key={chap.id}>
                          <button
                            onClick={() => toggleChapter(chap.id)}
                            className="flex justify-between items-center w-full p-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                          >
                            {chap.title}
                            {expandedChapters[chap.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          <AnimatePresence>
                            {expandedChapters[chap.id] && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden pl-4 space-y-1"
                              >
                                {chap.articles.map(article => (
                                  <div
                                    key={article.id}
                                    onClick={() => viewArticle(article.id)}
                                    className={`flex items-center gap-2 p-2 text-sm rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                                      selectedArticle?.id === article.id ? "bg-blue-100 dark:bg-blue-800" : ""
                                    }`}
                                  >
                                    <FileText size={14} />
                                    <span>Article {article.number}</span>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main content (Article) */}
      <div className="flex-1 p-8 overflow-y-auto">
        {selectedArticle ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Article {selectedArticle.number}</h1>
            <h2 className="text-md font-semibold text-gray-600 dark:text-gray-300">{selectedArticle.bookTitle}</h2>
            <h3 className="text-sm text-gray-500 dark:text-gray-400">{selectedArticle.chapterTitle}</h3>
            <p className="mt-4 text-gray-700 dark:text-gray-200">{selectedArticle.content}</p>
          </div>
        ) : (
          <div className="text-center text-gray-400 mt-20">
            <FileText size={48} className="mx-auto mb-4 opacity-30" />
            <p>Sélectionnez un article pour afficher son contenu</p>
          </div>
        )}
      </div>
    </div>
  );
}
