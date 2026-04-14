import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [settings, setSettings] = useLocalStorage(STORAGE_KEYS.SETTINGS, {
    theme: 'dark',
    currency: 'USD',
    forceMarketOpen: false
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const toggleTheme = () => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  const setCurrency = (currency) => {
    setSettings(prev => ({ ...prev, currency }));
  };

  const setForceMarketOpen = (forceMarketOpen) => {
    setSettings(prev => ({ ...prev, forceMarketOpen }));
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: settings.theme, 
      currency: settings.currency,
      forceMarketOpen: settings.forceMarketOpen,
      toggleTheme,
      setCurrency,
      setForceMarketOpen
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
