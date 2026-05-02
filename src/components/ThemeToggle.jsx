import React from 'react';
import { useTheme } from '../hooks/useTheme.jsx';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button className={`theme-toggle ${isDark ? 'on' : ''}`} onClick={toggle} title="Toggle theme">
      <div className="theme-toggle-thumb">
        {isDark ? '🌙' : '☀️'}
      </div>
    </button>
  );
}
