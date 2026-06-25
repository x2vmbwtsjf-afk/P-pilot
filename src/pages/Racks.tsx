import { useCallback, useEffect, useState } from 'react';
import { getRacks, putRack, deleteRack, getDevices, generateId } from '../db';
import type { Rack, Device, RackStatus } from '../types';
import { navigate } from '../App';
import { useToast } from '../components/Toast';
import RackRoom3D from '../components/RackRoom3D';
import RackDiagram from '../components/RackDiagram';

const RACK_STATUSES: RackStatus[] = ['active', 'maintenance', 'decommissioned'];
const MANUFACTURERS = ['APC', 'Rittal', 'Tripp Lite', 'Vertiv', 'Eaton', 'Middle Atlantic', 'Other'];

type View = 'list' | '3d' | 'detail';

export default function Racks() {
  const { toast } = useToast();
  const [racks, setRacks]     = useState<Rack[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]    = useState<Rack | null>(null);
  const [search, setSearch]      = useState('');
  const [view, setView]          = useState<View>('list');
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);

  const load = () => Promise.all([getRacks(), getDevices()]).then(([r, d]) => {
    setRacks(r ?? []);
    setDevices(d ?? []);
  });

  useEffect(() => { load(); }, []);

  const filtered = racks.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase()) ||
    (r.rackNumber ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm('Delete this rack? Devices in it will be unassigned.')) return;
    await deleteRack(id);
    toast('Rack deleted');
    load();
  }

  const handleRackSelect = useCallback((rack: Rack) => {
    setSelectedRack(rack);
    setView('detail');
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Racks</h1>
          <p className="page-sub">{racks.length} rack{racks.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <ViewToggle view={view} onChange={v => { setView(v); setSelectedRack(null); }} />
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <PlusIcon /> Add Rack
          </button>
        </div>
      </div>

      {/* ── 3D Room View ──────────────────────────────────────────────── */}
      {view === '3d' && (
        <RackRoom3D racks={racks} devices={devices} onRackSelect={handleRackSelect} />
      )}

      {/* ── Rack Detail (2D diagram) ───────────────────────────────────── */}
      {view === 'detail' && selectedRack && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <button
              className="btn-secondary"
              onClick={() => { setView('3d'); setSelectedRack(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
            >
              <BackIcon /> Back to Room
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {selectedRack.name}
              {selectedRack.rackNumber ? ` · #${selectedRack.rackNumber}` : ''}
              {selectedRack.location ? ` · ${selectedRack.location}` : ''}
            </span>
          </div>
          <RackDiagram
            rack={selectedRack}
            devices={devices.filter(d => d.rackId === selectedRack.id)}
          />
        </div>
      )}

      {/* ── List View ─────────────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <input
              className="input"
              placeholder="Search by name, number, or location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 340 }}
            />
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            {filtered.length === 0
              ? <Empty text={search ? 'No racks match your search' : 'No racks yet — add one!'} />
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Rack</th>
                        <th>Location</th>
                        <th>Size</th>
                        <th>Devices</th>
                        <th style={{ minWidth: 140 }}>Capacity</th>
                        <th>Status</th>
                        <th>Tech</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(rack => {
                        const rackDevices = devices.filter(d => d.rackId === rack.id);
                        const usedU = rackDevices.reduce((s, d) => s + (d.uHeight ?? 1), 0);
                        const pct   = rack.totalU > 0 ? Math.min(100, Math.round(usedU / rack.totalU * 100)) : 0;
                        const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#3b82f6';
                        const statusCls = rack.status === 'maintenance' ? 'badge-standby' : rack.status === 'decommissioned' ? 'badge-offline' : 'badge-online';
                        return (
                          <tr key={rack.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`rack/${rack.id}`)}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rack.name}</div>
                              {rack.rackNumber && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.1rem' }}>#{rack.rackNumber}</div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontSize: '0.8rem' }}>{rack.location}</div>
                              {rack.room && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{rack.room}{rack.row ? ` · Row ${rack.row}` : ''}</div>}
                            </td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 500 }}>{rack.totalU}U</td>
                            <td>{rackDevices.length}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div className="cap-bar-track" style={{ flex: 1 }}>
                                  <div className="cap-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                                </div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '2.5rem', textAlign: 'right' }}>{pct}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${statusCls}`}>{rack.status ?? 'active'}</span>
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rack.tech || '—'}</td>
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button className="btn-icon" onClick={() => { setEditing(rack); setShowModal(true); }}><EditIcon /></button>
                                <button className="btn-icon red" onClick={() => handleDelete(rack.id)}><TrashIcon /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </>
      )}

      {showModal && (
        <RackModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSave={async (rack) => {
            await putRack(rack);
            toast(editing ? 'Rack updated' : 'Rack created');
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function RackModal({ initial, onClose, onSave }: { initial: Rack | null; onClose: () => void; onSave: (r: Rack) => void }) {
  const [form, setForm] = useState({
    name:         initial?.name         ?? '',
    rackNumber:   initial?.rackNumber   ?? '',
    location:     initial?.location     ?? '',
    room:         initial?.room         ?? '',
    row:          initial?.row          ?? '',
    totalU:       initial?.totalU       ?? 42,
    manufacturer: initial?.manufacturer ?? '',
    powerAmps:    initial?.powerAmps?.toString() ?? '',
    tech:         initial?.tech         ?? '',
    status:       initial?.status       ?? 'active' as RackStatus,
    description:  initial?.description  ?? '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const now = Date.now();
    onSave({
      id: initial?.id ?? generateId(),
      name: form.name.trim(),
      rackNumber: form.rackNumber.trim() || undefined,
      location: form.location.trim(),
      room: form.room.trim() || undefined,
      row: form.row.trim() || undefined,
      totalU: Number(form.totalU) || 42,
      manufacturer: form.manufacturer.trim() || undefined,
      powerAmps: form.powerAmps ? Number(form.powerAmps) : undefined,
      tech: form.tech.trim() || undefined,
      status: form.status,
      description: form.description.trim() || undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{initial ? 'Edit Rack' : 'Add Rack'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <Field label="Rack Name *"><input className="input" required value={form.name} onChange={set('name')} placeholder="e.g. Rack A1" autoFocus /></Field>
              <Field label="Rack Number"><input className="input" value={form.rackNumber} onChange={set('rackNumber')} placeholder="e.g. A1" /></Field>
              <Field label="Location / Data Center"><input className="input" value={form.location} onChange={set('location')} placeholder="e.g. DC-West" /></Field>
              <Field label="Room"><input className="input" value={form.room} onChange={set('room')} placeholder="e.g. Server Room 1" /></Field>
              <Field label="Row"><input className="input" value={form.row} onChange={set('row')} placeholder="e.g. A" /></Field>
              <Field label="Total Units (U)"><input className="input" type="number" min={1} max={100} value={form.totalU} onChange={set('totalU')} /></Field>
              <Field label="Status">
                <select className="input" value={form.status} onChange={set('status')}>
                  {RACK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Manufacturer">
                <select className="input" value={form.manufacturer} onChange={set('manufacturer')}>
                  <option value="">None</option>
                  {MANUFACTURERS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Power (A)"><input className="input" type="number" min={0} step={0.1} value={form.powerAmps} onChange={set('powerAmps')} placeholder="e.g. 20" /></Field>
              <Field label="Tech (responsible)"><input className="input" value={form.tech} onChange={set('tech')} placeholder="Technician name" /></Field>
            </div>
            <Field label="Notes / Description"><textarea className="input" value={form.description} onChange={set('description')} rows={2} /></Field>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save Rack</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const btn = (v: View, label: React.ReactNode) => (
    <button
      onClick={() => onChange(v)}
      style={{
        padding: '0.35rem 0.7rem',
        fontSize: '0.78rem',
        fontWeight: 500,
        border: '1px solid var(--border)',
        borderRadius: '0.35rem',
        cursor: 'pointer',
        background: view === v ? 'var(--accent)' : 'var(--bg-card)',
        color: view === v ? '#fff' : 'var(--text-muted)',
        transition: 'background 0.15s, color 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}
    >{label}</button>
  );
  return (
    <div style={{ display: 'flex', gap: '0.3rem' }}>
      {btn('list', <><ListIcon /> List</>)}
      {btn('3d',   <><CubeIcon /> 3D Room</>)}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{text}</div>;
}
function PlusIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function EditIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>; }
function BackIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>; }
function ListIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function CubeIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
