import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ dark: false, toggleDark: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  /* ── On mount: read persisted setting ── */
  useEffect(() => {
    const init = async () => {
      try {
        const settings = await window.db.settings.getAppSettings();
        const saved = settings?.find?.(s => s.key === 'dark_mode');
        const isDark = saved?.value === 'true';
        setDark(isDark);
        applyClass(isDark);
      } catch {
        // fallback: check localStorage
        const local = localStorage.getItem('dark_mode') === 'true';
        setDark(local);
        applyClass(local);
      }
    };
    init();
  }, []);

  function applyClass(isDark) {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  async function toggleDark() {
    const next = !dark;
    setDark(next);
    applyClass(next);
    // Persist to DB
    try {
      await window.db.settings.updateAppSetting('dark_mode', String(next));
    } catch {
      // fallback to localStorage
      localStorage.setItem('dark_mode', String(next));
    }
  }

  return (
    <ThemeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
