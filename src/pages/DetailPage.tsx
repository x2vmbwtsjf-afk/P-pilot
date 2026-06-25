import { useEffect, useState } from 'react';
import { getDevice, getRack, getCable, getDevices, putDevice, putCable, putRack } from '../db';
import type { Device, Rack, Cable, DeviceStatus, CableStatus, RackStatus } from '../types';
import { navigate } from '../App';
import { useToast } from '../components/Toast';
import QRCode from 'qrcode';

const NETWORK_TYPES = new Set(['switch','router','firewall']);

export default function DetailPage({ kind, id }: { kind: string; id: string }) {
  const { toast } = useToast();
  const [item, setItem]   = useState<Device | Rack | Cable | null>(null);
  const [extra, setExtra] = useState<{ rackName?: string; devices?: Device[] }>({});
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      if (kind === 'device') {
        const d = await getDevice(id);
        setItem(d ?? null);
        if (d?.rackId) { const r = await getRack(d.rackId); setExtra({ rackName: r?.name }); }
        else setExtra({});
      } else if (kind === 'rack') {
        const r = await getRack(id);
        setItem(r ?? null);
        if (r) { const devs = await getDevices(); setExtra({ devices: (devs ?? []).filter(d => d.rackId === id) }); }
        else setExtra({});
      } else if (kind === 'cable') {
        const c = await getCable(id);
        setItem(c ?? null);
        setExtra({});
      }
    } finally {
      setLoading(false);
    }

    const base = window.location.href.split('#')[0];
    QRCode.toDataURL(`${base}#/${kind}/${id}`, { width: 180, margin: 1, color: { dark: '#0a0a0f', light: '#ffffff' } })
      .then(setQrUrl).catch(() => {});
  }

  useEffect(() => { load(); }, [kind, id]);

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: '2rem', fontSize: '0.875rem' }}>Loading…</div>;
  }
  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Item not found</div>
        <button className="btn-secondary" onClick={() => navigate('')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }} onClick={() => history.back()}>
          <BackIcon /> Back
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          <a
            onClick={() => navigate(`${kind}s`)}
            href={`#/${kind}s`}
            style={{ color: 'var(--accent-blue)', cursor: 'pointer' }}
          >
            {kind.charAt(0).toUpperCase() + kind.slice(1)}s
          </a>
          <span style={{ margin: '0 0.35rem', color: 'var(--text-muted)' }}>/</span>
          <span>Detail</span>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '1.25rem', alignItems: 'start' }}>
        <div>
          {kind === 'device' && <DeviceDetail device={item as Device} rackName={extra.rackName} onRefresh={load} toast={toast} />}
          {kind === 'rack'   && <RackDetail   rack={item as Rack}     devices={extra.devices ?? []} onRefresh={load} toast={toast} />}
          {kind === 'cable'  && <CableDetail  cable={item as Cable}   onRefresh={load} toast={toast} />}
        </div>

        {/* QR Code panel */}
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center', minWidth: 180, maxWidth: 200 }}>
          <div className="section-label" style={{ marginBottom: '0.85rem', display: 'block' }}>QR Code</div>
          {qrUrl
            ? <>
                <div style={{ background: '#fff', borderRadius: 8, padding: 8, display: 'inline-block', marginBottom: '0.85rem' }}>
                  <img src={qrUrl} alt="QR" style={{ display: 'block', width: 148, height: 148 }} />
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                  <a href={qrUrl} download={`qr-${id}.png`} className="btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}>Save</a>
                  <button className="btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }} onClick={() => navigate('qr-studio')}>Studio</button>
                </div>
              </>
            : <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Generating…</div>
          }
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '0.75rem' }}>
      <div className="section-label" style={{ display: 'block', marginBottom: '0.85rem' }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.4rem 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'online' || status === 'active'
    ? 'badge-online'
    : status === 'offline' || status === 'faulty' || status === 'decommissioned'
    ? 'badge-offline'
    : 'badge-standby';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function DeviceDetail({ device, rackName, onRefresh, toast }: { device: Device; rackName?: string; onRefresh: () => void; toast: (m: string) => void }) {
  const statuses: DeviceStatus[] = ['online', 'standby', 'maintenance', 'offline'];
  const isNetwork = NETWORK_TYPES.has(device.type);
  const isUPS     = device.type === 'ups';
  const isServer  = device.type === 'server';

  async function cycleStatus() {
    const next = statuses[(statuses.indexOf(device.status) + 1) % statuses.length];
    await putDevice({ ...device, status: next, updatedAt: Date.now() });
    toast(`Status → ${next}`);
    onRefresh();
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '0.4rem' }}>{device.name}</h1>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className="badge badge-blue">{device.type}</span>
            <StatusBadge status={device.status} />
          </div>
        </div>
        <button className="btn-secondary" onClick={cycleStatus} title="Cycle status" style={{ fontSize: '0.8rem' }}>
          <CycleIcon /> Toggle Status
        </button>
      </div>

      <Section title="Identity">
        {isServer  && <Row label="Hostname"       value={device.hostname} />}
        <Row label="Serial Number"  value={device.serial} />
        <Row label="Manufacturer"   value={device.manufacturer} />
        <Row label="Model"          value={device.model} />
        {isServer  && <Row label="IP Address"     value={device.ipAddress ?? device.ip} />}
        {isServer  && <Row label="OS"             value={device.os} />}
        {isNetwork && <Row label="Management IP"  value={device.managementIp} />}
        {isNetwork && <Row label="Number of Ports" value={device.ports} />}
        {isNetwork && <Row label="VLAN / Segment" value={device.vlan} />}
        {isUPS     && <Row label="Capacity (VA)"  value={device.capacityVA} />}
        {isUPS     && <Row label="Battery Last Replaced" value={device.batteryLastReplaced ?? device.batteryReplaced} />}
        {!isServer && !isNetwork && !isUPS && (device.ipAddress || device.ip) && <Row label="IP / Location" value={device.ipAddress ?? device.ip} />}
        {device.category && <Row label="Category" value={device.category} />}
        <Row label="Tech"           value={device.tech} />
      </Section>

      <Section title="Location">
        <Row label="Rack"       value={rackName ?? (device.rackId || undefined)} />
        <Row label="U Position" value={device.uPosition ? `U${device.uPosition}` : undefined} />
        <Row label="U Size"     value={(device.uSize ?? device.uHeight) ? `${device.uSize ?? device.uHeight}U` : undefined} />
      </Section>

      {device.notes && (
        <Section title="Notes">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{device.notes}</p>
        </Section>
      )}
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        Created {new Date(device.createdAt).toLocaleString()} · Updated {new Date(device.updatedAt).toLocaleString()}
      </div>
    </>
  );
}

function RackDetail({ rack, devices, onRefresh, toast }: { rack: Rack; devices: Device[]; onRefresh: () => void; toast: (m: string) => void }) {
  const usedU = devices.reduce((s, d) => s + (d.uHeight ?? 1), 0);
  const pct   = rack.totalU > 0 ? Math.min(100, Math.round(usedU / rack.totalU * 100)) : 0;
  const statuses: RackStatus[] = ['active', 'maintenance', 'decommissioned'];
  const barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#3b82f6';

  async function cycleStatus() {
    const current = rack.status ?? 'active';
    const next = statuses[(statuses.indexOf(current) + 1) % statuses.length];
    await putRack({ ...rack, status: next, updatedAt: Date.now() });
    toast(`Status → ${next}`);
    onRefresh();
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '0.4rem' }}>{rack.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{rack.location}</span>
            {rack.status && <StatusBadge status={rack.status} />}
          </div>
        </div>
        <button className="btn-secondary" onClick={cycleStatus} style={{ fontSize: '0.8rem' }}>
          <CycleIcon /> Toggle Status
        </button>
      </div>

      <Section title="Capacity">
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Used</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{usedU}/{rack.totalU}U · {pct}%</span>
          </div>
          <div className="cap-bar-track" style={{ height: 6 }}>
            <div className="cap-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
          </div>
        </div>
        <Row label="Total Size"        value={`${rack.totalU}U`} />
        <Row label="Devices Installed" value={devices.length} />
        <Row label="Free Space"        value={`${rack.totalU - usedU}U`} />
      </Section>

      <Section title="Details">
        <Row label="Rack Number"  value={rack.rackNumber} />
        <Row label="Location"     value={rack.location} />
        <Row label="Room"         value={rack.room} />
        <Row label="Row"          value={rack.row} />
        <Row label="Total Units"  value={rack.totalU ? `${rack.totalU}U` : undefined} />
        <Row label="Manufacturer" value={rack.manufacturer} />
        <Row label="Power (A)"    value={rack.powerAmps} />
        <Row label="Tech"         value={rack.tech} />
      </Section>

      {rack.description && (
        <Section title="Notes">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{rack.description}</p>
        </Section>
      )}

      {devices.length > 0 && (
        <Section title={`Installed Devices (${devices.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[...devices].sort((a, b) => (a.uPosition ?? 99) - (b.uPosition ?? 99)).map(d => (
              <div
                key={d.id}
                onClick={() => navigate(`device/${d.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseOut={e  => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{d.name}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{d.type}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {d.uPosition && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>U{d.uPosition}</span>}
                  <StatusBadge status={d.status} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        Created {new Date(rack.createdAt).toLocaleString()}
      </div>
    </>
  );
}

function CableDetail({ cable, onRefresh, toast }: { cable: Cable; onRefresh: () => void; toast: (m: string) => void }) {
  const statuses: CableStatus[] = ['active', 'spare', 'faulty'];
  const nearEnd = cable.nearEnd || cable.fromPort || '';
  const farEnd  = cable.farEnd  || cable.toPort   || '';

  async function cycleStatus() {
    const next = statuses[(statuses.indexOf(cable.status) + 1) % statuses.length];
    await putCable({ ...cable, status: next, updatedAt: Date.now() });
    toast(`Status → ${next}`);
    onRefresh();
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: '0.4rem' }}>{cable.label}</h1>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className="badge badge-blue">{cable.type}</span>
            <StatusBadge status={cable.status} />
          </div>
        </div>
        <button className="btn-secondary" onClick={cycleStatus} style={{ fontSize: '0.8rem' }}>
          <CycleIcon /> Toggle Status
        </button>
      </div>

      <Section title="Cable Details">
        <Row label="Number / ID"  value={cable.cableNumber} />
        <Row label="Label Name"   value={cable.labelName} />
        <Row label="Type"         value={cable.type} />
        <Row label="Length"       value={`${cable.lengthM}m`} />
        <Row label="Color"        value={cable.color} />
        <Row label="Tech"         value={cable.tech} />
      </Section>

      <Section title="Connections">
        {nearEnd
          ? <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <EndpointBox label="Near End" value={nearEnd} />
              <span style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>→</span>
              <EndpointBox label="Far End" value={farEnd || '—'} />
            </div>
          : <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem 0' }}>No connection endpoints recorded</div>
        }
      </Section>

      {cable.notes && (
        <Section title="Notes">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{cable.notes}</p>
        </Section>
      )}
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        Created {new Date(cable.createdAt).toLocaleString()}
      </div>
    </>
  );
}

function EndpointBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '0.6rem 0.85rem', border: '1px solid var(--border)', minWidth: 120 }}>
      <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: '0.2rem' }}>{label}</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{value}</div>
    </div>
  );
}

function BackIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>; }
function CycleIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>; }
