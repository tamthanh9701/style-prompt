'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StyleLibrary, AppSettings, PromptSchema, PromptInstance, EvalRecord, StyleStatus } from '@/types';
import { createEmptyPrompt, flattenPrompt, generateJsonPrompt, PROMPT_GROUPS, STYLE_GROUPS, SUBJECT_GROUPS, getGroupCategory, MAX_REFERENCE_IMAGES } from '@/types';
import { getStyles, addStyle, updateStyle, deleteStyle, getSettings, saveSettings, fileToBase64, generateId, callAI, callImageGen, promoteStyle, createNewVersion, addPromptInstance, addEvalRecord } from '@/lib/storage';
import { type Locale, getLocale, setLocale as persistLocale, t, getGroupLabel, getFieldLabel } from '@/lib/i18n';
import { getRefImages, setRefImages, deleteAllRefImages, deleteAllGenImages, getGenImages, saveGenImage, deleteGenImage } from '@/lib/db';
import Sidebar from '@/app/components/Sidebar';
import LibraryView from '@/app/components/LibraryView';
import CreateStyleView from '@/app/components/CreateStyleView';
import EditStyleView from '@/app/components/EditStyleView';
import GenerateView from '@/app/components/GenerateView';
import ImageEditView from '@/app/components/ImageEditView';
import LogsView from '@/app/components/LogsView';
import SettingsView from '@/app/components/SettingsView';

import FieldInput from '@/app/components/FieldInput';

// ============================================================
// Main App Component
// ============================================================

type View = 'library' | 'create' | 'edit' | 'generate' | 'image_edit' | 'settings' | 'logs';

export default function HomePage() {
  const [view, setView] = useState<View>('library');
  const [styles, setStyles] = useState<StyleLibrary[]>([]);
  const [settings, setSettingsState] = useState<AppSettings | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [locale, setLocaleState] = useState<Locale>('vi');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const allStyles = getStyles();
    setStyles(allStyles);
    setSettingsState(getSettings());
    setLocaleState(getLocale());
    setMounted(true);

    // Call migration in background and auto-refresh styles if changes occurred
    import('@/lib/storage').then(module => {
      module.migrateV1toV2().then((result) => {
        if (result && result.migrated > 0) {
           setStyles(getStyles());
        }
      });
    });
  }, []);

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
    // Also delete images from IndexedDB
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

  if (!mounted || !settings) return null;

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentView={view} 
        setView={(v) => {
          setView(v as View);
          if (v === 'library') setSelectedStyleId(null);
        }} 
        locale={locale} 
        setLocale={switchLocale} 
      />

      {/* Main Content Area */}
      <div className="app-main fade-in">
        {view === 'library' && <LibraryView styles={styles} locale={locale} onSelect={(id) => { setSelectedStyleId(id); setView('edit'); }} onCreate={() => setView('create')} onDelete={handleDeleteStyle} />}
        {view === 'create' && <CreateStyleView settings={settings} locale={locale} onBack={() => setView('library')} onCreate={handleCreateStyle} showToast={showToast} />}
        {view === 'edit' && selectedStyle && <EditStyleView style={selectedStyle} settings={settings} locale={locale} onBack={() => setView('library')} onUpdate={handleUpdateStyle} onGenerate={() => setView('generate')} showToast={showToast} />}
        {view === 'generate' && selectedStyle && <GenerateView style={selectedStyle} settings={settings} locale={locale} onBack={() => setView('edit')} onUpdate={handleUpdateStyle} showToast={showToast} onRequestEdit={(imageId) => { setSelectedImageId(imageId); setView('image_edit'); }} />}
        {view === 'image_edit' && selectedStyle && <ImageEditView style={selectedStyle} settings={settings} locale={locale} imageId={selectedImageId} onBack={() => setView('generate')} onUpdate={handleUpdateStyle} showToast={showToast} />}
        {view === 'logs' && <LogsView locale={locale} onBack={() => setView('library')} />}
        {view === 'settings' && <SettingsView settings={settings} locale={locale} onBack={() => setView('library')} onSave={handleSettingsSave} showToast={showToast} />}
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






