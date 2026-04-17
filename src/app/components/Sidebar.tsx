import React from 'react';
import { Locale, t } from '@/lib/i18n';
import { Sparkles, LibraryBig, PlusCircle, Settings, ClipboardList } from 'lucide-react';

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
        <div className="sidebar-logo"><Sparkles size={18} color="#3DDC97" /></div>
        <div className="sidebar-title">StyleLibrary</div>
      </div>

      <div className="sidebar-nav">
        <button
          className={`nav-item ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => setView('library')}
        >
          <span className="nav-icon"><LibraryBig size={18} /></span>
          {L('lib_title')}
        </button>
        <button
          className={`nav-item ${currentView === 'create' ? 'active' : ''}`}
          onClick={() => setView('create')}
        >
          <span className="nav-icon"><PlusCircle size={18} /></span>
          {L('nav_new_style')}
        </button>

        <button
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => setView('settings')}
        >
          <span className="nav-icon"><Settings size={18} /></span>
          {L('nav_settings')}
        </button>
        <button
          className={`nav-item ${currentView === 'logs' ? 'active' : ''}`}
          onClick={() => setView('logs')}
        >
          <span className="nav-icon"><ClipboardList size={18} /></span>
          Logs
        </button>
      </div>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
          <button
            style={{ flex: 1, padding: '4px', background: locale === 'en' ? 'var(--surface-3)' : 'transparent', border: 'none', borderRadius: '4px', color: locale === 'en' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setLocale('en')}
          >
            EN
          </button>
          <button
            style={{ flex: 1, padding: '4px', background: locale === 'vi' ? 'var(--surface-3)' : 'transparent', border: 'none', borderRadius: '4px', color: locale === 'vi' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setLocale('vi')}
          >
            VI
          </button>
        </div>
      </div>
    </div>
  );
}
