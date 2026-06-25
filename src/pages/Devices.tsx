import { useEffect, useState } from 'react';
import { getDevices, putDevice, deleteDevice, getRacks, generateId } from '../db';
import type { Device, Rack, DeviceType, DeviceStatus } from '../types';
import { navigate } from '../App';
import { useToast } from '../components/Toast';

const DEVICE_TYPES: DeviceType[] = ['server','switch','router','firewall','storage','pdu','patch-panel','ups','other'];
const STATUSES: DeviceStatus[]   = ['online','offline','standby','maintenance'];
const NETWORK_TYPES = new Set(['switch','router','firewall']);

type DeviceGroup = 'server' | 'network' | 'ups' | 'other';
function getGroup(type: DeviceType): DeviceGroup {
  if (type === 'server') return 'server';
  if (NETWORK_TYPES.has(type)) return 'network';
  if (type === 'ups') return 'ups';
  return 'other';
}

export default function Devices() {
  const { toast } = useToast();
  const [devices, setDevices]   = useState<Device[]>([]);
  const [racks, setRacks]       = useState<Rack[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]    = useState<Device | null>(null);
  const [search, setSearch]      = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]     = useState('');

  const load = () => Promise.all([getDevices(), getRacks()]).then(([d, r]) => {
    setDevices(d ?? []);
    setRacks(r ?? []);
  });

  useEffect(() => { load(); }, []);

  const filtered = devices.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.name.toLowerCase().includes(q) || d.serial.toLowerCase().includes(q) ||
      (d.ip ?? '').includes(q) || (d.managementIp ?? '').includes(q) ||
      (d.manufacturer ?? '').toLowerCase().includes(q) || (d.tech ?? '').toLowerCase().includes(q);
    return matchQ && (!filterStatus || d.status === filterStatus) && (!filterType || d.type === filterType);
  });

  async function handleDelete(id: string) {
    if (!confirm('Delete this device?')) return;
    await deleteDevice(id);
    toast('Device deleted');
    load();
  }

  function rackName(id?: string) {
    return racks.find(r => r.id === id)?.name ?? '—';
  }

  function subInfo(d: Device): string {
    const g = getGroup(d.type);
    if (g === 'server')  return [d.ip, d.os].filter(Boolean).join(' · ') || '—';
    if (g === 'network') return [d.managementIp, d.ports ? `${d.ports}p` : null].filter(Boolean).join(' · ') || '—';
    if (g === 'ups')     return d.capacityVA ? `${d.capacityVA}VA` : '—';
    return d.ip ?? '—';
  }

  const hasFilters = search || filterStatus || filterType;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-sub">{devices.length} device{devices.length !== 1 ? 's' : ''} in inventory</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
          <PlusIcon /> Add Device
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          className="input"
          placeholder="Search name, serial, IP…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Types</option>
          {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {hasFilters && (
          <button className="btn-secondary" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); }}>
            Clear
          </button>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0
          ? <Empty text={hasFilters ? 'No devices match filters' : 'No devices yet — add one!'} />
          : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Serial</th>
                    <th>Rack</th>
                    <th>U Pos</th>
                    <th>Info</th>
                    <th>Tech</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`device/${d.id}`)}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
                      <td><span className="badge badge-blue">{d.type}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{d.serial || '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{rackName(d.rackId)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{d.uPosition ? `U${d.uPosition}` : '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subInfo(d)}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.tech || '—'}</td>
                      <td><StatusBadge status={d.status} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button className="btn-icon" onClick={() => { setEditing(d); setShowModal(true); }}><EditIcon /></button>
                          <button className="btn-icon red" onClick={() => handleDelete(d.id)}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {showModal && (
        <DeviceModal
          initial={editing}
          racks={racks}
          onClose={() => setShowModal(false)}
          onSave={async (dev) => {
            await putDevice(dev);
            toast(editing ? 'Device updated' : 'Device created');
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function DeviceModal({ initial, racks, onClose, onSave }: { initial: Device | null; racks: Rack[]; onClose: () => void; onSave: (d: Device) => void }) {
  const [form, setForm] = useState({
    name:                initial?.name            ?? '',
    hostname:            initial?.hostname        ?? '',
    type:                initial?.type            ?? 'server' as DeviceType,
    serial:              initial?.serial          ?? '',
    rackId:              initial?.rackId          ?? '',
    uPosition:           initial?.uPosition?.toString() ?? '',
    uSize:               (initial?.uSize ?? initial?.uHeight ?? 1).toString(),
    status:              initial?.status          ?? 'online' as DeviceStatus,
    manufacturer:        initial?.manufacturer    ?? '',
    model:               initial?.model           ?? '',
    tech:                initial?.tech            ?? '',
    ipAddress:           initial?.ipAddress ?? initial?.ip ?? '',
    os:                  initial?.os              ?? '',
    managementIp:        initial?.managementIp    ?? '',
    ports:               initial?.ports?.toString()  ?? '',
    vlan:                initial?.vlan            ?? '',
    capacityVA:          initial?.capacityVA?.toString() ?? '',
    batteryLastReplaced: initial?.batteryLastReplaced ?? initial?.batteryReplaced ?? '',
    category:            initial?.category        ?? '',
    notes:               initial?.notes           ?? '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const group = getGroup(form.type as DeviceType);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const now = Date.now();
    const ipVal = (group === 'server' || group === 'other') ? (form.ipAddress.trim() || undefined) : undefined;
    onSave({
      id: initial?.id ?? generateId(),
      name: form.name.trim(),
      hostname:     group === 'server' ? (form.hostname.trim() || undefined) : undefined,
      type: form.type as DeviceType,
      serial: form.serial.trim(),
      rackId: form.rackId || undefined,
      uPosition: form.uPosition ? Number(form.uPosition) : undefined,
      uHeight: Number(form.uSize) || 1,
      uSize:   Number(form.uSize) || 1,
      status: form.status as DeviceStatus,
      manufacturer: form.manufacturer.trim() || undefined,
      model:        form.model.trim()        || undefined,
      tech:         form.tech.trim()         || undefined,
      ip:        ipVal,
      ipAddress: ipVal,
      os:           group === 'server'  ? (form.os.trim()              || undefined) : undefined,
      managementIp: group === 'network' ? (form.managementIp.trim()   || undefined) : undefined,
      ports:        group === 'network' ? (Number(form.ports) || undefined) : undefined,
      vlan:         group === 'network' ? (form.vlan.trim()            || undefined) : undefined,
      capacityVA:   group === 'ups'     ? (Number(form.capacityVA) || undefined) : undefined,
      batteryReplaced:     group === 'ups' ? (form.batteryLastReplaced.trim() || undefined) : undefined,
      batteryLastReplaced: group === 'ups' ? (form.batteryLastReplaced.trim() || undefined) : undefined,
      category:     group === 'other'   ? (form.category.trim()        || undefined) : undefined,
      notes:        form.notes.trim()   || undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{initial ? 'Edit Device' : 'Add Device'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <Field label="Name *"><input className="input" required value={form.name} onChange={set('name')} placeholder="e.g. web-srv-01" autoFocus /></Field>
              <Field label="Type">
                <select className="input" value={form.type} onChange={set('type')}>
                  {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Serial Number"><input className="input" value={form.serial} onChange={set('serial')} placeholder="SN-XXXX" /></Field>
              <Field label="Status">
                <select className="input" value={form.status} onChange={set('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Manufacturer"><input className="input" value={form.manufacturer} onChange={set('manufacturer')} placeholder="Dell, HPE, Cisco…" /></Field>
              <Field label="Model"><input className="input" value={form.model} onChange={set('model')} placeholder="PowerEdge R750" /></Field>
              <Field label="Rack">
                <select className="input" value={form.rackId} onChange={set('rackId')}>
                  <option value="">None</option>
                  {racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
              <Field label="U Position"><input className="input" type="number" min={1} value={form.uPosition} onChange={set('uPosition')} placeholder="e.g. 10" /></Field>
              <Field label="U Size"><input className="input" type="number" min={1} max={20} value={form.uSize} onChange={set('uSize')} /></Field>
              <Field label="Tech (responsible)"><input className="input" value={form.tech} onChange={set('tech')} placeholder="Technician name" /></Field>

              {group === 'server' && <>
                <Field label="Hostname"><input className="input" value={form.hostname} onChange={set('hostname')} placeholder="e.g. web-srv-01" /></Field>
                <Field label="IP Address"><input className="input" value={form.ipAddress} onChange={set('ipAddress')} placeholder="10.0.1.10" /></Field>
                <Field label="OS" style={{ gridColumn: 'span 2' }}><input className="input" value={form.os} onChange={set('os')} placeholder="Ubuntu 22.04, ESXi 8…" /></Field>
              </>}

              {group === 'network' && <>
                <Field label="Management IP"><input className="input" value={form.managementIp} onChange={set('managementIp')} placeholder="10.0.2.1" /></Field>
                <Field label="Number of Ports"><input className="input" type="number" min={1} value={form.ports} onChange={set('ports')} placeholder="e.g. 48" /></Field>
                <Field label="VLAN / Segment" style={{ gridColumn: 'span 2' }}><input className="input" value={form.vlan} onChange={set('vlan')} placeholder="VLAN 10, 20, 30 / Core" /></Field>
              </>}

              {group === 'ups' && <>
                <Field label="Capacity (VA)"><input className="input" type="number" min={0} value={form.capacityVA} onChange={set('capacityVA')} placeholder="e.g. 3000" /></Field>
                <Field label="Battery Last Replaced"><input className="input" type="date" value={form.batteryLastReplaced} onChange={set('batteryLastReplaced')} /></Field>
              </>}

              {group === 'other' && <>
                <Field label="Category / Type"><input className="input" value={form.category} onChange={set('category')} placeholder="e.g. KVM, PDU…" /></Field>
                <Field label="IP / Location"><input className="input" value={form.ipAddress} onChange={set('ipAddress')} placeholder="IP or physical location" /></Field>
              </>}
            </div>
            <Field label="Notes"><textarea className="input" value={form.notes} onChange={set('notes')} rows={2} /></Field>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Device</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style}><label className="label">{label}</label>{children}</div>;
}
function StatusBadge({ status }: { status: string }) {
  const cls = status === 'online' ? 'badge-online' : status === 'offline' ? 'badge-offline' : 'badge-standby';
  return <span className={`badge ${cls}`}>{status}</span>;
}
function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{text}</div>;
}
function PlusIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function EditIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>; }
