'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { StyleLibrary, AppSettings } from '@/types';
import { getStyles, addStyle, updateStyle, deleteStyle, getSettings, saveSettings, syncSettingsFromServer } from '@/lib/storage';
import { type Locale, getLocale, setLocale as persistLocale, t } from '@/lib/i18n';
import { deleteAllRefImages, deleteAllGenImages } from '@/lib/db';
import { getSession, getUserRole, getRoleFromSession, signOut, onAuthStateChange, type UserRole } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import Sidebar from '@/app/components/Sidebar';
import AuthView from '@/app/components/AuthView';

// Lazy-load heavy views — only download JS when the user navigates to them
const LibraryView = dynamic(() => import('@/app/components/LibraryView'));
const CreateStyleView = dynamic(() => import('@/app/components/CreateStyleView'));
const EditStyleView = dynamic(() => import('@/app/components/EditStyleView'));
const GenerateView = dynamic(() => import('@/app/components/GenerateView'));
const ImageEditView = dynamic(() => import('@/app/components/ImageEditView'));
const LogsView = dynamic(() => import('@/app/components/LogsView'));
const SettingsView = dynamic(() => import('@/app/components/SettingsView'));
const UserManagementView = dynamic(() => import('@/app/components/UserManagementView'));

// ============================================================
// Main App Component
// ============================================================

type View = 'library' | 'create' | 'edit' | 'generate' | 'image_edit' | 'settings' | 'logs' | 'users';

export default function HomePage() {
  const [view, setView] = useState<View>('library');
  const [styles, setStyles] = useState<StyleLibrary[]>([]);
  const [settings, setSettingsState] = useState<AppSettings | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [locale, setLocaleState] = useState<Locale>('vi');
  const [mounted, setMounted] = useState(false);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = loading
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    setLocaleState(getLocale());

    // If Supabase is not properly configured (placeholder URL), skip auth entirely
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured — env vars may not be baked in. Showing login screen.');
      setIsAuthenticated(false);
      setMounted(true);
      return;
    }

    // Race between getSession and a 5-second timeout to prevent infinite hang
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));

    Promise.race([getSession(), timeout]).then(async (session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
        // Read role directly from session user metadata (server-verified)
        setUserRole(getRoleFromSession(session.user));
      } else {
        setIsAuthenticated(false);
      }
      setMounted(true);
    }).catch(() => {
      setIsAuthenticated(false);
      setMounted(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
        // Read role directly from the fresh session (always up-to-date)
        setUserRole(getRoleFromSession(session.user));
      } else {
        setIsAuthenticated(false);
        setUserRole('user');
        setUserEmail('');
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  // Load app data once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const allStyles = getStyles();
    setStyles(allStyles);
    // Load local cache immediately for fast display
    setSettingsState(getSettings());

    // Then sync from server (global settings shared by all users)
    syncSettingsFromServer().then((serverSettings) => {
      setSettingsState(serverSettings);
    });

    import('@/lib/storage').then(module => {
      module.syncStylesFromServer().then(() => {
        setStyles(module.getStyles());
      });
      module.migrateV1toV2().then((result) => {
        if (result && result.migrated > 0) {
          setStyles(module.getStyles());
        }
      });
    });
  }, [isAuthenticated]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const switchLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    persistLocale(newLocale);
  };

  const selectedStyle = styles.find(s => s.id === selectedStyleId);
  const refreshStyles = () => setStyles(getStyles());
  const L = (key: Parameters<typeof t>[1]) => t(locale, key);

  const handleCreateStyle = (style: StyleLibrary) => {
    addStyle(style);
    refreshStyles();
    setSelectedStyleId(style.id);
    setView('edit');
    showToast(L('style_created'));
  };

  const handleUpdateStyle = (id: string, updates: Partial<StyleLibrary>) => {
    updateStyle(id, updates);
    refreshStyles();
  };

  const handleDeleteStyle = async (id: string) => {
    deleteStyle(id);
    await deleteAllRefImages(id);
    await deleteAllGenImages(id);
    refreshStyles();
    setView('library');
    showToast(L('style_deleted'));
  };

  const handleSettingsSave = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettingsState(newSettings);
    showToast(L('settings_saved'));
  };

  const handleLogout = async () => {
    await signOut();
    setView('library');
  };

  // Loading state — show a spinner instead of blank screen
  if (!mounted || isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary, #0f0f10)', color: '#888', fontSize: '0.9rem' }}>
        Đang tải...
      </div>
    );
  }

  // Not authenticated → show login
  if (!isAuthenticated) {
    return (
      <>
        <AuthView locale={locale} onSuccess={() => { }} showToast={showToast} />
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>
              {toast.type === 'success' && '✓'} {toast.type === 'error' && '✗'} {toast.type === 'warning' && '⚠'} {toast.message}
            </div>
          </div>
        )}
      </>
    );
  }

  if (!settings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary, #0f0f10)', color: '#888', fontSize: '0.9rem' }}>
        Đang tải cài đặt...
      </div>
    );
  }

  // Role-based view filtering for users
  const isAdmin = userRole === 'admin';
  const visibleStyles = isAdmin ? styles : styles.filter(s => s.status === 'active');

  const handleViewChange = (v: string) => {
    // Block restricted views for non-admin
    if (!isAdmin && ['create', 'edit', 'image_edit', 'settings', 'logs', 'users'].includes(v)) return;
    setView(v as View);
    if (v === 'library') setSelectedStyleId(null);
  };

  return (
    <div className="app-shell">
      <Sidebar
        currentView={view}
        setView={handleViewChange}
        locale={locale}
        setLocale={switchLocale}
        role={userRole}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <div className={view === 'generate' || view === 'image_edit' ? "app-main-fullscreen fade-in" : "app-main fade-in"}>
        {view === 'library' && (
          <LibraryView
            styles={visibleStyles} locale={locale}
            onSelect={(id) => {
              setSelectedStyleId(id);
              setView(isAdmin ? 'edit' : 'generate');
            }}
            onCreate={() => setView('create')}
            onDelete={handleDeleteStyle}
            role={userRole}
          />
        )}
        {view === 'create' && isAdmin && <CreateStyleView settings={settings} locale={locale} onBack={() => setView('library')} onCreate={handleCreateStyle} showToast={showToast} />}
        {view === 'edit' && isAdmin && selectedStyle && <EditStyleView style={selectedStyle} settings={settings} locale={locale} onBack={() => setView('library')} onDelete={handleDeleteStyle} onUpdate={handleUpdateStyle} onGenerate={() => setView('generate')} showToast={showToast} />}
        {view === 'generate' && selectedStyle && <GenerateView style={selectedStyle} settings={settings} locale={locale} onBack={() => setView(isAdmin ? 'edit' : 'library')} onUpdate={handleUpdateStyle} showToast={showToast} onRequestEdit={(imageId) => { if (isAdmin) { setSelectedImageId(imageId); setView('image_edit'); } }} />}
        {view === 'image_edit' && isAdmin && selectedStyle && <ImageEditView style={selectedStyle} settings={settings} locale={locale} imageId={selectedImageId} onBack={() => setView('generate')} onUpdate={handleUpdateStyle} showToast={showToast} />}
        {view === 'logs' && isAdmin && <LogsView locale={locale} onBack={() => setView('library')} />}
        {view === 'settings' && isAdmin && <SettingsView settings={settings} locale={locale} onBack={() => setView('library')} onSave={handleSettingsSave} showToast={showToast} />}
        {view === 'users' && isAdmin && <UserManagementView locale={locale} showToast={showToast} onBack={() => setView('library')} />}
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' && '✓'} {toast.type === 'error' && '✗'} {toast.type === 'warning' && '⚠'} {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
