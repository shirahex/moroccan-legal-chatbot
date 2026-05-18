// src/components/SettingsView.js
import { useContext } from "react";
import { SettingsContext } from "../contexts/SettingsContext";
import { Save, Moon, Sun, Globe, Volume2, VolumeX } from "lucide-react";

export default function SettingsView() {
  const { settings, updateSettings, saveSettings } = useContext(SettingsContext);

  const handleSettingChange = (setting, value) => {
    updateSettings(setting, value);
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white rtl:text-right">Paramètres</h1>

      {/* Language */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-200 rtl:flex-row-reverse">
          <Globe size={20} className="rtl:order-last" /> Langue
        </h2>
        <div className="flex gap-4 rtl:flex-row-reverse">
          {["fr", "ar"].map((lang) => (
            <label
              key={lang}
              className={`px-4 py-2 rounded-full cursor-pointer ${
                settings.language === lang
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <input
                type="radio"
                name="language"
                className="hidden"
                checked={settings.language === lang}
                onChange={() => handleSettingChange("language", lang)}
              />
              {lang === "fr" ? "Français" : "العربية"}
            </label>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-200 rtl:flex-row-reverse">
          {settings.theme === "dark" ? <Moon size={20} className="rtl:order-last" /> : <Sun size={20} className="rtl:order-last" />} Thème
        </h2>
        <div className="flex gap-4 rtl:flex-row-reverse">
          {["light", "dark", "system"].map((theme) => (
            <label
              key={theme}
              className={`px-4 py-2 rounded-full cursor-pointer ${
                settings.theme === theme
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <input
                type="radio"
                name="theme"
                className="hidden"
                checked={settings.theme === theme}
                onChange={() => handleSettingChange("theme", theme)}
              />
              {theme === "light" ? "Clair" : theme === "dark" ? "Sombre" : "Système"}
            </label>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-200 rtl:flex-row-reverse">
          <span className="text-xl rtl:order-last">T</span> Taille de texte
        </h2>
        <div className="flex gap-4 rtl:flex-row-reverse">
          {["small", "medium", "large"].map((size) => (
            <label
              key={size}
              className={`px-4 py-2 rounded-full cursor-pointer ${
                settings.fontSize === size
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <input
                type="radio"
                name="fontSize"
                className="hidden"
                checked={settings.fontSize === size}
                onChange={() => handleSettingChange("fontSize", size)}
              />
              {size === "small" ? (
                <span style={{ fontSize: "14px" }}>A</span>
              ) : size === "medium" ? (
                <span style={{ fontSize: "16px" }}>A</span>
              ) : (
                <span style={{ fontSize: "18px" }}>A</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 rtl:text-right">Notifications</h2>
        <label className="flex items-center justify-between cursor-pointer rtl:flex-row-reverse">
          <span className="text-gray-600 dark:text-gray-400 rtl:mr-2 rtl:ml-0">Recevoir des notifications</span>
          <input
            type="checkbox"
            className="sr-only"
            checked={settings.notifications}
            onChange={() => handleSettingChange("notifications", !settings.notifications)}
          />
          <div className="relative w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full transition rtl:order-first">
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition ${
                settings.notifications ? "translate-x-5" : ""
              } rtl:left-auto rtl:right-0.5 rtl:translate-x-0 rtl:peer-checked:translate-x-[-5px]`}
            ></div>
          </div>
        </label>
      </div>

      {/* Sound */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-200 rtl:flex-row-reverse">
          {settings.sound ? <Volume2 size={20} className="rtl:order-last" /> : <VolumeX size={20} className="rtl:order-last" />} Son
        </h2>
        <label className="flex items-center justify-between cursor-pointer rtl:flex-row-reverse">
          <span className="text-gray-600 dark:text-gray-400 rtl:mr-2 rtl:ml-0">Effets sonores</span>
          <input
            type="checkbox"
            className="sr-only"
            checked={settings.sound}
            onChange={() => handleSettingChange("sound", !settings.sound)}
          />
          <div className="relative w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full transition rtl:order-first">
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition ${
                settings.sound ? "translate-x-5" : ""
              } rtl:left-auto rtl:right-0.5 rtl:translate-x-0 rtl:peer-checked:translate-x-[-5px]`}
            ></div>
          </div>
        </label>
      </div>

      {/* Save Button */}
      <div className="text-center">
        <button
          onClick={saveSettings}
          className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition rtl:flex-row-reverse"
        >
          <Save size={18} className="rtl:order-last" /> Enregistrer les paramètres
        </button>
      </div>
    </div>
  );
}