import { RefImageRecord, GenImageRecord, GenerationJob } from '../types';
import { supabase, uploadImage, getPublicUrl, deleteImage } from './supabase';
export type { RefImageRecord, GenImageRecord, GenerationJob };

// ============================================================
// IndexedDB wrapper for Style Prompt Library
// Stores large binary data (images) and Jobs efficiently
// ============================================================

const DB_NAME = 'style_prompt_library_db';
const DB_VERSION = 3; // Bumped to 3 to ensure indexes are created

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
      const tx = (event.target as IDBOpenDBRequest).transaction!;

      // Reference images store
      let refStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.REFERENCE_IMAGES)) {
        refStore = db.createObjectStore(STORES.REFERENCE_IMAGES, { keyPath: 'id' });
      } else {
        refStore = tx.objectStore(STORES.REFERENCE_IMAGES);
      }
      if (!refStore.indexNames.contains('libraryId')) {
        refStore.createIndex('libraryId', 'libraryId', { unique: false });
      }

      // Generated images store
      let genStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.GENERATED_IMAGES)) {
        genStore = db.createObjectStore(STORES.GENERATED_IMAGES, { keyPath: 'id' });
      } else {
        genStore = tx.objectStore(STORES.GENERATED_IMAGES);
      }
      if (!genStore.indexNames.contains('libraryId')) {
        genStore.createIndex('libraryId', 'libraryId', { unique: false });
      }
      if (!genStore.indexNames.contains('jobId')) {
        genStore.createIndex('jobId', 'jobId', { unique: false });
      }

      // Generation jobs store
      let jobStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.GENERATION_JOBS)) {
        jobStore = db.createObjectStore(STORES.GENERATION_JOBS, { keyPath: 'id' });
      } else {
        jobStore = tx.objectStore(STORES.GENERATION_JOBS);
      }
      if (!jobStore.indexNames.contains('libraryId')) {
        jobStore.createIndex('libraryId', 'libraryId', { unique: false });
      }
      if (!jobStore.indexNames.contains('createdAt')) {
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
  try {
    const { data } = await supabase.from('ref_images').select('*').eq('library_id', libraryId);
    if (data && data.length > 0) {
      const serverRecords = data.map((d: any) => ({
        id: d.id, libraryId: d.library_id, data: getPublicUrl('images', d.storage_path),
        mimeType: d.mime_type, index: d.index, source: d.source, sourceJobId: d.source_job_id, addedAt: d.added_at
      }));
      return serverRecords.sort((a, b) => a.index - b.index);
    }
  } catch (e) { console.warn('Supabase fetch failed', e); }
  const records = await txGetAllByIndex<RefImageRecord>(STORES.REFERENCE_IMAGES, 'libraryId', libraryId);
  return records.sort((a, b) => a.index - b.index);
}

export async function getRefImageById(id: string): Promise<RefImageRecord | undefined> {
  if (typeof window === 'undefined') return undefined;
  return txGet<RefImageRecord>(STORES.REFERENCE_IMAGES, id);
}

export async function setRefImages(libraryId: string, records: RefImageRecord[]): Promise<void> {
  if (typeof window === 'undefined') return;
  await deleteAllRefImages(libraryId);
  for (const record of records) {
    await putRefImage(record);
  }
}

export async function putRefImage(record: RefImageRecord): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const storagePath = `${record.libraryId}/ref/${record.id}`;
    if (record.data instanceof Blob) {
      await uploadImage('images', storagePath, record.data, record.mimeType);
      record.data = getPublicUrl('images', storagePath); // Update local to point to server
    }
    await supabase.from('ref_images').upsert({
      id: record.id, library_id: record.libraryId, storage_path: storagePath,
      mime_type: record.mimeType, index: record.index, source: record.source,
      source_job_id: record.sourceJobId, added_at: record.addedAt
    });
  } catch (e) { console.error('Failed to sync to Supabase', e); }
  await txPut(STORES.REFERENCE_IMAGES, record);
}

export async function deleteRefImage(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const ref = await txGet<RefImageRecord>(STORES.REFERENCE_IMAGES, id);
    if (ref) {
      await deleteImage('images', `${ref.libraryId}/ref/${id}`);
      await supabase.from('ref_images').delete().eq('id', id);
    }
  } catch (e) { }
  await txDelete(STORES.REFERENCE_IMAGES, id);
}

export async function deleteAllRefImages(libraryId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { data } = await supabase.from('ref_images').select('id').eq('library_id', libraryId);
    if (data) {
      for (const d of data) {
        await deleteImage('images', `${libraryId}/ref/${d.id}`).catch(() => { });
      }
    }
    await supabase.from('ref_images').delete().eq('library_id', libraryId);
  } catch (e) { }
  await txDeleteByIndex(STORES.REFERENCE_IMAGES, 'libraryId', libraryId);
}

// ============================================================
// Generated Images API (Blobs)
// ============================================================

export async function getGenImages(libraryId: string): Promise<GenImageRecord[]> {
  if (typeof window === 'undefined') return [];
  try {
    const { data } = await supabase.from('gen_images').select('*').eq('library_id', libraryId);
    if (data && data.length > 0) {
      const serverRecords = data.map((d: any) => ({
        id: d.id, libraryId: d.library_id, jobId: d.job_id,
        data: getPublicUrl('images', d.storage_path), mimeType: d.mime_type,
        createdAt: d.created_at, generationSource: d.generation_source,
        aspectRatio: d.aspect_ratio, promptText: d.prompt_text, promptJson: typeof d.prompt_json === 'string' ? d.prompt_json : JSON.stringify(d.prompt_json)
      }));
      return serverRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (e) { console.warn('Supabase fetch failed', e); }
  const records = await txGetAllByIndex<GenImageRecord>(STORES.GENERATED_IMAGES, 'libraryId', libraryId);
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getGenImageById(id: string): Promise<GenImageRecord | undefined> {
  if (typeof window === 'undefined') return undefined;
  return txGet<GenImageRecord>(STORES.GENERATED_IMAGES, id);
}

export async function saveGenImage(record: GenImageRecord): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const storagePath = `${record.libraryId}/gen/${record.id}`;
    if (record.data instanceof Blob) {
      await uploadImage('images', storagePath, record.data, record.mimeType || 'image/jpeg');
      record.data = getPublicUrl('images', storagePath);
    }
    await supabase.from('gen_images').upsert({
      id: record.id, library_id: record.libraryId, job_id: record.jobId,
      storage_path: storagePath, mime_type: record.mimeType, created_at: record.createdAt,
      generation_source: record.generationSource, aspect_ratio: record.aspectRatio,
      prompt_text: record.promptText, prompt_json: record.promptJson ? JSON.parse(record.promptJson) : null
    });
  } catch (e) { console.error('Failed to sync to Supabase', e); }
  await txPut(STORES.GENERATED_IMAGES, record);
}

export async function deleteGenImage(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const ref = await txGet<GenImageRecord>(STORES.GENERATED_IMAGES, id);
    if (ref) {
      await deleteImage('images', `${ref.libraryId}/gen/${id}`);
      await supabase.from('gen_images').delete().eq('id', id);
    }
  } catch (e) { }
  await txDelete(STORES.GENERATED_IMAGES, id);
}

export async function deleteAllGenImages(libraryId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { data } = await supabase.from('gen_images').select('id').eq('library_id', libraryId);
    if (data) {
      for (const d of data) {
        await deleteImage('images', `${libraryId}/gen/${d.id}`).catch(() => { });
      }
    }
    await supabase.from('gen_images').delete().eq('library_id', libraryId);
  } catch (e) { }
  await txDeleteByIndex(STORES.GENERATED_IMAGES, 'libraryId', libraryId);
}

// ============================================================
// Generation Jobs API
// ============================================================

export async function getGenerationJobs(libraryId: string): Promise<GenerationJob[]> {
  if (typeof window === 'undefined') return [];
  try {
    const { data } = await supabase.from('gen_jobs').select('*').eq('library_id', libraryId);
    if (data && data.length > 0) {
      const serverRecords = data.map((d: any) => d.data as GenerationJob);
      return serverRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (e) { }
  const records = await txGetAllByIndex<GenerationJob>(STORES.GENERATION_JOBS, 'libraryId', libraryId);
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveGenerationJob(record: GenerationJob): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await supabase.from('gen_jobs').upsert({ id: record.id, library_id: record.libraryId, data: record, created_at: record.createdAt });
  } catch (e) { }
  await txPut(STORES.GENERATION_JOBS, record);
}

export async function deleteGenerationJob(id: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try { await supabase.from('gen_jobs').delete().eq('id', id); } catch (e) { }
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

export async function blobToBase64(blob: Blob | string): Promise<string> {
  if (typeof blob === 'string') {
    if (blob.startsWith('data:')) return blob;
    try {
      const response = await fetch(blob);
      if (!response.ok) throw new Error('Failed to fetch image URL');
      const downloadedBlob = await response.blob();
      return blobToBase64(downloadedBlob);
    } catch (err) {
      console.error('Failed to convert URL to base64', err);
      throw err;
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
