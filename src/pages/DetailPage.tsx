import { useEffect, useState } from 'react';
import { getDevice, getRack, getCable, getDevices, putDevice, putCable } from '../db';
import type { Device, Rack, Cable, DeviceStatus, CableStatus } from '../types';
import { navigate } from '../App';
import { useToast } from '../components/Toast';
import QRCode from 'qrcode';

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
    QRCode.toDataURL(`${base}#/${kind}/${id}`, { width: 180, margin: 1, color: { dark: '#0a0e1a', light: '#ffffff' } })
      .then(setQrUrl).catch(() => {});
  }

  useEffect(() => { load(); }, [kind, id]);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: '2rem' }}>Loading…</div>;
  if (!item)   return (
    <div style={{ textAlign: 'center', padding: '3rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
      <div style={{ color: 'var(--text-muted)' }}>Item not found</div>
      <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate('')}>Dashboard</button>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <button className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => history.back()}>← Back</button>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <a onClick={() => navigate(`${kind}s`)} href={`#/${kind}s`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', cursor: 'pointer' }}>
            {kind.charAt(0).toUpperCase() + kind.slice(1)}s
          </a>{' '}/ Detail
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          {kind === 'device' && <DeviceDetail device={item as Device} rackName={extra.rackName} onRefresh={load} toast={toast} />}
          {kind === 'rack'   && <RackDetail   rack={item as Rack}     devices={extra.devices ?? []} onRefresh={load} />}
          {kind === 'cable'  && <CableDetail  cable={item as Cable}   onRefresh={load} toast={toast} />}
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center', minWidth: 200 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>QR Code</div>
          {qrUrl
            ? <>
                <div style={{ background: '#fff', borderRadius: 8, padding: 8, display: 'inline-block', marginBottom: '0.75rem' }}>
                  <img src={qrUrl} alt="QR" style={{ display: 'block', width: 150, height: 150 }} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <a href={qrUrl} download={`qr-${id}.png`} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>Save</a>
                  <button className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => navigate('qr-studio')}>Studio</button>
                </div>
              </>
            : <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Generating…</div>
          }
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      <h3 style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.85rem' }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(30,45,74,0.4)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'online' || status === 'active' ? 'badge-online' : status === 'offline' || status === 'faulty' ? 'badge-offline' : status === 'standby' ? 'badge-standby' : 'badge-gray';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function DeviceDetail({ device, rackName, onRefresh, toast }: { device: Device; rackName?: string; onRefresh: () => void; toast: (m: string) => void }) {
  const statuses: DeviceStatus[] = ['online', 'standby', 'offline'];

  async function cycleStatus() {
    const next = statuses[(statuses.indexOf(device.status) + 1) % statuses.length];
    await putDevice({ ...device, status: next, updatedAt: Date.now() });
    toast(`Status → ${next}`);
    onRefresh();
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{device.name}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
            <span className="badge badge-blue">{device.type}</span>
            <StatusBadge status={device.status} />
          </div>
        </div>
        <button className="btn-secondary" onClick={cycleStatus} title="Cycle status">↻ Toggle Status</button>
      </div>
      <Section title="Identity">
        <Row label="Serial Number"  value={device.serial} />
        <Row label="Manufacturer"   value={device.manufacturer} />
        <Row label="Model"          value={device.model} />
        <Row label="IP Address"     value={device.ip} />
      </Section>
      <Section title="Location">
        <Row label="Rack"       value={rackName ?? (device.rackId || undefined)} />
        <Row label="U Position" value={device.uPosition ? `U${device.uPosition}` : undefined} />
        <Row label="U Height"   value={device.uHeight   ? `${device.uHeight}U`   : undefined} />
      </Section>
      {device.notes && (
        <Section title="Notes">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{device.notes}</p>
        </Section>
      )}
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        Created {new Date(device.createdAt).toLocaleString()} · Updated {new Date(device.updatedAt).toLocaleString()}
      </div>
    </>
  );
}

function RackDetail({ rack, devices, onRefresh }: { rack: Rack; devices: Device[]; onRefresh: () => void }) {
  const usedU = devices.reduce((s, d) => s + (d.uHeight ?? 1), 0);
  const pct   = rack.totalU > 0 ? Math.min(100, Math.round(usedU / rack.totalU * 100)) : 0;
  void onRefresh;

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{rack.name}</h1>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{rack.location}</div>
      </div>
      <Section title="Capacity">
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Used</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600 }}>{usedU}/{rack.totalU}U ({pct}%)</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: pct > 90 ? '#ff4d4d' : pct > 70 ? '#ffb700' : 'linear-gradient(90deg,#00D4FF,#00FF94)', transition: 'width 0.5s ease' }} />
          </div>
        </div>
        <Row label="Total Size"        value={`${rack.totalU}U`} />
        <Row label="Devices Installed" value={devices.length} />
        <Row label="Free Space"        value={`${rack.totalU - usedU}U`} />
      </Section>
      {rack.description && (
        <Section title="Description">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{rack.description}</p>
        </Section>
      )}
      {devices.length > 0 && (
        <Section title={`Installed Devices (${devices.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[...devices].sort((a, b) => (a.uPosition ?? 99) - (b.uPosition ?? 99)).map(d => (
              <div key={d.id} onClick={() => navigate(`device/${d.id}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseOut={e  => (e.currentTarget.style.background = 'var(--bg-secondary)')}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{d.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{d.type}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {d.uPosition && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>U{d.uPosition}</span>}
                  <StatusBadge status={d.status} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        Created {new Date(rack.createdAt).toLocaleString()}
      </div>
    </>
  );
}

function CableDetail({ cable, onRefresh, toast }: { cable: Cable; onRefresh: () => void; toast: (m: string) => void }) {
  const statuses: CableStatus[] = ['active', 'spare', 'faulty'];

  async function cycleStatus() {
    const next = statuses[(statuses.indexOf(cable.status) + 1) % statuses.length];
    await putCable({ ...cable, status: next, updatedAt: Date.now() });
    toast(`Status → ${next}`);
    onRefresh();
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{cable.label}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
            <span className="badge badge-blue">{cable.type}</span>
            <StatusBadge status={cable.status} />
          </div>
        </div>
        <button className="btn-secondary" onClick={cycleStatus}>↻ Toggle Status</button>
      </div>
      <Section title="Cable Details">
        <Row label="Type"   value={cable.type} />
        <Row label="Length" value={`${cable.lengthM}m`} />
        <Row label="Color"  value={cable.color} />
      </Section>
      <Section title="Connections">
        <Row label="From" value={cable.fromPort} />
        <Row label="To"   value={cable.toPort} />
      </Section>
      {cable.notes && (
        <Section title="Notes">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{cable.notes}</p>
        </Section>
      )}
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        Created {new Date(cable.createdAt).toLocaleString()}
      </div>
    </>
  );
}
