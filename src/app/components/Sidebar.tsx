import React from 'react';
import { Locale, t } from '@/lib/i18n';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  locale: Locale;
  setLocale: (loc: Locale) => void;
}

export default function Sidebar({ currentView, setView, locale, setLocale }: SidebarProps) {
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  return (
    <div className="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">✨</div>
        <div className="sidebar-title">StyleLibrary</div>
      </div>
      
      <div className="sidebar-nav">
        <button 
          className={`nav-item ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => setView('library')}
        >
          <span className="nav-icon">📚</span>
          {L('lib_title')}
        </button>
        <button 
          className={`nav-item ${currentView === 'create' ? 'active' : ''}`}
          onClick={() => setView('create')}
        >
          <span className="nav-icon">➕</span>
          {L('nav_new_style')}
        </button>
        <button 
          className={`nav-item ${currentView === 'studio' ? 'active' : ''}`}
          onClick={() => setView('studio')}
        >
          <span className="nav-icon">🎨</span>
          Image Studio
        </button>
        <button 
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setView('settings')}
        >
          <span className="nav-icon">⚙️</span>
          {L('nav_settings')}
        </button>
        <button 
          className={`nav-item ${currentView === 'logs' ? 'active' : ''}`}
          onClick={() => setView('logs')}
        >
          <span className="nav-icon">📋</span>
          Logs
        </button>
      </div>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
          <button 
            style={{ flex: 1, padding: '4px', background: locale === 'en' ? 'var(--bg-glass-hover)' : 'transparent', border: 'none', borderRadius: '4px', color: locale === 'en' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setLocale('en')}
          >
            EN
          </button>
          <button 
            style={{ flex: 1, padding: '4px', background: locale === 'vi' ? 'var(--bg-glass-hover)' : 'transparent', border: 'none', borderRadius: '4px', color: locale === 'vi' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setLocale('vi')}
          >
            VI
          </button>
        </div>
      </div>
    </div>
  );
}
