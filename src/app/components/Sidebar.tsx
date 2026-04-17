import React from 'react';
import { Locale, t } from '@/lib/i18n';
import { Layers, LibraryBig, ClipboardList, Settings } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  locale: Locale;
  setLocale: (loc: Locale) => void;
}

export default function Sidebar({ currentView, setView, locale, setLocale }: SidebarProps) {
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  return (
    <div
      className="app-topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '48px',
        padding: '0 16px',
        background: 'rgba(15, 15, 16, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        zIndex: 100,
      }}
    >
      {/* ── Left Side (Logo & Nav) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setView('library')}>
          <div style={{ background: 'var(--accent)', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={14} color="#FFF" />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>StyleLibrary</span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className={`top-nav-item ${currentView === 'library' || currentView === 'create' || currentView === 'edit' ? 'active' : ''}`}
            onClick={() => setView('library')}
          >
            <LibraryBig size={14} />
            {L('lib_title')}
          </button>

          <button
            className={`top-nav-item ${currentView === 'logs' ? 'active' : ''}`}
            onClick={() => setView('logs')}
          >
            <ClipboardList size={14} />
            History
          </button>

          <button
            className={`top-nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setView('settings')}
          >
            <Settings size={14} />
            {L('nav_settings')}
          </button>
        </nav>
      </div>

      {/* ── Right Side (Locale toggle only) ── */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--surface-3)', padding: '2px', borderRadius: '6px' }}>
          <button
            style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600, background: locale === 'en' ? 'var(--surface-1)' : 'transparent', border: 'none', borderRadius: '4px', color: locale === 'en' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setLocale('en')}
          >
            EN
          </button>
          <button
            style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600, background: locale === 'vi' ? 'var(--surface-1)' : 'transparent', border: 'none', borderRadius: '4px', color: locale === 'vi' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setLocale('vi')}
          >
            VI
          </button>
        </div>
      </div>
    </div>
  );
}
