import type { Rack, Device, Cable } from './types';

const DB_NAME = 'ppilot';
const DB_VERSION = 2;

let _db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      // Recreate stores on any version upgrade so seed runs fresh with updated fields
      for (const name of ['racks', 'devices', 'cables']) {
        if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
        db.createObjectStore(name, { keyPath: 'id' });
      }
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
export const getRacks   = () => tx<Rack[]>('racks', 'readonly', (s) => s.getAll());
export const getRack    = (id: string) => tx<Rack>('racks', 'readonly', (s) => s.get(id));
export const putRack    = (r: Rack) => tx<IDBValidKey>('racks', 'readwrite', (s) => s.put(r));
export const deleteRack = (id: string) => tx<undefined>('racks', 'readwrite', (s) => s.delete(id));

// ─── Devices ───
export const getDevices   = () => tx<Device[]>('devices', 'readonly', (s) => s.getAll());
export const getDevice    = (id: string) => tx<Device>('devices', 'readonly', (s) => s.get(id));
export const putDevice    = (d: Device) => tx<IDBValidKey>('devices', 'readwrite', (s) => s.put(d));
export const deleteDevice = (id: string) => tx<undefined>('devices', 'readwrite', (s) => s.delete(id));

// ─── Cables ───
export const getCables   = () => tx<Cable[]>('cables', 'readonly', (s) => s.getAll());
export const getCable    = (id: string) => tx<Cable>('cables', 'readonly', (s) => s.get(id));
export const putCable    = (c: Cable) => tx<IDBValidKey>('cables', 'readwrite', (s) => s.put(c));
export const deleteCable = (id: string) => tx<undefined>('cables', 'readwrite', (s) => s.delete(id));

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Demo seed (runs once when stores are empty) ───
export async function seedIfEmpty(): Promise<void> {
  const existing = await getRacks();
  if (existing && existing.length > 0) return;

  const now = Date.now();

  // ── 5 Racks ──────────────────────────────────────────────────────────────
  const racks: Rack[] = [
    {
      id: 'rack-a1', name: 'Rack A1', rackNumber: 'A1',
      location: 'Server Room 1', row: 'A', totalU: 42,
      manufacturer: 'APC', powerAmps: 20, tech: 'Alice Chen',
      status: 'active', description: 'Primary compute rack — ESXi hosts',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'rack-a2', name: 'Rack A2', rackNumber: 'A2',
      location: 'Server Room 1', row: 'A', totalU: 42,
      manufacturer: 'Rittal', powerAmps: 20, tech: 'Alice Chen',
      status: 'active', description: 'Secondary compute + storage rack',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'rack-b1', name: 'Rack B1', rackNumber: 'B1',
      location: 'Server Room 1', row: 'B', totalU: 42,
      manufacturer: 'Rittal', powerAmps: 16, tech: 'Bob Levi',
      status: 'active', description: 'Core network switches',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'rack-b2', name: 'Rack B2', rackNumber: 'B2',
      location: 'Server Room 1', row: 'B', totalU: 42,
      manufacturer: 'APC', powerAmps: 16, tech: 'Bob Levi',
      status: 'maintenance', description: 'Perimeter security + edge router — maintenance window',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'rack-c1', name: 'Rack C1', rackNumber: 'C1',
      location: 'Server Room 2', row: 'C', totalU: 24,
      manufacturer: 'Tripp Lite', powerAmps: 10, tech: 'Alice Chen',
      status: 'active', description: 'UPS & power distribution',
      createdAt: now, updatedAt: now,
    },
  ];

  // ── 12 Devices ───────────────────────────────────────────────────────────
  const devices: Device[] = [
    // ── Servers ──
    {
      id: 'dev-001', name: 'dell-r750-01', type: 'server', serial: 'DELL-SRV-001',
      rackId: 'rack-a1', uPosition: 1, uHeight: 2,
      status: 'online', manufacturer: 'Dell', model: 'PowerEdge R750',
      ip: '10.0.1.10', os: 'VMware ESXi 8.0',
      tech: 'Alice Chen',
      notes: 'Primary hypervisor — 8 VMs running',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'dev-002', name: 'hpe-dl380-01', type: 'server', serial: 'HPE-SRV-002',
      rackId: 'rack-a1', uPosition: 3, uHeight: 2,
      status: 'online', manufacturer: 'HPE', model: 'ProLiant DL380 Gen10',
      ip: '10.0.1.11', os: 'Ubuntu 22.04 LTS',
      tech: 'Alice Chen',
      notes: 'Docker host — prod microservices',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'dev-003', name: 'supermicro-k8s-01', type: 'server', serial: 'SMC-SRV-003',
      rackId: 'rack-a2', uPosition: 1, uHeight: 1,
      status: 'online', manufacturer: 'Supermicro', model: 'SYS-1028R-WTNRT',
      ip: '10.0.1.12', os: 'Rocky Linux 9',
      tech: 'Bob Levi',
      notes: 'Kubernetes worker node',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'dev-004', name: 'dell-r650-win', type: 'server', serial: 'DELL-SRV-004',
      rackId: 'rack-a2', uPosition: 2, uHeight: 1,
      status: 'standby', manufacturer: 'Dell', model: 'PowerEdge R650',
      ip: '10.0.1.13', os: 'Windows Server 2022',
      tech: 'Bob Levi',
      notes: 'Warm standby — promoted during maintenance windows',
      createdAt: now, updatedAt: now,
    },
    // ── Switches ──
    {
      id: 'dev-005', name: 'cisco-cat9300-core', type: 'switch', serial: 'CSC-SW-005',
      rackId: 'rack-b1', uPosition: 1, uHeight: 1,
      status: 'online', manufacturer: 'Cisco', model: 'Catalyst 9300-48P',
      managementIp: '10.0.2.1', ports: 48,
      vlan: 'VLAN 10 (mgmt), 20 (prod), 30 (storage)',
      tech: 'Bob Levi',
      notes: 'Core L3 switch — default gateway for all VLANs',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'dev-006', name: 'cisco-nexus-9300', type: 'switch', serial: 'CSC-NX-006',
      rackId: 'rack-b1', uPosition: 2, uHeight: 2,
      status: 'online', manufacturer: 'Cisco', model: 'Nexus 93180YC-FX',
      managementIp: '10.0.2.10', ports: 48,
      vlan: 'Trunk — VLAN 10,20,30,40',
      tech: 'Bob Levi',
      notes: '10/25G spine for East-West traffic',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'dev-007', name: 'juniper-ex4300-01', type: 'switch', serial: 'JNP-SW-007',
      rackId: 'rack-b1', uPosition: 4, uHeight: 1,
      status: 'offline', manufacturer: 'Juniper', model: 'EX4300-48T',
      managementIp: '10.0.2.2', ports: 24,
      vlan: 'VLAN 10,20',
      tech: 'Bob Levi',
      notes: 'Offline — pending RMA replacement',
      createdAt: now, updatedAt: now,
    },
    // ── Firewall ──
    {
      id: 'dev-008', name: 'pa-3220-fw', type: 'firewall', serial: 'PAN-FW-008',
      rackId: 'rack-b2', uPosition: 1, uHeight: 1,
      status: 'online', manufacturer: 'Palo Alto', model: 'PA-3220',
      managementIp: '10.0.2.254', ports: 8,
      vlan: 'Untrust / Trust / DMZ',
      tech: 'Bob Levi',
      notes: 'NGFW — Panorama managed',
      createdAt: now, updatedAt: now,
    },
    // ── Router ──
    {
      id: 'dev-009', name: 'cisco-isr4451-wan', type: 'router', serial: 'CSC-RT-009',
      rackId: 'rack-b2', uPosition: 2, uHeight: 2,
      status: 'online', manufacturer: 'Cisco', model: 'ISR 4451-X',
      managementIp: '10.0.2.253', ports: 4,
      vlan: 'WAN / LAN / MGMT',
      tech: 'Bob Levi',
      notes: 'Internet edge router — BGP to upstream ISP',
      createdAt: now, updatedAt: now,
    },
    // ── UPS ──
    {
      id: 'dev-010', name: 'apc-ups-3000-a', type: 'ups', serial: 'APC-UPS-010',
      rackId: 'rack-c1', uPosition: 40, uHeight: 3,
      status: 'online', manufacturer: 'APC', model: 'Smart-UPS 3000VA LCD',
      capacityVA: 3000, batteryReplaced: '2024-01-15',
      tech: 'Alice Chen',
      notes: 'Protects Rack A1 + A2',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'dev-011', name: 'apc-ups-2200-b', type: 'ups', serial: 'APC-UPS-011',
      rackId: 'rack-c1', uPosition: 37, uHeight: 2,
      status: 'online', manufacturer: 'APC', model: 'Smart-UPS 2200VA',
      capacityVA: 2200, batteryReplaced: '2024-06-01',
      tech: 'Alice Chen',
      notes: 'Protects Rack B1 + B2',
      createdAt: now, updatedAt: now,
    },
    // ── Storage ──
    {
      id: 'dev-012', name: 'dell-powervault-me5', type: 'storage', serial: 'DELL-STG-012',
      rackId: 'rack-a2', uPosition: 8, uHeight: 2,
      status: 'online', manufacturer: 'Dell', model: 'PowerVault ME5012',
      ip: '10.0.1.20',
      tech: 'Alice Chen',
      notes: '12×8TB SAS — iSCSI target for ESXi cluster',
      createdAt: now, updatedAt: now,
    },
  ];

  // ── 10 Cables ─────────────────────────────────────────────────────────────
  const cables: Cable[] = [
    {
      id: 'cbl-001', label: 'CAT6 Patch #1', cableNumber: 'CBL-001',
      type: 'cat6', lengthM: 1,
      nearEnd: 'dell-r750-01 : NIC1',
      farEnd:  'cisco-cat9300-core : Gi1/0/1',
      status: 'active', color: 'blue', tech: 'Alice Chen',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'cbl-002', label: 'CAT6 Patch #2', cableNumber: 'CBL-002',
      type: 'cat6', lengthM: 1,
      nearEnd: 'hpe-dl380-01 : NIC1',
      farEnd:  'cisco-cat9300-core : Gi1/0/2',
      status: 'active', color: 'blue', tech: 'Alice Chen',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'cbl-003', label: 'CAT6A Patch #1', cableNumber: 'CBL-003',
      type: 'cat6a', lengthM: 2,
      nearEnd: 'supermicro-k8s-01 : NIC1',
      farEnd:  'cisco-cat9300-core : Gi1/0/3',
      status: 'active', color: 'green', tech: 'Bob Levi',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'cbl-004', label: 'CAT6A Patch #2', cableNumber: 'CBL-004',
      type: 'cat6a', lengthM: 1.5,
      nearEnd: 'dell-r650-win : NIC1',
      farEnd:  'cisco-cat9300-core : Gi1/0/4',
      status: 'spare', color: 'green', tech: 'Bob Levi',
      notes: 'Standby patch — connected but not active',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'cbl-005', label: 'Fiber OM4 #1 (Core uplink)', cableNumber: 'CBL-005',
      type: 'fiber-om4', lengthM: 3,
      nearEnd: 'cisco-cat9300-core : SFP28-1',
      farEnd:  'cisco-nexus-9300 : Eth1/1',
      status: 'active', color: 'orange', tech: 'Bob Levi',
      notes: '25G uplink — spine/leaf',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'cbl-006', label: 'Fiber OM4 #2 (Spine-Leaf)', cableNumber: 'CBL-006',
      type: 'fiber-om4', lengthM: 3,
      nearEnd: 'cisco-nexus-9300 : Eth1/2',
      farEnd:  'juniper-ex4300-01 : xe-0/0/0',
      status: 'active', color: 'orange', tech: 'Bob Levi',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'cbl-007', label: 'DAC SFP+ #1 (FW-SW)', cableNumber: 'CBL-007',
      type: 'dac', lengthM: 1,
      nearEnd: 'pa-3220-fw : SFP+ 1',
      farEnd:  'juniper-ex4300-01 : xe-0/0/1',
      status: 'faulty', color: 'gray', tech: 'Bob Levi',
      notes: 'Intermittent CRC errors — scheduled for replacement',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'cbl-008', label: 'CAT6A WAN link', cableNumber: 'CBL-008',
      type: 'cat6a', lengthM: 5,
      nearEnd: 'cisco-isr4451-wan : Gi0/0/0',
      farEnd:  'pa-3220-fw : Untrust Eth1/1',
      status: 'active', color: 'red', tech: 'Bob Levi',
      notes: 'WAN-side link — ISP handoff',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'cbl-009', label: 'Power C13 #1', cableNumber: 'CBL-009',
      type: 'power', lengthM: 1.5,
      nearEnd: 'dell-r750-01 : PSU1',
      farEnd:  'apc-ups-3000-a : Output1',
      status: 'active', color: 'black', tech: 'Alice Chen',
      createdAt: now, updatedAt: now,
    },
    {
      id: 'cbl-010', label: 'Power C13 #2', cableNumber: 'CBL-010',
      type: 'power', lengthM: 1.5,
      nearEnd: 'hpe-dl380-01 : PSU1',
      farEnd:  'apc-ups-3000-a : Output2',
      status: 'active', color: 'black', tech: 'Alice Chen',
      createdAt: now, updatedAt: now,
    },
  ];

  await Promise.all([
    ...racks.map(putRack),
    ...devices.map(putDevice),
    ...cables.map(putCable),
  ]);
}
