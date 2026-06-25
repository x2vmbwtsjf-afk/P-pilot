import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { getDevices, getRacks, getCables } from '../db';
import type { Device, Rack, Cable } from '../types';

type Tab = 'devices' | 'racks' | 'cables';

const NETWORK_TYPES = new Set(['switch','router','firewall']);

interface ListItem {
  id: string;
  label: string;
  sub: string;
  kind: 'device' | 'rack' | 'cable';
  raw: Device | Rack | Cable;
}

function deviceSub(d: Device): string {
  const ip = d.ipAddress ?? d.ip;
  if (d.type === 'server')       return [d.hostname || d.manufacturer, d.model, ip ? `IP: ${ip}` : null, d.os].filter(Boolean).join(' · ');
  if (NETWORK_TYPES.has(d.type)) return [d.manufacturer, d.model, d.managementIp ? `Mgmt: ${d.managementIp}` : null, d.ports ? `${d.ports} ports` : null].filter(Boolean).join(' · ');
  if (d.type === 'ups')          return [d.manufacturer, d.model, d.capacityVA ? `${d.capacityVA}VA` : null].filter(Boolean).join(' · ');
  return [d.type, d.serial || null].filter(Boolean).join(' · ');
}

function rackSub(r: Rack): string {
  const loc = [r.room || r.location, r.row ? `Row ${r.row}` : null].filter(Boolean).join(' · ');
  return [r.rackNumber ? `#${r.rackNumber}` : null, loc, `${r.totalU}U`, r.manufacturer || null].filter(Boolean).join(' · ');
}

function cableSub(c: Cable): string {
  const near = c.nearEnd || c.fromPort || '';
  const far  = c.farEnd  || c.toPort   || '';
  if (near && far) return `${near} → ${far} · ${c.lengthM}m`;
  return `${c.type} · ${c.lengthM}m`;
}

export default function QRStudio() {
  const [tab, setTab]         = useState<Tab>('devices');
  const [search, setSearch]   = useState('');
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

  useEffect(() => { setSelected(null); setQrDataUrl(null); setSearch(''); }, [tab]);

  function getItems(): ListItem[] {
    if (tab === 'devices') return devices.map(d => ({ id: d.id, label: d.name, sub: deviceSub(d), kind: 'device' as const, raw: d }));
    if (tab === 'racks')   return racks.map(r   => ({ id: r.id, label: r.name, sub: rackSub(r),   kind: 'rack'   as const, raw: r }));
    return cables.map(c => ({ id: c.id, label: c.label, sub: cableSub(c), kind: 'cable' as const, raw: c }));
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
        color: { dark: '#0a0a0f', light: '#ffffff' },
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
    const url = buildUrl(selected.kind, selected.id);
    const raw = selected.raw;

    let extras = '';
    if (selected.kind === 'device') {
      const d = raw as Device;
      if (d.type === 'server') {
        if (d.hostname) extras += `<div class="extra">Host: ${d.hostname}</div>`;
        const ip = d.ipAddress ?? d.ip;
        if (ip) extras += `<div class="extra">IP: ${ip}</div>`;
        if (d.os) extras += `<div class="extra">OS: ${d.os}</div>`;
      } else if (NETWORK_TYPES.has(d.type)) {
        if (d.managementIp) extras += `<div class="extra">Mgmt IP: ${d.managementIp}</div>`;
        if (d.ports)  extras += `<div class="extra">Ports: ${d.ports}</div>`;
        if (d.vlan)   extras += `<div class="extra conn">VLAN: ${d.vlan}</div>`;
      } else if (d.type === 'ups') {
        if (d.capacityVA) extras += `<div class="extra">Capacity: ${d.capacityVA}VA</div>`;
        const batt = d.batteryLastReplaced ?? d.batteryReplaced;
        if (batt) extras += `<div class="extra">Battery: ${batt}</div>`;
      }
      if (d.tech) extras += `<div class="extra">Tech: ${d.tech}</div>`;
    } else if (selected.kind === 'rack') {
      const r = raw as Rack;
      if (r.rackNumber) extras += `<div class="extra">Rack #${r.rackNumber}</div>`;
      const roomLine = r.room ? `${r.room}${r.location ? ` (${r.location})` : ''}` : r.location;
      extras += `<div class="extra">${roomLine}${r.row ? ` · Row ${r.row}` : ''} · ${r.totalU}U</div>`;
      if (r.tech) extras += `<div class="extra">Tech: ${r.tech}</div>`;
    } else if (selected.kind === 'cable') {
      const c = raw as Cable;
      if (c.labelName) extras += `<div class="extra conn">${c.labelName}</div>`;
      else {
        const near = c.nearEnd || c.fromPort || '';
        const far  = c.farEnd  || c.toPort   || '';
        if (near && far) extras += `<div class="extra conn">${near} → ${far}</div>`;
        else {
          if (near) extras += `<div class="extra conn">Near: ${near}</div>`;
          if (far)  extras += `<div class="extra conn">Far: ${far}</div>`;
        }
      }
      if (c.tech) extras += `<div class="extra">Tech: ${c.tech}</div>`;
    }

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>QR Label — ${selected.label}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .label { text-align: center; padding: 2rem; border: 2px solid #000; border-radius: 10px; display: inline-block; min-width: 260px; max-width: 320px; }
    img { display: block; margin: 0 auto 1rem; }
    .kind  { font-size: 0.65rem; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.4rem; }
    .name  { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.4rem; }
    .sub   { font-size: 0.75rem; color: #555; font-family: monospace; margin-bottom: 0.4rem; }
    .extra { font-size: 0.72rem; color: #666; margin-top: 0.2rem; }
    .conn  { font-family: monospace; font-size: 0.68rem; }
    .url   { font-size: 0.58rem; color: #aaa; margin-top: 0.75rem; word-break: break-all; border-top: 1px solid #eee; padding-top: 0.5rem; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="label">
    <img src="${qrDataUrl}" width="220" height="220" alt="QR Code" />
    <div class="kind">${selected.kind}</div>
    <div class="name">${selected.label}</div>
    <div class="sub">${selected.sub}</div>
    ${extras}
    <div class="url">${url}</div>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  }

  const allItems = getItems();
  const filteredItems = search
    ? allItems.filter(i => i.label.toLowerCase().includes(search.toLowerCase()) || i.sub.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">QR Studio</h1>
          <p className="page-sub">Generate, download and print QR codes for any asset</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.25rem' }}>

        {/* Left panel: asset picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px',
          }}>
            {(['devices','racks','cables'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1,
                  padding: '0.4rem 0',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                  background: tab === t ? 'var(--bg-secondary)' : 'transparent',
                  color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            className="input"
            placeholder={`Search ${tab}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* Item list */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxHeight: 420,
            overflowY: 'auto',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '4px',
          }}>
            {filteredItems.length === 0
              ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No {tab} found</div>
              : filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => selectItem(item)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                    background: selected?.id === item.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                    border: `1px solid ${selected?.id === item.id ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                  }}
                  onMouseOver={e => { if (selected?.id !== item.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseOut={e  => { if (selected?.id !== item.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub || '—'}</div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Right panel: QR preview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, padding: '2rem', gap: '1.25rem' }}>
          {!selected && !generating && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <QRPlaceholder />
              <div style={{ fontSize: '0.8rem', marginTop: '0.75rem' }}>Select an asset to generate its QR code</div>
            </div>
          )}

          {generating && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '0.8rem' }}>Generating QR code…</div>
            </div>
          )}

          {qrDataUrl && selected && !generating && (
            <>
              <div style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '10px',
                boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
              }}>
                <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', width: 220, height: 220 }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selected.label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.5, maxWidth: 240 }}>{selected.sub}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <a
                  href={qrDataUrl}
                  download={`qr-${selected.label.replace(/\s+/g,'-')}.png`}
                  className="btn-secondary"
                  style={{ padding: '0.45rem 0.75rem' }}
                  title="Download PNG"
                >
                  <DownloadIcon /> Download
                </a>
                <button className="btn-primary" onClick={handlePrint} style={{ padding: '0.45rem 0.75rem' }} title="Print Label">
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

function QRPlaceholder() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
      <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
      <rect x="3" y="16" width="5" height="5" rx="1"/>
      <path d="M21 16h-3v3"/><path d="M21 21v.01"/><path d="M12 7v3h3"/>
      <path d="M12 3v.01"/><path d="M12 12v.01"/><path d="M16 12v.01"/><path d="M7 12h.01"/>
    </svg>
  );
}
function DownloadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function PrintIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>; }
