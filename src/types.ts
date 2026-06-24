export type DeviceStatus = 'online' | 'offline' | 'standby';
export type CableStatus = 'active' | 'spare' | 'faulty';
export type DeviceType = 'server' | 'switch' | 'router' | 'storage' | 'pdu' | 'patch-panel' | 'ups' | 'other';
export type CableType = 'cat6' | 'cat6a' | 'cat7' | 'fiber-sm' | 'fiber-mm' | 'dac' | 'aoc' | 'power' | 'other';

export interface Rack {
  id: string;
  name: string;
  location: string;
  totalU: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  serial: string;
  rackId?: string;
  uPosition?: number;
  uHeight?: number;
  status: DeviceStatus;
  ip?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Cable {
  id: string;
  label: string;
  type: CableType;
  lengthM: number;
  fromPort: string;
  toPort: string;
  status: CableStatus;
  color?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type ItemKind = 'rack' | 'device' | 'cable';
export type AnyItem = Rack | Device | Cable;
