import type { StyleLibrary, AppSettings, AIProviderType, DEFAULT_PROVIDERS } from '@/types';

const STORAGE_KEY = 'style_prompt_library';
const SETTINGS_KEY = 'style_prompt_settings';

// ============================================================
// Style Library Storage (localStorage + base64 images)
// ============================================================

export function getStyles(): StyleLibrary[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveStyles(styles: StyleLibrary[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
}

export function getStyleById(id: string): StyleLibrary | undefined {
  return getStyles().find(s => s.id === id);
}

export function addStyle(style: StyleLibrary): void {
  const styles = getStyles();
  styles.unshift(style);
  saveStyles(styles);
}

export function updateStyle(id: string, updates: Partial<StyleLibrary>): void {
  const styles = getStyles();
  const index = styles.findIndex(s => s.id === id);
  if (index !== -1) {
    styles[index] = { ...styles[index], ...updates, updated_at: new Date().toISOString() };
    saveStyles(styles);
  }
}

export function deleteStyle(id: string): void {
  const styles = getStyles().filter(s => s.id !== id);
  saveStyles(styles);
}

// ============================================================
// Settings Storage
// ============================================================

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return createDefaultSettings();
  }
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return createDefaultSettings();

    const saved: AppSettings = JSON.parse(data);
    const defaults = createDefaultSettings();

    // Merge: ensure every provider from defaults exists in saved settings
    // This handles the case where new providers are added to the app after the user already saved settings
    const mergedProviders = { ...defaults.providers };
    for (const key of Object.keys(saved.providers) as Array<keyof typeof saved.providers>) {
      mergedProviders[key] = { ...defaults.providers[key], ...saved.providers[key] };
    }

    return {
      ...defaults,
      ...saved,
      providers: mergedProviders,
    };
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function createDefaultSettings(): AppSettings {
  return {
    active_provider: 'openai',
    providers: {
      openai: { type: 'openai', api_key: '', base_url: 'https://api.openai.com/v1', model: 'gpt-4o', enabled: false },
      anthropic: { type: 'anthropic', api_key: '', base_url: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514', enabled: false },
      openrouter: { type: 'openrouter', api_key: '', base_url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o', enabled: false },
      litellm: { type: 'litellm', api_key: '', base_url: 'http://localhost:4000', model: 'gpt-4o', enabled: false },
      google: { type: 'google', api_key: '', base_url: 'https://generativelanguage.googleapis.com', model: 'gemini-2.0-flash', enabled: false },
      vertexai: { type: 'vertexai', api_key: '', base_url: 'https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1', model: 'gemini-2.0-flash', enabled: false },
    },
  };
}

// ============================================================
// Image Utils
// ============================================================

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ============================================================
// AI API Helper
// ============================================================

export async function callAI(
  settings: AppSettings,
  action: 'analyzeStyle' | 'compareImages' | 'suggestImprovements' | 'generateVariant',
  images: string[],
  options?: { prompt_context?: string; reference_images?: string[] }
) {
  // Lazy-import to avoid SSR issues
  const { logger, startTimer } = await import('./logger');
  const provider = settings.providers[settings.active_provider];

  if (!provider.api_key) {
    const msg = `API key for ${settings.active_provider} is not configured. Go to Settings to add your API key.`;
    logger.error('ai_request', msg, { provider: settings.active_provider, action });
    throw new Error(msg);
  }

  const elapsed = startTimer();
  logger.info('ai_request', `Starting AI request: ${action}`, {
    provider: settings.active_provider,
    model: provider.model,
    action,
    imageCount: images.length,
    hasContext: !!options?.prompt_context,
  });

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      provider: settings.active_provider,
      api_key: provider.api_key,
      base_url: provider.base_url,
      model: provider.model,
      images,
      ...options,
    }),
  });
  // Parse response safely — server may return non-JSON (e.g. "Request Entity Too Large")
  const responseText = await response.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: { result?: any; error?: string; raw?: boolean };
  try {
    data = JSON.parse(responseText);
  } catch {
    const errMsg = responseText.length > 200 ? responseText.slice(0, 200) + '...' : responseText;
    logger.error('ai_request', `AI response not JSON: ${action}`, {
      provider: settings.active_provider,
      status: response.status,
      responsePreview: errMsg,
      elapsedMs: elapsed(),
    });
    throw new Error(`Server error (${response.status}): ${errMsg}`);
  }

  if (!response.ok) {
    const errMsg = data.error || 'AI request failed';
    logger.error('ai_request', `AI request failed: ${action}`, {
      provider: settings.active_provider,
      model: provider.model,
      action,
      status: response.status,
      error: errMsg,
      elapsedMs: elapsed(),
    });
    throw new Error(errMsg);
  }

  logger.success('ai_request', `AI request succeeded: ${action}`, {
    provider: settings.active_provider,
    model: provider.model,
    action,
    elapsedMs: elapsed(),
    resultType: typeof data.result,
  });

  return data.result;
}
