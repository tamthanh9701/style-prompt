import React from 'react';
import { Locale, t } from '@/lib/i18n';
import { Layers, LibraryBig, Settings, ClipboardList, PenTool } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  locale: Locale;
  setLocale: (loc: Locale) => void;
}

export default function Sidebar({ currentView, setView, locale, setLocale }: SidebarProps) {
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  return (
    <div className="app-topbar" style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 16px', background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.06)', zIndex: 100 }}>
      {/* ── Left Side (Logo & Nav) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setView('library')}>
          <div style={{ background: '#000', borderRadius: '6px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={14} color="#FFF" />
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111' }}>StyleLibrary</span>
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
            className={`top-nav-item ${currentView === 'generate' ? 'active' : ''}`}
            // If they are not in a style, clicking work/studio goes back to library
            onClick={() => setView('library')}
          >
            <PenTool size={14} />
            Workflows
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

      {/* ── Center Area (File Name context, optional) ── */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        {/* Placeholder for project name or currently editing style name */}
        <div style={{ padding: '4px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500, color: '#333' }}>
          Untitled v
        </div>
      </div>

      {/* ── Right Side (User & Locale) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', padding: '2px', borderRadius: '6px' }}>
          <button
            style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600, background: locale === 'en' ? '#FFF' : 'transparent', border: 'none', borderRadius: '4px', color: locale === 'en' ? '#111' : '#666', cursor: 'pointer', boxShadow: locale === 'en' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
            onClick={() => setLocale('en')}
          >
            EN
          </button>
          <button
            style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600, background: locale === 'vi' ? '#FFF' : 'transparent', border: 'none', borderRadius: '4px', color: locale === 'vi' ? '#111' : '#666', cursor: 'pointer', boxShadow: locale === 'vi' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
            onClick={() => setLocale('vi')}
          >
            VI
          </button>
        </div>

        <button style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '6px', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600, color: '#111', cursor: 'pointer' }}>
          Share
        </button>
        <div style={{ background: '#714DE8', color: '#FFF', borderRadius: '6px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
          <span>Upgrade</span>
        </div>
        <div style={{ width: '28px', height: '28px', background: '#DDD', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0, cursor: 'pointer' }}>
          {/* Avatar placeholder */}
        </div>
      </div>
    </div>
  );
}
