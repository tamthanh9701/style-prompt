// ============================================================
// Client-side Logger
// ============================================================

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';
export type LogCategory =
  | 'api_test'     // API key test
  | 'ai_request'   // AI inference call
  | 'settings'     // Settings changes
  | 'style'        // Style CRUD
  | 'navigation'   // View changes
  | 'system';      // App lifecycle

export interface LogEntry {
  id: string;
  timestamp: number;            // Date.now()
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, unknown>; // Structured extra data
}

const MAX_LOGS = 500;
const STORAGE_KEY = 'style_prompt_logs';

// In-memory log buffer (also persisted to sessionStorage for the current tab)
let _logs: LogEntry[] = [];

function loadFromSession(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToSession(entries: LogEntry[]): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* ignore quota */ }
}

function init(): LogEntry[] {
  if (_logs.length === 0) _logs = loadFromSession();
  return _logs;
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

export function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: Record<string, unknown>
): LogEntry {
  init();
  const entry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    level,
    category,
    message,
    details,
  };
  _logs = [entry, ..._logs].slice(0, MAX_LOGS);
  saveToSession(_logs);

  // Also output to browser console for devtools
  const prefix = `[${category.toUpperCase()}]`;
  const args = details ? [prefix, message, details] : [prefix, message];
  if (level === 'error') console.error(...args);
  else if (level === 'warning') console.warn(...args);
  else if (level === 'debug') console.debug(...args);
  else console.log(...args);

  return entry;
}

// Convenience wrappers
export const logger = {
  info:    (cat: LogCategory, msg: string, d?: Record<string, unknown>) => log('info',    cat, msg, d),
  success: (cat: LogCategory, msg: string, d?: Record<string, unknown>) => log('success', cat, msg, d),
  warn:    (cat: LogCategory, msg: string, d?: Record<string, unknown>) => log('warning', cat, msg, d),
  error:   (cat: LogCategory, msg: string, d?: Record<string, unknown>) => log('error',   cat, msg, d),
  debug:   (cat: LogCategory, msg: string, d?: Record<string, unknown>) => log('debug',   cat, msg, d),
};

export function getLogs(): LogEntry[] {
  return init();
}

export function clearLogs(): void {
  _logs = [];
  saveToSession([]);
}

// Measure elapsed time helper
export function startTimer() {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}
