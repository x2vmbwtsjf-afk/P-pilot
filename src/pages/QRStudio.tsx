import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { getDevices, getRacks, getCables } from '../db';
import type { Device, Rack, Cable } from '../types';

type Tab = 'devices' | 'racks' | 'cables';

export default function QRStudio() {
  const [tab, setTab] = useState<Tab>('devices');
  const [devices, setDevices] = useState<Device[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [cables, setCables] = useState<Cable[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    Promise.all([getDevices(), getRacks(), getCables()]).then(([d, r, c]) => {
      setDevices(d ?? []);
      setRacks(r ?? []);
      setCables(c ?? []);
    });
  }, []);

  useEffect(() => { setSelected(null); setQrDataUrl(null); }, [tab]);

  function getItems(): { id: string; label: string; sub: string }[] {
    if (tab === 'devices') return devices.map(d => ({ id: d.id, label: d.name, sub: `${d.type} • ${d.serial}` }));
    if (tab === 'racks')   return racks.map(r => ({ id: r.id, label: r.name, sub: r.location }));
    return cables.map(c => ({ id: c.id, label: c.label, sub: `${c.type} • ${c.lengthM}m` }));
  }

  async function generateQR(id: string) {
    const kind = tab === 'devices' ? 'device' : tab === 'racks' ? 'rack' : 'cable';
    const base = window.location.href.split('#')[0];
    const url = `${base}#/${kind}/${id}`;
    setSelected(id);
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#0a0e1a', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error(e);
    }
  }

  function getItemDetails(id: string): { name: string; serial?: string } {
    if (tab === 'devices') { const d = devices.find(x => x.id === id); return { name: d?.name ?? '', serial: d?.serial }; }
    if (tab === 'racks')   { const r = racks.find(x => x.id === id);   return { name: r?.name ?? '' }; }
    const c = cables.find(x => x.id === id); return { name: c?.label ?? '', serial: c?.type };
  }

  function handlePrint() {
    if (!qrDataUrl || !selected) return;
    const { name, serial } = getItemDetails(selected);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - ${name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; }
            .label { text-align: center; padding: 1.5rem; border: 2px solid #000; border-radius: 8px; display: inline-block; min-width: 200px; }
            img { display: block; margin: 0 auto 0.75rem; }
            .name { font-size: 1rem; font-weight: 700; margin: 0; }
            .serial { font-size: 0.75rem; color: #666; font-family: monospace; margin: 0.25rem 0 0; }
            .kind { font-size: 0.65rem; color: #999; text-transform: uppercase; letter-spacing: 0.08em; margin: 0.1rem 0 0; }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${qrDataUrl}" width="200" height="200" alt="QR Code" />
            <p class="kind">${tab.slice(0, -1).toUpperCase()}</p>
            <p class="name">${name}</p>
            ${serial ? `<p class="serial">${serial}</p>` : ''}
          </div>
          <script>window.onload = () => window.print();<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

  const items = getItems();

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>QR Studio</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generate and print QR codes for any asset</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: item picker */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '0.3rem' }}>
            {(['devices','racks','cables'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, padding: '0.45rem 0', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s',
                  background: tab === t ? 'var(--bg-card)' : 'transparent',
                  color: tab === t ? 'var(--accent-blue)' : 'var(--text-muted)',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 420, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No {tab} found
              </div>
            ) : items.map(item => (
              <div
                key={item.id}
                onClick={() => generateQR(item.id)}
                style={{
                  padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                  background: selected === item.id ? 'rgba(0,212,255,0.12)' : 'var(--bg-card)',
                  border: `1px solid ${selected === item.id ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: QR display */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380 }}>
          {!qrDataUrl ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏷️</div>
              <div style={{ fontSize: '0.875rem' }}>Select an item to generate its QR code</div>
            </div>
          ) : (
            <>
              <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', marginBottom: '1rem', boxShadow: '0 4px 24px rgba(0,212,255,0.2)' }}>
                <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', width: 220, height: 220 }} />
              </div>
              {selected && (() => {
                const { name, serial } = getItemDetails(selected);
                return (
                  <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{name}</div>
                    {serial && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>{serial}</div>}
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a
                  href={qrDataUrl}
                  download={`qr-${selected}.png`}
                  className="btn-secondary"
                >
                  <DownloadIcon /> Download
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

function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
function PrintIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>;
}
