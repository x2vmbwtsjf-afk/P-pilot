import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { getDevices, getRacks, getCables } from '../db';
import type { Device, Rack, Cable } from '../types';

type Tab = 'devices' | 'racks' | 'cables';

interface ListItem { id: string; label: string; sub: string; kind: 'device' | 'rack' | 'cable' }

export default function QRStudio() {
  const [tab, setTab]         = useState<Tab>('devices');
  const [devices, setDevices] = useState<Device[]>([]);
  const [racks, setRacks]     = useState<Rack[]>([]);
  const [cables, setCables]   = useState<Cable[]>([]);
  const [selected, setSelected] = useState<ListItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    Promise.all([getDevices(), getRacks(), getCables()]).then(([d, r, c]) => {
      setDevices(d ?? []);
      setRacks(r ?? []);
      setCables(c ?? []);
    });
  }, []);

  useEffect(() => { setSelected(null); setQrDataUrl(null); }, [tab]);

  function getItems(): ListItem[] {
    if (tab === 'devices') return devices.map(d => ({ id: d.id, label: d.name, sub: `${d.type} · ${d.serial || 'no serial'}`, kind: 'device' as const }));
    if (tab === 'racks')   return racks.map(r   => ({ id: r.id, label: r.name, sub: r.location || 'no location', kind: 'rack' as const }));
    return cables.map(c => ({ id: c.id, label: c.label, sub: `${c.type} · ${c.lengthM}m`, kind: 'cable' as const }));
  }

  function buildUrl(kind: string, id: string) {
    const base = window.location.href.split('#')[0];
    return `${base}#/${kind}/${id}`;
  }

  async function selectItem(item: ListItem) {
    setSelected(item);
    setGenerating(true);
    setQrDataUrl(null);
    try {
      const url = buildUrl(item.kind, item.id);
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300, margin: 2,
        color: { dark: '#0a0e1a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.warn('QR generation failed', err);
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    if (!qrDataUrl || !selected) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>QR Label — ${selected.label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .label { text-align: center; padding: 2rem; border: 2px solid #000; border-radius: 10px; display: inline-block; min-width: 240px; }
    img { display: block; margin: 0 auto 1rem; }
    .kind { font-size: 0.65rem; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.4rem; }
    .name { font-size: 1.1rem; font-weight: 700; }
    .serial { font-size: 0.75rem; color: #555; font-family: monospace; margin-top: 0.25rem; }
    .url { font-size: 0.6rem; color: #aaa; margin-top: 0.75rem; word-break: break-all; }
  </style>
</head>
<body>
  <div class="label">
    <img src="${qrDataUrl}" width="220" height="220" alt="QR Code" />
    <div class="kind">${selected.kind}</div>
    <div class="name">${selected.label}</div>
    <div class="serial">${selected.sub}</div>
    <div class="url">${buildUrl(selected.kind, selected.id)}</div>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  }

  const items = getItems();

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>QR Studio</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generate, download and print QR codes for any asset</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem' }}>
        {/* Item picker */}
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '0.3rem' }}>
            {(['devices','racks','cables'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '0.45rem 0', borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s',
                background: tab === t ? 'var(--bg-card)' : 'transparent',
                color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 460, overflowY: 'auto' }}>
            {items.length === 0
              ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No {tab} found</div>
              : items.map(item => (
                <div key={item.id} onClick={() => selectItem(item)} style={{
                  padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                  background: selected?.id === item.id ? 'rgba(0,212,255,0.12)' : 'var(--bg-card)',
                  border: `1px solid ${selected?.id === item.id ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{item.sub}</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* QR display */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          {!selected && !generating && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🏷️</div>
              <div style={{ fontSize: '0.875rem' }}>Select an item to generate its QR code</div>
            </div>
          )}

          {generating && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <div style={{ fontSize: '0.875rem' }}>Generating…</div>
            </div>
          )}

          {qrDataUrl && selected && !generating && (
            <>
              <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', marginBottom: '1rem', boxShadow: '0 4px 24px rgba(0,212,255,0.2)' }}>
                <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', width: 220, height: 220 }} />
              </div>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{selected.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>{selected.sub}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a href={qrDataUrl} download={`qr-${selected.label.replace(/\s+/g,'-')}.png`} className="btn-secondary">
                  <DownloadIcon /> Download PNG
                </a>
                <button className="btn-primary" onClick={handlePrint}>
                  <PrintIcon /> Print Label
                </button>
              </div>
            </>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function PrintIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>; }
