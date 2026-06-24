import { useEffect, useState } from 'react';
import { getRacks, putRack, deleteRack, getDevices, generateId } from '../db';
import type { Rack, Device } from '../types';
import { navigate } from '../App';
import { useToast } from '../components/Toast';

export default function Racks() {
  const { toast } = useToast();
  const [racks, setRacks]     = useState<Rack[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]    = useState<Rack | null>(null);
  const [search, setSearch]      = useState('');

  const load = () => Promise.all([getRacks(), getDevices()]).then(([r, d]) => {
    setRacks(r ?? []);
    setDevices(d ?? []);
  });

  useEffect(() => { load(); }, []);

  const filtered = racks.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    if (!confirm('Delete this rack? Devices in it will be unassigned.')) return;
    await deleteRack(id);
    toast('Rack deleted');
    load();
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Racks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{racks.length} rack{racks.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
          <PlusIcon /> Add Rack
        </button>
      </div>

      <input className="input" placeholder="Search by name or location…" value={search} onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '1.25rem', maxWidth: 340 }} />

      {filtered.length === 0
        ? <Empty text={search ? 'No racks match your search' : 'No racks yet — add one!'} />
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filtered.map(rack => {
              const rackDevices = devices.filter(d => d.rackId === rack.id);
              const usedU = rackDevices.reduce((s, d) => s + (d.uHeight ?? 1), 0);
              const pct   = rack.totalU > 0 ? Math.min(100, Math.round(usedU / rack.totalU * 100)) : 0;
              return (
                <div key={rack.id} className="card" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => navigate(`rack/${rack.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{rack.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{rack.location}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }} onClick={e => e.stopPropagation()}>
                      <button className="btn-icon" onClick={() => { setEditing(rack); setShowModal(true); }}><EditIcon /></button>
                      <button className="btn-icon" style={{ color: '#ff4d4d', borderColor: 'rgba(255,77,77,0.3)' }} onClick={() => handleDelete(rack.id)}><TrashIcon /></button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capacity</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{usedU}/{rack.totalU}U · {pct}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct > 90 ? '#ff4d4d' : pct > 70 ? '#ffb700' : 'linear-gradient(90deg,#00D4FF,#00FF94)', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-blue">{rack.totalU}U</span>
                    <span className="badge badge-gray">{rackDevices.length} devices</span>
                    {pct > 90 && <span className="badge badge-offline">Critical</span>}
                  </div>

                  {rack.description && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
                      {rack.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }

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
    name:        initial?.name        ?? '',
    location:    initial?.location    ?? '',
    totalU:      initial?.totalU      ?? 42,
    description: initial?.description ?? '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const now = Date.now();
    onSave({ id: initial?.id ?? generateId(), name: form.name.trim(), location: form.location.trim(), totalU: Number(form.totalU) || 42, description: form.description.trim(), createdAt: initial?.createdAt ?? now, updatedAt: now });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.25rem' }}>{initial ? 'Edit Rack' : 'Add Rack'}</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Name *"><input className="input" required value={form.name} onChange={set('name')} placeholder="e.g. Rack A1" autoFocus /></Field>
          <Field label="Location"><input className="input" value={form.location} onChange={set('location')} placeholder="e.g. Row 1, DC-1" /></Field>
          <Field label="Size (U)"><input className="input" type="number" min={1} max={100} value={form.totalU} onChange={set('totalU')} /></Field>
          <Field label="Description"><textarea className="input" value={form.description} onChange={set('description')} rows={2} style={{ resize: 'vertical' }} /></Field>
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
function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{text}</div>;
}
function PlusIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function EditIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>; }
