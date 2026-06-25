import { useState } from 'react';
import type { Rack, Device, DeviceType } from '../types';

const TYPE_COLOR: Record<DeviceType, string> = {
  server:        '#3b82f6',
  switch:        '#10b981',
  router:        '#8b5cf6',
  firewall:      '#ef4444',
  storage:       '#f59e0b',
  ups:           '#f97316',
  pdu:           '#6366f1',
  'patch-panel': '#64748b',
  other:         '#6b7280',
};

const TYPE_LABEL: Record<DeviceType, string> = {
  server:        'SRV',
  switch:        'SW',
  router:        'RTR',
  firewall:      'FW',
  storage:       'STG',
  ups:           'UPS',
  pdu:           'PDU',
  'patch-panel': 'PP',
  other:         '—',
};

const U_PX = 26;
const LABEL_W = 38;

interface Props {
  rack: Rack;
  devices: Device[];
}

export default function RackDiagram({ rack, devices }: Props) {
  const [sel, setSel] = useState<Device | null>(null);
  const totalU = rack.totalU;

  // Map each U slot → device (using the first U of its span as the anchor)
  const slotMap = new Map<number, Device>();
  const topSlot = new Map<string, number>();
  for (const dev of devices) {
    const pos = dev.uPosition;
    if (!pos) continue;
    const h = dev.uHeight ?? dev.uSize ?? 1;
    topSlot.set(dev.id, pos);
    for (let u = pos; u < pos + h; u++) {
      if (!slotMap.has(u)) slotMap.set(u, dev);
    }
  }

  // Devices with no uPosition — shown below the rack
  const unpositioned = devices.filter(d => !d.uPosition);

  const rendered = new Set<string>();

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* ── Rack diagram ─────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '1rem 1rem 0.75rem',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontFamily: 'monospace' }}>
          {rack.name} · {totalU}U · {rack.location}{rack.row ? ` · Row ${rack.row}` : ''}
        </div>

        <div style={{ display: 'flex' }}>
          {/* U-number labels */}
          <div style={{ width: LABEL_W, flexShrink: 0 }}>
            {Array.from({ length: totalU }, (_, i) => i + 1).map(u => (
              <div key={u} style={{
                height: U_PX,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '0.4rem',
                fontSize: '0.6rem',
                color: u % 5 === 0 ? 'var(--text-muted)' : '#2a3444',
                fontFamily: 'monospace',
                borderBottom: '1px solid transparent',
              }}>
                {u % 5 === 0 || u === 1 || u === totalU ? `${u}U` : ''}
              </div>
            ))}
          </div>

          {/* Rack body */}
          <div style={{
            width: 340,
            border: '2px solid #1e2d42',
            borderRadius: '0 4px 4px 0',
            overflow: 'hidden',
            background: '#08111e',
            position: 'relative',
          }}>
            {Array.from({ length: totalU }, (_, i) => {
              const u = i + 1;
              const dev = slotMap.get(u);

              if (!dev) {
                return (
                  <div key={u} style={{
                    height: U_PX,
                    borderBottom: '1px solid #101b28',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '0.5rem',
                  }} />
                );
              }

              if (rendered.has(dev.id)) return null;
              rendered.add(dev.id);

              const h = dev.uHeight ?? dev.uSize ?? 1;
              const color = TYPE_COLOR[dev.type] ?? '#6b7280';
              const isSelected = sel?.id === dev.id;

              return (
                <div
                  key={dev.id}
                  title={dev.name}
                  onClick={() => setSel(prev => prev?.id === dev.id ? null : dev)}
                  style={{
                    height: h * U_PX - 1,
                    background: isSelected ? `${color}44` : `${color}18`,
                    borderLeft: `3px solid ${color}`,
                    borderBottom: '1px solid #101b28',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '0.5rem',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                    outline: isSelected ? `1px solid ${color}88` : 'none',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = `${color}30`; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = `${color}18`; }}
                >
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color,
                    background: `${color}22`,
                    padding: '0 0.25rem',
                    borderRadius: '2px',
                    flexShrink: 0,
                    fontFamily: 'monospace',
                  }}>
                    {TYPE_LABEL[dev.type] ?? '?'}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {dev.name}
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    color: 'var(--text-muted)',
                    marginLeft: 'auto',
                    paddingRight: '0.4rem',
                    flexShrink: 0,
                  }}>
                    {h}U
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unpositioned devices */}
        {unpositioned.length > 0 && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Unpositioned</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {unpositioned.map(dev => {
                const color = TYPE_COLOR[dev.type] ?? '#6b7280';
                const isSelected = sel?.id === dev.id;
                return (
                  <button
                    key={dev.id}
                    onClick={() => setSel(prev => prev?.id === dev.id ? null : dev)}
                    style={{
                      background: isSelected ? `${color}40` : `${color}18`,
                      border: `1px solid ${color}55`,
                      borderRadius: '0.3rem',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.7rem',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    {dev.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ marginTop: '0.85rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {(Object.entries(TYPE_COLOR) as [DeviceType, string][])
            .filter(([type]) => devices.some(d => d.type === type))
            .map(([type, color]) => (
              <span key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
                {type}
              </span>
            ))
          }
        </div>
      </div>

      {/* ── Device info panel ────────────────────────────── */}
      {sel && (
        <div style={{
          background: 'var(--bg-card)',
          border: `1px solid ${TYPE_COLOR[sel.type] ?? '#334155'}55`,
          borderRadius: '0.75rem',
          padding: '1.1rem',
          minWidth: 230,
          maxWidth: 310,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{sel.name}</div>
              <div style={{ fontSize: '0.68rem', color: TYPE_COLOR[sel.type] ?? '#64748b', marginTop: '0.1rem' }}>{sel.type}</div>
            </div>
            <button
              onClick={() => setSel(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.15rem', lineHeight: 1, padding: '0 0 0 0.5rem', flexShrink: 0 }}
            >×</button>
          </div>

          {sel.hostname       && <InfoRow label="Hostname" value={sel.hostname} mono />}
          {(sel.ip ?? sel.ipAddress) && <InfoRow label="IP" value={(sel.ip ?? sel.ipAddress)!} mono />}
          {sel.managementIp   && <InfoRow label="Mgmt IP" value={sel.managementIp} mono />}
          {sel.serial         && <InfoRow label="Serial" value={sel.serial} mono />}
          {sel.manufacturer   && <InfoRow label="Make" value={sel.manufacturer} />}
          {sel.model          && <InfoRow label="Model" value={sel.model} />}
          {sel.os             && <InfoRow label="OS" value={sel.os} />}
          <InfoRow label="Status" value={sel.status}
            valueStyle={{ color: sel.status === 'online' ? '#10b981' : sel.status === 'offline' ? '#ef4444' : '#f59e0b' }}
          />
          {sel.uPosition && (
            <InfoRow label="Position"
              value={`U${sel.uPosition}–U${sel.uPosition + (sel.uHeight ?? sel.uSize ?? 1) - 1}`}
              mono
            />
          )}
          {sel.ports          && <InfoRow label="Ports" value={`${sel.ports}`} />}
          {sel.vlan           && <InfoRow label="VLAN" value={sel.vlan} />}
          {sel.capacityVA     && <InfoRow label="Capacity" value={`${sel.capacityVA} VA`} />}
          {sel.tech           && <InfoRow label="Tech" value={sel.tech} />}

          {sel.notes && (
            <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)', fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {sel.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono, valueStyle }: {
  label: string;
  value: string;
  mono?: boolean;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
      <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: '0.72rem',
        color: 'var(--text-primary)',
        fontFamily: mono ? 'monospace' : undefined,
        textAlign: 'right',
        wordBreak: 'break-all',
        ...valueStyle,
      }}>{value}</span>
    </div>
  );
}
