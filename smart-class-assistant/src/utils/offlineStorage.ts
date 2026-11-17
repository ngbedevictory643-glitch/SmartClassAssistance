import type { Material } from '../types/academic';

export interface OfflineMaterialRecord {
  id: string;
  material: Material;
  fileBlob?: Blob;
  cachedAt: string;
  sizeBytes: number;
}

const DB_NAME = 'smart_class_offline_v1';
const STORE_NAME = 'cached_materials';

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheMaterialForOffline(
  material: Material,
  onProgress?: (percent: number) => void
): Promise<OfflineMaterialRecord> {
  let fileBlob: Blob | undefined;
  let sizeBytes = new Blob([material.notesContent || material.description || material.title]).size;

  if (material.fileUrl) {
    onProgress?.(20);
    const response = await fetch(material.fileUrl);
    if (!response.ok) {
      throw new Error('Could not download file bytes for offline storage.');
    }
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (response.body && contentLength > 0) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          const pct = Math.min(95, Math.round((received / contentLength) * 100));
          onProgress?.(pct);
        }
      }
      fileBlob = new Blob(chunks as BlobPart[], { type: material.mimeType || 'application/octet-stream' });
      sizeBytes = fileBlob.size;
    } else {
      fileBlob = await response.blob();
      sizeBytes = fileBlob.size;
    }
  }

  onProgress?.(100);
  const record: OfflineMaterialRecord = {
    id: material.id,
    material,
    fileBlob,
    cachedAt: new Date().toISOString(),
    sizeBytes,
  };

  const db = await openOfflineDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return record;
}

export async function getAllOfflineMaterials(): Promise<OfflineMaterialRecord[]> {
  try {
    const db = await openOfflineDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as OfflineMaterialRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineMaterial(id: string): Promise<void> {
  const db = await openOfflineDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function uploadFileWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ fileUrl: string; fileName: string; fileSizeBytes: number; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload);
        } else {
          reject(new Error(payload.error || 'Upload failed'));
        }
      } catch {
        reject(new Error('Unexpected server response during file upload.'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading file. Check your internet connection.'));
    };

    xhr.send(file);
  });
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Notes';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
