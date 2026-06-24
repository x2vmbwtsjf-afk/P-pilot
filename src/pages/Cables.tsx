import { useEffect, useState } from 'react';
import { getCables, putCable, deleteCable, generateId } from '../db';
import type { Cable, CableType, CableStatus } from '../types';
import { navigate } from '../App';

const CABLE_TYPES: CableType[] = ['cat6','cat6a','cat7','fiber-sm','fiber-mm','dac','aoc','power','other'];
const STATUSES: CableStatus[] = ['active','spare','faulty'];

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6', red: '#ef4444', green: '#22c55e', yellow: '#eab308',
  orange: '#f97316', purple: '#a855f7', white: '#e2e8f0', black: '#374151', gray: '#6b7280',
};

export default function Cables() {
  const [cables, setCables] = useState<Cable[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Cable | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => getCables().then(c => setCables(c ?? []));
  useEffect(() => { load(); }, []);

  const filtered = cables.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.label.toLowerCase().includes(q) || c.fromPort.toLowerCase().includes(q) || c.toPort.toLowerCase().includes(q);
    return matchQ && (!filterStatus || c.status === filterStatus);
  });

  async function handleDelete(id: string) {
    if (!confirm('Delete this cable?')) return;
    await deleteCable(id);
    load();
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Cables</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{cables.length} cable{cables.length !== 1 ? 's' : ''} in inventory</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
          <PlusIcon /> Add Cable
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search label, from, to..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {search || filterStatus ? 'No cables match filters' : 'No cables yet — add one!'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Length</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Color</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`cable/${c.id}`)}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.label}</td>
                    <td><span className="badge badge-blue">{c.type}</span></td>
                    <td>{c.lengthM}m</td>
                    <td style={{ fontSize: '0.8rem' }}>{c.fromPort}</td>
                    <td style={{ fontSize: '0.8rem' }}>{c.toPort}</td>
                    <td>
                      {c.color ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLOR_MAP[c.color] ?? c.color, border: '1px solid rgba(255,255,255,0.2)', display: 'inline-block' }} />
                          <span style={{ fontSize: '0.75rem' }}>{c.color}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td><CableStatusBadge status={c.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button className="btn-icon" onClick={() => { setEditing(c); setShowModal(true); }}><EditIcon /></button>
                        <button className="btn-icon" style={{ color: '#ff4d4d', borderColor: 'rgba(255,77,77,0.3)' }} onClick={() => handleDelete(c.id)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <CableModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSave={async (cable) => {
            await putCable(cable);
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CableModal({ initial, onClose, onSave }: { initial: Cable | null; onClose: () => void; onSave: (c: Cable) => void }) {
  const [form, setForm] = useState({
    label: initial?.label ?? '',
    type: initial?.type ?? 'cat6' as CableType,
    lengthM: initial?.lengthM ?? 1,
    fromPort: initial?.fromPort ?? '',
    toPort: initial?.toPort ?? '',
    status: initial?.status ?? 'active' as CableStatus,
    color: initial?.color ?? '',
    notes: initial?.notes ?? '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) return;
    const now = Date.now();
    onSave({
      id: initial?.id ?? generateId(),
      label: form.label.trim(),
      type: form.type,
      lengthM: Number(form.lengthM) || 1,
      fromPort: form.fromPort.trim(),
      toPort: form.toPort.trim(),
      status: form.status,
      color: form.color.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.25rem' }}>{initial ? 'Edit Cable' : 'Add Cable'}</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <Field label="Label *"><input className="input" required value={form.label} onChange={set('label')} placeholder="e.g. CBL-001" /></Field>
            <Field label="Type">
              <select className="input" value={form.type} onChange={set('type')}>
                {CABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Length (m)"><input className="input" type="number" min={0.1} step={0.1} value={form.lengthM} onChange={set('lengthM')} /></Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="From Port"><input className="input" value={form.fromPort} onChange={set('fromPort')} placeholder="SW1:eth0" /></Field>
            <Field label="To Port"><input className="input" value={form.toPort} onChange={set('toPort')} placeholder="SRV1:nic0" /></Field>
            <Field label="Color">
              <select className="input" value={form.color} onChange={set('color')}>
                <option value="">None</option>
                {Object.keys(COLOR_MAP).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
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

function CableStatusBadge({ status }: { status: string }) {
  const cls = status === 'active' ? 'badge-online' : status === 'faulty' ? 'badge-offline' : 'badge-gray';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
}
