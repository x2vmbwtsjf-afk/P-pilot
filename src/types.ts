export type DeviceStatus = 'online' | 'offline' | 'standby' | 'maintenance';
export type RackStatus   = 'active' | 'maintenance' | 'decommissioned';
export type CableStatus  = 'active' | 'spare' | 'faulty';
export type DeviceType   = 'server' | 'switch' | 'router' | 'firewall' | 'storage' | 'pdu' | 'patch-panel' | 'ups' | 'other';
export type CableType    = 'cat6' | 'cat6a' | 'cat7' | 'fiber-sm' | 'fiber-mm' | 'fiber-om4' | 'dac' | 'aoc' | 'power' | 'other';

export interface Rack {
  id: string;
  name: string;
  location: string;
  room?: string;
  totalU: number;
  rackNumber?: string;
  row?: string;
  manufacturer?: string;
  powerAmps?: number;
  tech?: string;
  status?: RackStatus;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Device {
  id: string;
  name: string;
  hostname?: string;
  type: DeviceType;
  serial: string;
  rackId?: string;
  uPosition?: number;
  uHeight?: number;
  uSize?: number;
  status: DeviceStatus;
  ip?: string;
  ipAddress?: string;
  managementIp?: string;
  manufacturer?: string;
  model?: string;
  os?: string;
  tech?: string;
  ports?: number;
  vlan?: string;
  capacityVA?: number;
  batteryReplaced?: string;
  batteryLastReplaced?: string;
  category?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Cable {
  id: string;
  label: string;
  labelName?: string;
  type: CableType;
  lengthM: number;
  nearEnd: string;
  farEnd: string;
  /** @deprecated */ fromPort?: string;
  /** @deprecated */ toPort?: string;
  status: CableStatus;
  color?: string;
  tech?: string;
  cableNumber?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type ItemKind = 'rack' | 'device' | 'cable';
export type AnyItem = Rack | Device | Cable;
