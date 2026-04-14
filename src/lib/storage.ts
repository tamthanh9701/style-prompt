import type { StyleLibrary, AppSettings, AIProviderType, PromptInstance, EvalRecord } from '@/types';

const STORAGE_KEY = 'style_prompt_library';
const SETTINGS_KEY = 'style_prompt_settings';

// ============================================================
// Style Library Storage
// NOTE: Images are stored in IndexedDB (src/lib/db.ts)
//       Only metadata is kept in localStorage
// ============================================================

export function getStyles(): StyleLibrary[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const styles: StyleLibrary[] = data ? JSON.parse(data) : [];
    // Migration: add missing fields for old data
    return styles.map(s => ({
      ...s,
      status: s.status || 'active',
      version: s.version || 1,
      prompt_instances: s.prompt_instances || [],
      eval_records: s.eval_records || [],
      generated_image_ids: s.generated_image_ids || [],
      generated_images: s.generated_images || [],
      ref_image_count: s.ref_image_count ?? (s.reference_images?.length || 0),
    }));
  } catch {
    return [];
  }
}

export function saveStyles(styles: StyleLibrary[]): void {
  if (typeof window === 'undefined') return;
  // Strip large base64 reference_images from localStorage — images live in IndexedDB
  const stripped = styles.map(s => ({
    ...s,
    reference_images: [], // Always clear from localStorage after migration
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
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
// Version Lifecycle Management
// ============================================================

/** Promote a draft style to active, deprecating any previous active version with same name */
export function promoteStyle(id: string): void {
  const styles = getStyles();
  const target = styles.find(s => s.id === id);
  if (!target || target.status !== 'draft') return;

  // Deprecate any other active style with same name
  styles.forEach(s => {
    if (s.name === target.name && s.status === 'active' && s.id !== id) {
      s.status = 'deprecated';
      s.updated_at = new Date().toISOString();
    }
  });

  target.status = 'active';
  target.updated_at = new Date().toISOString();
  saveStyles(styles);
}

/** Create a new draft version from an existing style */
export function createNewVersion(sourceId: string): StyleLibrary | null {
  const styles = getStyles();
  const source = styles.find(s => s.id === sourceId);
  if (!source) return null;

  const maxVersion = styles
    .filter(s => s.name === source.name)
    .reduce((max, s) => Math.max(max, s.version || 1), 0);

  const newStyle: StyleLibrary = {
    ...JSON.parse(JSON.stringify(source)),
    id: generateId(),
    status: 'draft' as const,
    version: maxVersion + 1,
    parent_version_id: source.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    prompt_instances: [],
    eval_records: [],
    generated_image_ids: [],
    generated_images: [],
    cached_variant_fields: source.cached_variant_fields,
    ref_image_count: source.ref_image_count || 0,
    reference_images: [],
  };
  styles.unshift(newStyle);
  saveStyles(styles);
  return newStyle;
}

/** Add a PromptInstance to a style */
export function addPromptInstance(styleId: string, instance: PromptInstance): void {
  const styles = getStyles();
  const style = styles.find(s => s.id === styleId);
  if (!style) return;
  if (!style.prompt_instances) style.prompt_instances = [];
  style.prompt_instances.unshift(instance);
  style.updated_at = new Date().toISOString();
  saveStyles(styles);
}

/** Add an EvalRecord to a style */
export function addEvalRecord(styleId: string, record: EvalRecord): void {
  const styles = getStyles();
  const style = styles.find(s => s.id === styleId);
  if (!style) return;
  if (!style.eval_records) style.eval_records = [];
  style.eval_records.unshift(record);
  style.updated_at = new Date().toISOString();
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
    const mergedProviders = { ...defaults.providers };
    for (const key of Object.keys(saved.providers) as Array<keyof typeof saved.providers>) {
      mergedProviders[key] = { ...defaults.providers[key], ...saved.providers[key] };
    }

    return {
      ...defaults,
      ...saved,
      providers: mergedProviders,
      image_gen: { ...defaults.image_gen, ...(saved.image_gen || {}) },
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
      vertexai: { type: 'vertexai', api_key: '', base_url: '', model: 'gemini-2.0-flash', enabled: false, vertex_project: '', vertex_location: 'us-central1', vertex_credentials: '' },
    },
    image_gen: {
      enabled: false,
      provider: 'vertex_gemini',
      model: 'gemini-3.1-flash-image-preview',
      vertex_project: '',
      vertex_location: 'global',
      vertex_credentials: '',
      default_aspect_ratio: '1:1',
      default_sample_count: 2,
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
// AI API Helper (Text Analysis)
// ============================================================

export async function callAI(
  settings: AppSettings,
  action: 'analyzeStyle' | 'compareImages' | 'suggestImprovements' | 'generateVariant' | 'variantFromImage' | 'analyzeForEdit' | 'generateEditPrompt',
  images: string[],
  options?: { prompt_context?: string; reference_images?: string[] }
) {
  const { logger, startTimer } = await import('./logger');
  const provider = settings.providers[settings.active_provider];

  if (!provider.api_key && !(settings.active_provider === 'vertexai' && provider.vertex_credentials)) {
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
      ...(settings.active_provider === 'vertexai' ? {
        vertex_project: provider.vertex_project,
        vertex_location: provider.vertex_location,
        vertex_credentials: provider.vertex_credentials,
      } : {}),
      ...options,
    }),
  });

  const extractJsonBlock = (text: string) => {
    // Strip markdown JSON block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    try {
      if (match && match[1]) return JSON.parse(match[1]);
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const responseText = await response.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: { result?: any; error?: string; raw?: boolean };
  try {
    data = JSON.parse(responseText);
  } catch {
    // If strict parsing fails, check if the response acts as a raw string wrap or markdown payload.
    // Try to extract a JSON block manually before throwing an error.
    try {
      const extracted = extractJsonBlock(responseText);
      if (extracted) {
        data = { result: extracted };
      } else {
        throw new Error('No extractable JSON');
      }
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

// ============================================================
// Image Generation API Helper (Vertex AI Gemini Image)
// ============================================================

export async function callImageGen(
  settings: AppSettings,
  prompt: string,
  options?: {
    negative_prompt?: string;
    aspect_ratio?: string;
    reference_images?: string[];
    sample_count?: number;
    seed?: number;
  }
): Promise<string[]> {
  const cfg = settings.image_gen;
  if (!cfg.enabled) {
    throw new Error('Image generation is not enabled. Please configure it in Settings → Image Generation.');
  }
  if (!cfg.vertex_credentials && !cfg.vertex_project) {
    throw new Error('Vertex AI credentials are not configured for image generation.');
  }

  const response = await fetch('/api/imagen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      negative_prompt: options?.negative_prompt,
      aspect_ratio: options?.aspect_ratio || cfg.default_aspect_ratio,
      reference_images: options?.reference_images,
      sample_count: options?.sample_count || cfg.default_sample_count,
      seed: options?.seed,
      model: cfg.model,
      vertex_project: cfg.vertex_project,
      vertex_location: cfg.vertex_location || 'global',
      vertex_credentials: cfg.vertex_credentials,
    }),
  });

  const responseText = await response.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: { images?: string[]; error?: string };
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Image gen server error (${response.status}): ${responseText.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(data.error || 'Image generation failed');
  }

  return data.images || [];
}
