import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

const ThemeContext = createContext(null);

const PRESET_THEMES = [
  { name: '薰衣草紫', color: '#6366f1' },
  { name: '樱花粉', color: '#ec4899' },
  { name: '天空蓝', color: '#3b82f6' },
  { name: '薄荷绿', color: '#10b981' },
  { name: '日落橙', color: '#f97316' },
  { name: '玫瑰红', color: '#e11d48' },
  { name: '鸢尾蓝', color: '#8b5cf6' },
  { name: '青碧', color: '#06b6d4' },
];

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [themeColor, setThemeColor] = useState('#6366f1');

  useEffect(() => {
    if (user?.theme_color) {
      setThemeColor(user.theme_color);
    }
  }, [user?.theme_color]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', themeColor);
    root.style.setProperty('--color-primary-light', themeColor + 'cc');
    root.style.setProperty('--color-primary-dark', themeColor + 'dd');
  }, [themeColor]);

  const changeColor = useCallback(
    async (color) => {
      setThemeColor(color);
      if (user) {
        try {
          const formData = new FormData();
          formData.append('theme_color', color);
          const updated = await api.updateProfile(formData);
          updateUser(updated);
        } catch (e) {
          console.error('保存主题失败:', e);
        }
      }
    },
    [user, updateUser]
  );

  return (
    <ThemeContext.Provider value={{ themeColor, changeColor, presetThemes: PRESET_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
