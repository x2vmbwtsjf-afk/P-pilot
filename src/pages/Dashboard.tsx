import { useEffect, useState } from 'react';
import { getRacks, getDevices, getCables } from '../db';
import type { Rack, Device, Cable } from '../types';
import { navigate } from '../App';
import CreateQRModal from '../components/CreateQRModal';
import ScanQRModal from '../components/ScanQRModal';

export default function Dashboard() {
  const [racks, setRacks]     = useState<Rack[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [cables, setCables]   = useState<Cable[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showScan, setShowScan]     = useState(false);
  const [prefillId, setPrefillId]   = useState<string | undefined>();
  const [alertDismissed, setAlertDismissed] = useState(false);

  const load = () =>
    Promise.all([getRacks(), getDevices(), getCables()]).then(([r, d, c]) => {
      setRacks(r ?? []);
      setDevices(d ?? []);
      setCables(c ?? []);
    });

  useEffect(() => { load(); }, []);

  const online  = devices.filter(d => d.status === 'online').length;
  const offline = devices.filter(d => d.status === 'offline').length;
  const activeC = cables.filter(c => c.status === 'active').length;
  const faultyC = cables.filter(c => c.status === 'faulty').length;
  const usedU   = devices.reduce((s, d) => s + (d.uHeight ?? 1), 0);
  const totalU  = racks.reduce((s, r) => s + r.totalU, 0);
  const fillPct = totalU > 0 ? Math.round(usedU / totalU * 100) : 0;

  const alerts: string[] = [];
  if (offline > 0) alerts.push(`${offline} device${offline > 1 ? 's' : ''} offline`);
  if (faultyC > 0) alerts.push(`${faultyC} faulty cable${faultyC > 1 ? 's' : ''}`);
  const highRacks = racks.filter(r => {
    const used = devices.filter(d => d.rackId === r.id).reduce((s, d) => s + (d.uHeight ?? 1), 0);
    return r.totalU > 0 && used / r.totalU > 0.9;
  });
  if (highRacks.length > 0) alerts.push(`${highRacks.length} rack${highRacks.length > 1 ? 's' : ''} above 90% capacity`);

  const recentDevices = [...devices].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  function openAddNew(id: string) {
    setPrefillId(id);
    setShowCreate(true);
  }

  return (
    <div className="fade-in">
      {/* ─── Page header ─── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Data center infrastructure overview</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            className="btn-secondary"
            onClick={() => setShowScan(true)}
          >
            <ScanIcon size={14} /> Scan QR
          </button>
          <button
            className="btn-primary"
            onClick={() => { setPrefillId(undefined); setShowCreate(true); }}
          >
            <QRIcon size={14} /> Create QR
          </button>
        </div>
      </div>

      {/* ─── Alert strip ─── */}
      {alerts.length > 0 && !alertDismissed && (
        <div className="alert-strip" style={{ marginBottom: '1.25rem' }}>
          <WarnIcon size={14} />
          <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.78rem' }}>Alerts</span>
          {alerts.map(a => (
            <span key={a} style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>· {a}</span>
          ))}
          <button
            onClick={() => setAlertDismissed(true)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 0.25rem', fontSize: '0.9rem', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}

      {/* ─── Stat bar ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.75rem' }}>
        <StatCard
          label="Devices"
          value={devices.length}
          sub={`${online} online`}
          accent="#3b82f6"
          icon={<DeviceStatIcon />}
          onClick={() => navigate('devices')}
        />
        <StatCard
          label="Racks"
          value={racks.length}
          sub={`${totalU}U total`}
          accent="#10b981"
          icon={<RackStatIcon />}
          onClick={() => navigate('racks')}
        />
        <StatCard
          label="Cables"
          value={cables.length}
          sub={`${activeC} active`}
          accent="#a78bfa"
          icon={<CableStatIcon />}
          onClick={() => navigate('cables')}
        />
        <StatCard
          label="Offline"
          value={offline}
          sub="devices down"
          accent={offline > 0 ? '#ef4444' : '#4a4a60'}
          icon={<OfflineStatIcon active={offline > 0} />}
          onClick={() => navigate('devices')}
        />
        <StatCard
          label="Rack Fill"
          value={`${fillPct}%`}
          sub={`${usedU} / ${totalU}U`}
          accent="#f59e0b"
          icon={<FillStatIcon />}
          onClick={() => navigate('racks')}
        />
      </div>

      {/* ─── Content grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

        {/* Recent Devices */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Recent Devices</span>
            <button className="btn-secondary" style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }} onClick={() => navigate('devices')}>View all</button>
          </div>
          {recentDevices.length === 0
            ? <Empty text="No devices yet" />
            : <div>
                {recentDevices.map(d => (
                  <div
                    key={d.id}
                    onClick={() => navigate(`device/${d.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 1.25rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseOut={e  => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{d.type} · {d.serial || 'no serial'}</div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Quick Actions</span>
          </div>
          <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              { label: 'Add Device',  target: 'devices',   icon: <DeviceStatIcon /> },
              { label: 'Add Rack',    target: 'racks',     icon: <RackStatIcon /> },
              { label: 'Add Cable',   target: 'cables',    icon: <CableStatIcon /> },
              { label: 'QR Studio',   target: 'qr-studio', icon: <QRIcon size={14} /> },
            ].map(({ label, target, icon }) => (
              <button
                key={label}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', width: '100%', padding: '0.5rem 0.75rem' }}
                onClick={() => navigate(target)}
              >
                {icon}
                <span style={{ marginLeft: '0.25rem' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rack Capacity */}
        {racks.length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Rack Capacity</span>
              <button className="btn-secondary" style={{ padding: '0.25rem 0.65rem', fontSize: '0.72rem' }} onClick={() => navigate('racks')}>View all</button>
            </div>
            <div style={{ padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {racks.slice(0, 6).map(rack => {
                const used = devices.filter(d => d.rackId === rack.id).reduce((s, d) => s + (d.uHeight ?? 1), 0);
                const pct  = rack.totalU > 0 ? Math.min(100, Math.round(used / rack.totalU * 100)) : 0;
                const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#3b82f6';
                return (
                  <div key={rack.id} onClick={() => navigate(`rack/${rack.id}`)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{rack.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{used}/{rack.totalU}U · {pct}%</span>
                    </div>
                    <div className="cap-bar-track">
                      <div className="cap-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateQRModal
          prefillId={prefillId}
          onClose={() => { setShowCreate(false); setPrefillId(undefined); }}
          onSaved={(_kind, _id) => { setShowCreate(false); setPrefillId(undefined); load(); }}
        />
      )}
      {showScan && (
        <ScanQRModal
          onClose={() => setShowScan(false)}
          onAddNew={(id) => { setShowScan(false); openAddNew(id); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent, icon, onClick }: {
  label: string; value: string | number; sub: string;
  accent: string; icon: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div className="stat-card" onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div style={{ color: 'var(--text-muted)' }}>{icon}</div>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, display: 'block', marginTop: 2, flexShrink: 0 }} />
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: accent, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '0.3rem' }}>{label}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'online' ? 'badge-online' : status === 'offline' ? 'badge-offline' : 'badge-standby';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
      {text}
    </div>
  );
}

function QRIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
      <rect x="3" y="16" width="5" height="5" rx="1"/>
      <path d="M16 16h2v2h-2z"/><path d="M20 16v2"/><path d="M16 20h4"/>
      <path d="M12 3v4"/><path d="M12 12v.01"/><path d="M3 12h4"/>
    </svg>
  );
}
function ScanIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  );
}
function WarnIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function DeviceStatIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function RackStatIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  );
}
function CableStatIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9a2 2 0 0 0 2-2V5h12v2a2 2 0 0 0 4 0V3H2v2a2 2 0 0 0 2 2z"/>
      <path d="M4 15a2 2 0 0 1 2 2v2h12v-2a2 2 0 0 1 4 0v2H2v-2a2 2 0 0 1 2-2z"/>
      <line x1="12" y1="9" x2="12" y2="15"/>
    </svg>
  );
}
function OfflineStatIcon({ active }: { active: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={active ? '#ef4444' : 'currentColor'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  );
}
function FillStatIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
