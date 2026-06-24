import { useEffect, useState } from 'react';
import { getRacks, getDevices, getCables } from '../db';
import type { Rack, Device, Cable } from '../types';
import { navigate } from '../App';

export default function Dashboard() {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [cables, setCables] = useState<Cable[]>([]);

  useEffect(() => {
    Promise.all([getRacks(), getDevices(), getCables()]).then(([r, d, c]) => {
      setRacks(r ?? []);
      setDevices(d ?? []);
      setCables(c ?? []);
    });
  }, []);

  const online = devices.filter(d => d.status === 'online').length;
  const offline = devices.filter(d => d.status === 'offline').length;
  const activeC = cables.filter(c => c.status === 'active').length;
  const usedU = devices.reduce((s, d) => s + (d.uHeight ?? 1), 0);
  const totalU = racks.reduce((s, r) => s + r.totalU, 0);

  const recentDevices = [...devices].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Data center infrastructure overview</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon="🖥️" label="Total Devices" value={devices.length} sub={`${online} online`} color="#00D4FF" />
        <StatCard icon="🗄️" label="Racks" value={racks.length} sub={`${totalU}U total`} color="#00FF94" />
        <StatCard icon="🔌" label="Cables" value={cables.length} sub={`${activeC} active`} color="#a78bfa" />
        <StatCard icon="⚠️" label="Offline" value={offline} sub="devices down" color="#ff4d4d" />
        <StatCard icon="📊" label="Rack Fill" value={totalU > 0 ? `${Math.round(usedU / totalU * 100)}%` : '–'} sub={`${usedU}U used`} color="#ffb700" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Devices */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Recent Devices</h3>
            <button className="btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => navigate('devices')}>
              View all
            </button>
          </div>
          {recentDevices.length === 0 ? (
            <Empty text="No devices yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentDevices.map(d => (
                <div
                  key={d.id}
                  onClick={() => navigate(`device/${d.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.type} • {d.serial}</div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { label: 'Add Device',   icon: '🖥️', target: 'devices' },
              { label: 'Add Rack',     icon: '🗄️', target: 'racks' },
              { label: 'Add Cable',    icon: '🔌', target: 'cables' },
              { label: 'Scan QR Code', icon: '📷', target: 'scanner' },
              { label: 'Generate QR',  icon: '🏷️', target: 'qr-studio' },
            ].map(({ label, icon, target }) => (
              <button
                key={label}
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', width: '100%' }}
                onClick={() => navigate(target)}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Racks fill */}
        {racks.length > 0 && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Rack Capacity</h3>
              <button className="btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => navigate('racks')}>
                View all
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {racks.slice(0, 5).map(rack => {
                const used = devices.filter(d => d.rackId === rack.id).reduce((s, d) => s + (d.uHeight ?? 1), 0);
                const pct = Math.min(100, Math.round(used / rack.totalU * 100));
                return (
                  <div key={rack.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rack.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{used}/{rack.totalU}U</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, width: `${pct}%`,
                        background: pct > 90 ? '#ff4d4d' : pct > 70 ? '#ffb700' : 'linear-gradient(90deg, #00D4FF, #00FF94)',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block', marginTop: 2 }} />
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.3rem' }}>{label}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'online' ? 'badge-online' : status === 'offline' ? 'badge-offline' : 'badge-standby';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
      {text}
    </div>
  );
}
