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
      if (!db.objectStoreNames.contains('racks'))   db.createObjectStore('racks',   { keyPath: 'id' });
      if (!db.objectStoreNames.contains('devices')) db.createObjectStore('devices', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('cables'))  db.createObjectStore('cables',  { keyPath: 'id' });
    };
    req.onsuccess = (e) => { _db = (e.target as IDBOpenDBRequest).result; resolve(_db!); };
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) => new Promise<T>((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const r = fn(s);
      r.onsuccess = () => resolve(r.result);
      r.onerror  = () => reject(r.error);
    })
  );
}

// ─── Racks ───
export const getRacks    = () => tx<Rack[]>('racks', 'readonly',  (s) => s.getAll());
export const getRack     = (id: string) => tx<Rack>('racks', 'readonly', (s) => s.get(id));
export const putRack     = (r: Rack)    => tx<IDBValidKey>('racks', 'readwrite', (s) => s.put(r));
export const deleteRack  = (id: string) => tx<undefined>('racks', 'readwrite', (s) => s.delete(id));

// ─── Devices ───
export const getDevices    = () => tx<Device[]>('devices', 'readonly',  (s) => s.getAll());
export const getDevice     = (id: string) => tx<Device>('devices', 'readonly', (s) => s.get(id));
export const putDevice     = (d: Device)  => tx<IDBValidKey>('devices', 'readwrite', (s) => s.put(d));
export const deleteDevice  = (id: string) => tx<undefined>('devices', 'readwrite', (s) => s.delete(id));

// ─── Cables ───
export const getCables    = () => tx<Cable[]>('cables', 'readonly',  (s) => s.getAll());
export const getCable     = (id: string) => tx<Cable>('cables', 'readonly', (s) => s.get(id));
export const putCable     = (c: Cable)   => tx<IDBValidKey>('cables', 'readwrite', (s) => s.put(c));
export const deleteCable  = (id: string) => tx<undefined>('cables', 'readwrite', (s) => s.delete(id));

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Demo seed (runs once when DB is empty) ───
export async function seedIfEmpty(): Promise<void> {
  const existing = await getRacks();
  if (existing && existing.length > 0) return;

  const now = Date.now();
  const id = (s: string) => s; // stable IDs for cross-references

  const racks: Rack[] = [
    { id: 'rack-a1', name: 'Rack A1', location: 'Row 1', totalU: 42, description: 'Primary compute rack', createdAt: now, updatedAt: now },
    { id: 'rack-b2', name: 'Rack B2', location: 'Row 2', totalU: 42, description: 'Network & security rack', createdAt: now, updatedAt: now },
    { id: 'rack-c3', name: 'Rack C3', location: 'Row 3', totalU: 24, description: 'UPS & power distribution', createdAt: now, updatedAt: now },
  ];

  const devices: Device[] = [
    { id: 'dev-001', name: 'Dell PowerEdge R750',  type: 'server',   serial: 'DELL-001', rackId: 'rack-a1', uPosition: 1,  uHeight: 2, status: 'online',  manufacturer: 'Dell',     model: 'PowerEdge R750',  ip: '10.0.1.10', createdAt: now, updatedAt: now },
    { id: 'dev-002', name: 'HPE ProLiant DL380',   type: 'server',   serial: 'HPE-002',  rackId: 'rack-a1', uPosition: 3,  uHeight: 2, status: 'online',  manufacturer: 'HPE',      model: 'ProLiant DL380',  ip: '10.0.1.11', createdAt: now, updatedAt: now },
    { id: 'dev-003', name: 'Cisco Catalyst 9300',  type: 'switch',   serial: 'CSC-003',  rackId: 'rack-b2', uPosition: 1,  uHeight: 1, status: 'online',  manufacturer: 'Cisco',    model: 'Catalyst 9300',   ip: '10.0.2.1',  createdAt: now, updatedAt: now },
    { id: 'dev-004', name: 'Juniper EX4300',       type: 'switch',   serial: 'JNP-004',  rackId: 'rack-b2', uPosition: 2,  uHeight: 1, status: 'offline', manufacturer: 'Juniper',  model: 'EX4300',          ip: '10.0.2.2',  createdAt: now, updatedAt: now },
    { id: 'dev-005', name: 'APC Smart-UPS 3000',   type: 'ups',      serial: 'APC-005',  rackId: 'rack-c3', uPosition: 40, uHeight: 3, status: 'online',  manufacturer: 'APC',      model: 'Smart-UPS 3000',  ip: '10.0.3.1',  createdAt: now, updatedAt: now },
    { id: 'dev-006', name: 'Palo Alto PA-3220',    type: 'firewall', serial: 'PAN-006',  rackId: 'rack-b2', uPosition: 3,  uHeight: 1, status: 'online',  manufacturer: 'Palo Alto', model: 'PA-3220',         ip: '10.0.2.254', createdAt: now, updatedAt: now },
  ];

  id('unused'); // suppress lint

  const cables: Cable[] = [
    { id: 'cbl-001', label: 'CAT6 Patch #1',  type: 'cat6',     lengthM: 1,   fromPort: 'Dell PowerEdge R750 : NIC1',    toPort: 'Cisco Catalyst 9300 : Gi1/0/1', status: 'active', color: 'blue',   createdAt: now, updatedAt: now },
    { id: 'cbl-002', label: 'Fiber OM4 #1',   type: 'fiber-om4',lengthM: 3,   fromPort: 'Cisco Catalyst 9300 : SFP1',    toPort: 'Juniper EX4300 : xe-0/0/0',     status: 'active', color: 'orange', createdAt: now, updatedAt: now },
    { id: 'cbl-003', label: 'CAT6A Patch #1', type: 'cat6a',    lengthM: 2,   fromPort: 'HPE ProLiant DL380 : NIC1',     toPort: 'Cisco Catalyst 9300 : Gi1/0/2', status: 'active', color: 'green',  createdAt: now, updatedAt: now },
    { id: 'cbl-004', label: 'Power C13 #1',   type: 'power',    lengthM: 1.5, fromPort: 'Dell PowerEdge R750 : PSU1',    toPort: 'APC Smart-UPS 3000 : Output1',  status: 'active', color: 'black',  createdAt: now, updatedAt: now },
    { id: 'cbl-005', label: 'DAC SFP+ #1',    type: 'dac',      lengthM: 1,   fromPort: 'Palo Alto PA-3220 : SFP+ 1',   toPort: 'Juniper EX4300 : xe-0/0/1',     status: 'faulty', color: 'gray',   createdAt: now, updatedAt: now },
  ];

  await Promise.all([
    ...racks.map(putRack),
    ...devices.map(putDevice),
    ...cables.map(putCable),
  ]);
}
