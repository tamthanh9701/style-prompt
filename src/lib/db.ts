// ============================================================
// IndexedDB wrapper for Style Prompt Library
// Stores large binary data (images) efficiently
// ============================================================

const DB_NAME = 'style_prompt_library_db';
const DB_VERSION = 1;

// Object stores
const STORES = {
  REFERENCE_IMAGES: 'reference_images',   // { id: string, style_id: string, data: string (base64), index: number }
  GENERATED_IMAGES: 'generated_images',   // { id: string, style_id: string, data: string (base64), ...meta }
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// ============================================================
// DB initialization
// ============================================================

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Reference images store
      if (!db.objectStoreNames.contains(STORES.REFERENCE_IMAGES)) {
        const refStore = db.createObjectStore(STORES.REFERENCE_IMAGES, { keyPath: 'id' });
        refStore.createIndex('style_id', 'style_id', { unique: false });
      }

      // Generated images store
      if (!db.objectStoreNames.contains(STORES.GENERATED_IMAGES)) {
        const genStore = db.createObjectStore(STORES.GENERATED_IMAGES, { keyPath: 'id' });
        genStore.createIndex('style_id', 'style_id', { unique: false });
        genStore.createIndex('created_at', 'created_at', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error(`IndexedDB open failed: ${request.error?.message}`));
    };
  });
}

// ============================================================
// Generic CRUD helpers
// ============================================================

function txGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => reject(req.error);
      })
  );
}

function txGetAllByIndex<T>(store: StoreName, indexName: string, value: string): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const idx = tx.objectStore(store).index(indexName);
        const req = idx.getAll(value);
        req.onsuccess = () => resolve(req.result as T[]);
        req.onerror = () => reject(req.error);
      })
  );
}

function txPut<T>(store: StoreName, value: T): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

function txDelete(store: StoreName, key: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
  );
}

function txDeleteByIndex(store: StoreName, indexName: string, value: string): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const idx = tx.objectStore(store).index(indexName);
        const cursorReq = idx.openCursor(IDBKeyRange.only(value));
        const keys: IDBValidKey[] = [];

        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            keys.push(cursor.primaryKey);
            cursor.continue();
          } else {
            // Delete all found keys
            const deleteTx = db.transaction(store, 'readwrite');
            const objStore = deleteTx.objectStore(store);
            let i = 0;
            const deleteNext = () => {
              if (i >= keys.length) { resolve(); return; }
              const delReq = objStore.delete(keys[i++]);
              delReq.onsuccess = deleteNext;
              delReq.onerror = () => reject(delReq.error);
            };
            deleteNext();
          }
        };
        cursorReq.onerror = () => reject(cursorReq.error);
      })
  );
}

// ============================================================
// Reference Image record type
// ============================================================

export interface RefImageRecord {
  id: string;         // Unique ID (generateId())
  style_id: string;   // Parent style ID
  data: string;       // base64 data URL
  index: number;      // Display order (0-based)
  added_at: string;   // ISO timestamp
}

// ============================================================
// Reference Images API
// ============================================================

/** Get all reference images for a style, ordered by index */
export async function getRefImages(styleId: string): Promise<RefImageRecord[]> {
  if (typeof window === 'undefined') return [];
  const records = await txGetAllByIndex<RefImageRecord>(STORES.REFERENCE_IMAGES, 'style_id', styleId);
  return records.sort((a, b) => a.index - b.index);
}

/** Get raw base64 strings for a style (for backward compat with prompt analysis) */
export async function getRefImageData(styleId: string): Promise<string[]> {
  const records = await getRefImages(styleId);
  return records.map((r) => r.data);
}

/** Save multiple reference images for a style (replaces existing) */
export async function setRefImages(styleId: string, images: string[]): Promise<void> {
  if (typeof window === 'undefined') return;
  // Delete old records for this style
  await txDeleteByIndex(STORES.REFERENCE_IMAGES, 'style_id', styleId);
  // Insert new records
  for (let i = 0; i < images.length; i++) {
    const record: RefImageRecord = {
      id: `${styleId}_ref_${i}_${Date.now()}`,
      style_id: styleId,
      data: images[i],
      index: i,
      added_at: new Date().toISOString(),
    };
    await txPut(STORES.REFERENCE_IMAGES, record);
  }
}

/** Append new images to an existing style (up to maxImages limit) */
export async function appendRefImages(styleId: string, newImages: string[], maxImages = 30): Promise<string[]> {
  if (typeof window === 'undefined') return [];
  const existing = await getRefImages(styleId);
  const combined = [...existing.map((r) => r.data), ...newImages].slice(0, maxImages);
  await setRefImages(styleId, combined);
  return combined;
}

/** Delete a specific reference image by its DB id */
export async function deleteRefImage(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDelete(STORES.REFERENCE_IMAGES, id);
}

/** Delete all reference images for a style */
export async function deleteAllRefImages(styleId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDeleteByIndex(STORES.REFERENCE_IMAGES, 'style_id', styleId);
}

// ============================================================
// Generated Image record type
// ============================================================

export interface GenImageRecord {
  id: string;
  style_id: string;
  data: string;                 // base64 data URL
  prompt_text: string;
  prompt_json: string;          // JSON string of PromptSchema used
  created_at: string;
  generation_source: 'imagen' | 'external' | 'unknown';
  aspect_ratio: string;
  variant_params?: Record<string, string>;    // subject values used
  parent_image_id?: string;                   // if variant of another image
}

// ============================================================
// Generated Images API
// ============================================================

/** Get all generated images for a style */
export async function getGenImages(styleId: string): Promise<GenImageRecord[]> {
  if (typeof window === 'undefined') return [];
  const records = await txGetAllByIndex<GenImageRecord>(STORES.GENERATED_IMAGES, 'style_id', styleId);
  return records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/** Get a single generated image by ID */
export async function getGenImageById(id: string): Promise<GenImageRecord | undefined> {
  if (typeof window === 'undefined') return undefined;
  return txGet<GenImageRecord>(STORES.GENERATED_IMAGES, id);
}

/** Save a generated image */
export async function saveGenImage(record: GenImageRecord): Promise<void> {
  if (typeof window === 'undefined') return;
  await txPut(STORES.GENERATED_IMAGES, record);
}

/** Delete a generated image by ID */
export async function deleteGenImage(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDelete(STORES.GENERATED_IMAGES, id);
}

/** Delete all generated images for a style */
export async function deleteAllGenImages(styleId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDeleteByIndex(STORES.GENERATED_IMAGES, 'style_id', styleId);
}

// ============================================================
// Migration helper: move base64 images from localStorage to IndexedDB
// Call once on app startup for existing data
// ============================================================

export async function migrateImagesToIndexedDB(
  styleId: string,
  base64Images: string[]
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (base64Images.length === 0) return;

  // Check if already migrated (any record exists for this style)
  const existing = await getRefImages(styleId);
  if (existing.length > 0) return; // Already migrated

  await setRefImages(styleId, base64Images);
}
