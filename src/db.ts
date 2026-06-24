import type { Rack, Device, Cable } from './types';

const DB_NAME = 'ppilot';
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('racks')) {
        db.createObjectStore('racks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('devices')) {
        db.createObjectStore('devices', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cables')) {
        db.createObjectStore('cables', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db!);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const s = t.objectStore(store);
        const r = fn(s);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      })
  );
}

// ─── Racks ───
export const getRacks = () => tx<Rack[]>('racks', 'readonly', (s) => s.getAll());
export const getRack = (id: string) => tx<Rack>('racks', 'readonly', (s) => s.get(id));
export const putRack = (r: Rack) => tx<IDBValidKey>('racks', 'readwrite', (s) => s.put(r));
export const deleteRack = (id: string) => tx<undefined>('racks', 'readwrite', (s) => s.delete(id));

// ─── Devices ───
export const getDevices = () => tx<Device[]>('devices', 'readonly', (s) => s.getAll());
export const getDevice = (id: string) => tx<Device>('devices', 'readonly', (s) => s.get(id));
export const putDevice = (d: Device) => tx<IDBValidKey>('devices', 'readwrite', (s) => s.put(d));
export const deleteDevice = (id: string) => tx<undefined>('devices', 'readwrite', (s) => s.delete(id));

// ─── Cables ───
export const getCables = () => tx<Cable[]>('cables', 'readonly', (s) => s.getAll());
export const getCable = (id: string) => tx<Cable>('cables', 'readonly', (s) => s.get(id));
export const putCable = (c: Cable) => tx<IDBValidKey>('cables', 'readwrite', (s) => s.put(c));
export const deleteCable = (id: string) => tx<undefined>('cables', 'readwrite', (s) => s.delete(id));

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
