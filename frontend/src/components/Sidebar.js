// src/components/Sidebar.js
import { useContext } from "react";
import { SettingsContext } from "../contexts/SettingsContext";
import { Moon, Sun, History, HelpCircle, BookOpenText, MessageCircle, Settings, LogOut } from "lucide-react";
import logo from "../QANOUNI.png";

export default function Sidebar({ currentView, setCurrentView, handleLogout, handleNewConversation }) {
  const { settings, updateSettings } = useContext(SettingsContext);

  const menuItems = [
    { label: "Conversation", icon: MessageCircle, view: "conversation" },
    { label: "Historique", icon: History, view: "history" },
    { label: "Code Pénal", icon: BookOpenText, view: "penalcode" },
    { label: "Aide", icon: HelpCircle, view: "help" },
  ];

  const settingsItems = [
    { label: "Paramètres", icon: Settings, view: "settings" },
    { label: "Déconnexion", icon: LogOut, action: handleLogout },
  ];

  const handleToggleTheme = () => {
    const newTheme = settings.theme === "dark" ? "light" : "dark";
    updateSettings("theme", newTheme);
  };

  return (
    <aside className="flex flex-col justify-between h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
      <div>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src={logo} 
            alt="Qanouni" 
            className="h-[160px] w-[160px] object-contain"
          />
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-2 mb-6">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentView(item.view)}
              className={`flex items-center w-full px-3 py-2 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800 ${
                currentView === item.view ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
            >
              <item.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Chats header with + button */}
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Chats</h2>
          <button
            onClick={handleNewConversation}
            className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
            title="Nouveau chat"
          >
            +
          </button>
        </div>
      </div>

      {/* Settings section */}
      <div className="space-y-2">
        {/* Toggle Dark/Light Mode */}
        <button
          onClick={handleToggleTheme}
          className="flex items-center w-full px-3 py-2 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {settings.theme === "dark" ? (
            <Sun className="h-5 w-5 text-yellow-500" />
          ) : (
            <Moon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
          <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            {settings.theme === "dark" ? "Mode Jour" : "Mode Nuit"}
          </span>
        </button>

        {/* Settings and Logout */}
        {settingsItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => item.action ? item.action() : setCurrentView(item.view)}
            className="flex items-center w-full px-3 py-2 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <item.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
