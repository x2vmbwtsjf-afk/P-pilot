import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { putDevice, putRack, putCable, getRacks, generateId } from '../db';
import type { Rack } from '../types';
import { useToast } from './Toast';

type ItemKind = 'device' | 'rack' | 'cable' | 'custom';

interface Props {
  prefillId?: string;
  onClose: () => void;
  onSaved?: (kind: string, id: string) => void;
}

const BASE = (() => {
  const h = window.location.href.split('#')[0];
  return h.endsWith('/') ? h : h + '/';
})();

function buildUrl(kind: ItemKind, id: string) {
  const segment = kind === 'custom' ? 'device' : kind;
  return `${BASE}#/${segment}/${id}`;
}

export default function CreateQRModal({ prefillId, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const id = useRef(prefillId ?? generateId()).current;

  const [form, setForm] = useState({
    name: '', kind: 'device' as ItemKind, serial: '', location: '', notes: '',
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => { getRacks().then(r => setRacks(r ?? [])); }, []);

  useEffect(() => {
    const url = buildUrl(form.kind, id);
    QRCode.toDataURL(url, {
      width: 240, margin: 1,
      color: { dark: '#0a0a0f', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => {});
  }, [form.kind, id]);

  async function save(): Promise<boolean> {
    if (!form.name.trim()) { toast('Name is required', 'error'); return false; }
    setSaving(true);
    const now = Date.now();
    try {
      if (form.kind === 'device' || form.kind === 'custom') {
        await putDevice({
          id, name: form.name.trim(),
          type: form.kind === 'custom' ? 'other' : 'server',
          serial: form.serial.trim(),
          rackId: form.location ? racks.find(r => r.name === form.location)?.id : undefined,
          uHeight: 1, status: 'online',
          notes: form.notes.trim() || undefined,
          createdAt: now, updatedAt: now,
        });
      } else if (form.kind === 'rack') {
        await putRack({
          id, name: form.name.trim(),
          location: form.location.trim(),
          totalU: 42,
          description: form.notes.trim() || undefined,
          createdAt: now, updatedAt: now,
        });
      } else if (form.kind === 'cable') {
        await putCable({
          id, label: form.name.trim(),
          type: 'cat6',
          lengthM: 1,
          nearEnd: form.location.trim(),
          farEnd: '',
          status: 'active',
          notes: form.notes.trim() || undefined,
          createdAt: now, updatedAt: now,
        });
      }
      toast(`${form.kind.charAt(0).toUpperCase() + form.kind.slice(1)} saved`);
      onSaved?.(form.kind === 'custom' ? 'device' : form.kind, id);
      return true;
    } catch {
      toast('Save failed', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOnly() {
    const ok = await save();
    if (ok) onClose();
  }

  async function handleSavePrint() {
    const ok = await save();
    if (!ok || !qrDataUrl) return;
    printLabel(form.name, form.serial, buildUrl(form.kind, id), qrDataUrl, id);
    onClose();
  }

  const previewUrl = buildUrl(form.kind, id);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Create QR Label</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', padding: '1.25rem 1.5rem' }}>
          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <Field label="Name *">
                <input className="input" required value={form.name} onChange={set('name')} placeholder="e.g. web-srv-01" autoFocus />
              </Field>
              <Field label="Type">
                <select className="input" value={form.kind} onChange={set('kind')}>
                  <option value="device">Device</option>
                  <option value="rack">Rack</option>
                  <option value="cable">Cable</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Serial / ID">
                <input className="input" value={form.serial} onChange={set('serial')} placeholder="SN-XXXX" />
              </Field>
              <Field label={form.kind === 'rack' ? 'Location' : form.kind === 'cable' ? 'From Port' : 'Rack'}>
                {form.kind === 'device' || form.kind === 'custom'
                  ? <select className="input" value={form.location} onChange={set('location')}>
                      <option value="">None</option>
                      {racks.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  : <input className="input" value={form.location} onChange={set('location')} placeholder={form.kind === 'rack' ? 'Row 1' : 'SW1:eth0'} />
                }
              </Field>
            </div>
            <Field label="Notes">
              <textarea className="input" value={form.notes} onChange={set('notes')} rows={2} />
            </Field>

            {/* ID + URL info */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.72rem' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{id}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                URL: <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{previewUrl}</span>
              </div>
            </div>
          </div>

          {/* Live QR preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: 156 }}>
            <span className="section-label" style={{ marginBottom: '0.35rem' }}>Live Preview</span>
            {qrDataUrl
              ? <div style={{ background: '#fff', padding: 8, borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>
                  <img src={qrDataUrl} alt="QR" style={{ display: 'block', width: 136, height: 136 }} />
                </div>
              : <div style={{ width: 136, height: 136, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</div>
            }
            {form.name && (
              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, maxWidth: 156, wordBreak: 'break-word' }}>
                {form.name}
              </div>
            )}
            {form.serial && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{form.serial}</div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-secondary" onClick={handleSaveOnly} disabled={saving}>Save only</button>
          <button className="btn-primary" onClick={handleSavePrint} disabled={saving}>
            <PrintIcon /> Save &amp; Print
          </button>
        </div>
      </div>
    </div>
  );
}

function printLabel(name: string, serial: string, url: string, qrDataUrl: string, id: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>QR Label — ${name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .label { text-align: center; padding: 2rem 2.5rem; border: 2px solid #111; border-radius: 12px; display: inline-block; min-width: 260px; }
    img { display: block; margin: 0 auto 1rem; }
    .name   { font-size: 1.2rem; font-weight: 800; color: #111; margin-bottom: 0.3rem; }
    .serial { font-size: 0.8rem; color: #555; font-family: monospace; margin-bottom: 0.25rem; }
    .id     { font-size: 0.65rem; color: #aaa; font-family: monospace; margin-bottom: 0.75rem; }
    .url    { font-size: 0.6rem; color: #888; word-break: break-all; max-width: 260px; border-top: 1px solid #eee; padding-top: 0.6rem; margin-top: 0.25rem; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="label">
    <img src="${qrDataUrl}" width="240" height="240" alt="QR Code" />
    <div class="name">${name}</div>
    ${serial ? `<div class="serial">${serial}</div>` : ''}
    <div class="id">ID: ${id}</div>
    <div class="url">${url}</div>
  </div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`);
  win.document.close();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

function PrintIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
}
