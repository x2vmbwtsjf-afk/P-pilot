import { useEffect, useState } from 'react';
import { getCables, putCable, deleteCable, generateId } from '../db';
import type { Cable, CableType, CableStatus } from '../types';
import { navigate } from '../App';
import { useToast } from '../components/Toast';

const CABLE_TYPES: CableType[] = ['cat6','cat6a','cat7','fiber-sm','fiber-mm','fiber-om4','dac','aoc','power','other'];
const STATUSES: CableStatus[]  = ['active','spare','faulty'];

const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6', red: '#ef4444', green: '#22c55e', yellow: '#eab308',
  orange: '#f97316', purple: '#a855f7', white: '#e2e8f0', black: '#6b7280', gray: '#9ca3af',
};

export default function Cables() {
  const { toast } = useToast();
  const [cables, setCables]   = useState<Cable[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]    = useState<Cable | null>(null);
  const [search, setSearch]      = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]     = useState('');

  const load = () => getCables().then(c => setCables(c ?? []));
  useEffect(() => { load(); }, []);

  const filtered = cables.filter(c => {
    const q = search.toLowerCase();
    const nearEnd = c.nearEnd || c.fromPort || '';
    const farEnd  = c.farEnd  || c.toPort   || '';
    const matchQ = !q || c.label.toLowerCase().includes(q) || nearEnd.toLowerCase().includes(q) || farEnd.toLowerCase().includes(q) || (c.cableNumber ?? '').toLowerCase().includes(q) || (c.tech ?? '').toLowerCase().includes(q);
    return matchQ && (!filterStatus || c.status === filterStatus) && (!filterType || c.type === filterType);
  });

  async function handleDelete(id: string) {
    if (!confirm('Delete this cable?')) return;
    await deleteCable(id);
    toast('Cable deleted');
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
        <input className="input" placeholder="Search label, near/far end, tech…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Types</option>
          {CABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
              {search || filterStatus || filterType ? 'No cables match filters' : 'No cables yet — add one!'}
            </div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Label</th><th>Type</th><th>Length</th><th>Near End</th><th>Far End</th><th>Color</th><th>Tech</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`cable/${c.id}`)}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.label}</div>
                        {c.cableNumber && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.cableNumber}</div>}
                      </td>
                      <td><span className="badge badge-blue">{c.type}</span></td>
                      <td>{c.lengthM}m</td>
                      <td style={{ fontSize: '0.8rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nearEnd || c.fromPort || '—'}</td>
                      <td style={{ fontSize: '0.8rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.farEnd || c.toPort || '—'}</td>
                      <td>
                        {c.color
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLOR_MAP[c.color] ?? '#888', border: '1px solid rgba(255,255,255,0.15)', display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.75rem' }}>{c.color}</span>
                            </div>
                          : '—'
                        }
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.tech || '—'}</td>
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
          )
        }
      </div>

      {showModal && (
        <CableModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSave={async (cable) => {
            await putCable(cable);
            toast(editing ? 'Cable updated' : 'Cable created');
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
    label:       initial?.label                             ?? '',
    type:        initial?.type                              ?? 'cat6' as CableType,
    lengthM:     initial?.lengthM                          ?? 1,
    nearEnd:     initial?.nearEnd ?? initial?.fromPort     ?? '',
    farEnd:      initial?.farEnd  ?? initial?.toPort       ?? '',
    status:      initial?.status                           ?? 'active' as CableStatus,
    color:       initial?.color                            ?? '',
    tech:        initial?.tech                             ?? '',
    cableNumber: initial?.cableNumber                      ?? '',
    notes:       initial?.notes                            ?? '',
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
      nearEnd: form.nearEnd.trim(),
      farEnd:  form.farEnd.trim(),
      status: form.status,
      color:       form.color.trim()       || undefined,
      tech:        form.tech.trim()        || undefined,
      cableNumber: form.cableNumber.trim() || undefined,
      notes:       form.notes.trim()       || undefined,
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
            <Field label="Label / Name *"><input className="input" required value={form.label} onChange={set('label')} placeholder="e.g. CAT6 Patch #1" autoFocus /></Field>
            <Field label="Number / ID"><input className="input" value={form.cableNumber} onChange={set('cableNumber')} placeholder="CBL-001" /></Field>
            <Field label="Type">
              <select className="input" value={form.type} onChange={set('type')}>
                {CABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Length (m)"><input className="input" type="number" min={0.1} step={0.1} value={form.lengthM} onChange={set('lengthM')} /></Field>
            <Field label="Color">
              <select className="input" value={form.color} onChange={set('color')}>
                <option value="">None</option>
                {Object.keys(COLOR_MAP).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Near End"><input className="input" value={form.nearEnd} onChange={set('nearEnd')} placeholder="SW1:Gi1/0/1" /></Field>
            <Field label="Far End"><input className="input" value={form.farEnd} onChange={set('farEnd')} placeholder="SRV1:NIC0" /></Field>
            <Field label="Tech (responsible)"><input className="input" value={form.tech} onChange={set('tech')} placeholder="Technician name" /></Field>
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
function PlusIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function EditIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>; }
