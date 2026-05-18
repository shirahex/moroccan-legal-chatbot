// src/contexts/SettingsContext.js
import { createContext, useState, useEffect } from 'react';

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    language: 'fr',
    theme: 'light',
    fontSize: 'medium',
    notifications: true,
    sound: false,
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('qanouni_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      applySettings(parsed);
    } else {
      applySettings(settings);
    }
  }, []);

  const updateSettings = (setting, value) => {
    const updated = { ...settings, [setting]: value };
    setSettings(updated);
    applySettings(updated);
  };

  const applySettings = (currentSettings) => {
    // Theme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let activeTheme = currentSettings.theme;
    if (activeTheme === 'system') {
      activeTheme = prefersDark ? 'dark' : 'light';
    }
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    

    // Font Size
    const fontSizeClasses = {
      small: 'font-size-small',
      medium: 'font-size-medium',
      large: 'font-size-large',
    };
    Object.values(fontSizeClasses).forEach(cls => document.body.classList.remove(cls));
    document.body.classList.add(fontSizeClasses[currentSettings.fontSize]);

    // Language
    document.documentElement.setAttribute('lang', currentSettings.language);
    if (currentSettings.language === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  };

  const saveSettings = () => {
    localStorage.setItem('qanouni_settings', JSON.stringify(settings));
    if (settings.language === 'fr') {
      alert('Paramètres enregistrés avec succès!');
    } else {
      alert('تم حفظ الإعدادات بنجاح!');
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
