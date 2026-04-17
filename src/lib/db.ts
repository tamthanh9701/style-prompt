import { RefImageRecord, GenImageRecord, GenerationJob } from '../types';
export type { RefImageRecord, GenImageRecord, GenerationJob };

// ============================================================
// IndexedDB wrapper for Style Prompt Library
// Stores large binary data (images) and Jobs efficiently
// ============================================================

const DB_NAME = 'style_prompt_library_db';
const DB_VERSION = 2; // Bumped to 2 for v2 schema

// Object stores
const STORES = {
  REFERENCE_IMAGES: 'reference_images', // stores RefImageRecord
  GENERATED_IMAGES: 'generated_images', // stores GenImageRecord
  GENERATION_JOBS: 'generation_jobs',   // stores GenerationJob
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
        refStore.createIndex('libraryId', 'libraryId', { unique: false });
      }

      // Generated images store
      if (!db.objectStoreNames.contains(STORES.GENERATED_IMAGES)) {
        const genStore = db.createObjectStore(STORES.GENERATED_IMAGES, { keyPath: 'id' });
        genStore.createIndex('libraryId', 'libraryId', { unique: false });
        genStore.createIndex('jobId', 'jobId', { unique: false });
      }

      // Generation jobs store
      if (!db.objectStoreNames.contains(STORES.GENERATION_JOBS)) {
        const jobStore = db.createObjectStore(STORES.GENERATION_JOBS, { keyPath: 'id' });
        jobStore.createIndex('libraryId', 'libraryId', { unique: false });
        jobStore.createIndex('createdAt', 'createdAt', { unique: false });
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
// Reference Images API (Blobs)
// ============================================================

export async function getRefImages(libraryId: string): Promise<RefImageRecord[]> {
  if (typeof window === 'undefined') return [];
  const records = await txGetAllByIndex<RefImageRecord>(STORES.REFERENCE_IMAGES, 'libraryId', libraryId);
  return records.sort((a, b) => a.index - b.index);
}

export async function getRefImageById(id: string): Promise<RefImageRecord | undefined> {
  if (typeof window === 'undefined') return undefined;
  return txGet<RefImageRecord>(STORES.REFERENCE_IMAGES, id);
}

export async function setRefImages(libraryId: string, records: RefImageRecord[]): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDeleteByIndex(STORES.REFERENCE_IMAGES, 'libraryId', libraryId);
  for (const record of records) {
    await txPut(STORES.REFERENCE_IMAGES, record);
  }
}

export async function putRefImage(record: RefImageRecord): Promise<void> {
  if (typeof window === 'undefined') return;
  await txPut(STORES.REFERENCE_IMAGES, record);
}

export async function deleteRefImage(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDelete(STORES.REFERENCE_IMAGES, id);
}

export async function deleteAllRefImages(libraryId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDeleteByIndex(STORES.REFERENCE_IMAGES, 'libraryId', libraryId);
}

// ============================================================
// Generated Images API (Blobs)
// ============================================================

export async function getGenImages(libraryId: string): Promise<GenImageRecord[]> {
  if (typeof window === 'undefined') return [];
  const records = await txGetAllByIndex<GenImageRecord>(STORES.GENERATED_IMAGES, 'libraryId', libraryId);
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getGenImageById(id: string): Promise<GenImageRecord | undefined> {
  if (typeof window === 'undefined') return undefined;
  return txGet<GenImageRecord>(STORES.GENERATED_IMAGES, id);
}

export async function saveGenImage(record: GenImageRecord): Promise<void> {
  if (typeof window === 'undefined') return;
  await txPut(STORES.GENERATED_IMAGES, record);
}

export async function deleteGenImage(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDelete(STORES.GENERATED_IMAGES, id);
}

export async function deleteAllGenImages(libraryId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDeleteByIndex(STORES.GENERATED_IMAGES, 'libraryId', libraryId);
}

// ============================================================
// Generation Jobs API
// ============================================================

export async function getGenerationJobs(libraryId: string): Promise<GenerationJob[]> {
  if (typeof window === 'undefined') return [];
  const records = await txGetAllByIndex<GenerationJob>(STORES.GENERATION_JOBS, 'libraryId', libraryId);
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveGenerationJob(record: GenerationJob): Promise<void> {
  if (typeof window === 'undefined') return;
  await txPut(STORES.GENERATION_JOBS, record);
}

export async function deleteGenerationJob(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  await txDelete(STORES.GENERATION_JOBS, id);
}

// ============================================================
// Utility: Base64 to Blob helper
// ============================================================

export function base64ToBlob(base64: string, mimeType?: string): Blob {
  const parts = base64.split(';base64,');
  const contentType = mimeType || (parts[0].match(/:(.*?)$/)?.[1] || 'image/jpeg');
  const raw = window.atob(parts[1] || parts[0]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
