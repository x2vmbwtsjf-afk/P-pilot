import { useEffect, useState } from 'react';
import { getDevices, putDevice, deleteDevice, getRacks, generateId } from '../db';
import type { Device, Rack, DeviceType, DeviceStatus } from '../types';
import { navigate } from '../App';
import { useToast } from '../components/Toast';

const DEVICE_TYPES: DeviceType[] = ['server','switch','router','firewall','storage','pdu','patch-panel','ups','other'];
const STATUSES: DeviceStatus[]   = ['online','offline','standby'];

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
    const matchQ = !q || d.name.toLowerCase().includes(q) || d.serial.toLowerCase().includes(q) || (d.ip ?? '').includes(q) || (d.manufacturer ?? '').toLowerCase().includes(q);
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

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Devices</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{devices.length} device{devices.length !== 1 ? 's' : ''} in inventory</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
          <PlusIcon /> Add Device
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search name, serial, IP, manufacturer…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Types</option>
          {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || filterStatus || filterType) && (
          <button className="btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); }}>
            Clear
          </button>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {search || filterStatus || filterType ? 'No devices match filters' : 'No devices yet — add one!'}
            </div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Serial</th><th>Rack</th><th>U Pos</th><th>IP</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(d => (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`device/${d.id}`)}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</td>
                      <td><span className="badge badge-blue">{d.type}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{d.serial || '—'}</td>
                      <td>{rackName(d.rackId)}</td>
                      <td>{d.uPosition ? `U${d.uPosition}` : '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{d.ip || '—'}</td>
                      <td><StatusBadge status={d.status} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button className="btn-icon" onClick={() => { setEditing(d); setShowModal(true); }}><EditIcon /></button>
                          <button className="btn-icon" style={{ color: '#ff4d4d', borderColor: 'rgba(255,77,77,0.3)' }} onClick={() => handleDelete(d.id)}><TrashIcon /></button>
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
    name:         initial?.name         ?? '',
    type:         initial?.type         ?? 'server' as DeviceType,
    serial:       initial?.serial       ?? '',
    rackId:       initial?.rackId       ?? '',
    uPosition:    initial?.uPosition?.toString() ?? '',
    uHeight:      initial?.uHeight      ?? 1,
    status:       initial?.status       ?? 'online' as DeviceStatus,
    ip:           initial?.ip           ?? '',
    manufacturer: initial?.manufacturer ?? '',
    model:        initial?.model        ?? '',
    notes:        initial?.notes        ?? '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const now = Date.now();
    onSave({
      id: initial?.id ?? generateId(),
      name: form.name.trim(), type: form.type, serial: form.serial.trim(),
      rackId: form.rackId || undefined,
      uPosition: form.uPosition ? Number(form.uPosition) : undefined,
      uHeight: Number(form.uHeight) || 1,
      status: form.status,
      ip: form.ip.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
      model: form.model.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: initial?.createdAt ?? now, updatedAt: now,
    });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.25rem' }}>{initial ? 'Edit Device' : 'Add Device'}</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
            <Field label="Rack">
              <select className="input" value={form.rackId} onChange={set('rackId')}>
                <option value="">None</option>
                {racks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="U Position"><input className="input" type="number" min={1} value={form.uPosition} onChange={set('uPosition')} placeholder="e.g. 10" /></Field>
            <Field label="U Height"><input className="input" type="number" min={1} max={20} value={form.uHeight} onChange={set('uHeight')} /></Field>
            <Field label="IP Address"><input className="input" value={form.ip} onChange={set('ip')} placeholder="192.168.1.10" /></Field>
            <Field label="Manufacturer"><input className="input" value={form.manufacturer} onChange={set('manufacturer')} placeholder="Dell, HPE…" /></Field>
            <Field label="Model"><input className="input" value={form.model} onChange={set('model')} placeholder="PowerEdge R750" /></Field>
          </div>
          <Field label="Notes"><textarea className="input" value={form.notes} onChange={set('notes')} rows={2} style={{ resize: 'vertical' }} /></Field>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
function StatusBadge({ status }: { status: string }) {
  const cls = status === 'online' ? 'badge-online' : status === 'offline' ? 'badge-offline' : 'badge-standby';
  return <span className={`badge ${cls}`}>{status}</span>;
}
function PlusIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function EditIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>; }
