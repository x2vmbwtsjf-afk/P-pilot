import { useEffect, useState } from 'react';
import { navigate } from '../App';

interface SidebarProps {
  current: string;
  open: boolean;
  onClose: () => void;
}

const links = [
  { id: 'dashboard', label: 'Dashboard', icon: DashIcon },
  { id: 'racks',     label: 'Racks',     icon: RackIcon },
  { id: 'devices',   label: 'Devices',   icon: DeviceIcon },
  { id: 'cables',    label: 'Cables',    icon: CableIcon },
  { id: 'qr-studio', label: 'QR Studio', icon: QRIcon },
  { id: 'scanner',   label: 'Scanner',   icon: ScanIcon },
];

export default function Sidebar({ current, open, onClose }: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <>
      <aside style={{
        width: 240,
        minWidth: 240,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem 0 0',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        height: '100vh',
        overflow: 'hidden auto',
        transition: 'transform 0.25s ease',
        zIndex: 50,
        transform: isMobile ? (open ? 'translateX(0)' : 'translateX(-100%)') : 'none',
      }}>

        {/* Logo */}
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: 'var(--text-primary)',
            letterSpacing: '0.1em',
          }}>
            P-PILOT
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.2rem', letterSpacing: '0.05em' }}>
            DCIM Platform · v1.0
          </div>
        </div>

        {/* Navigation */}
        <div style={{ padding: '1rem 1.25rem 0.5rem' }}>
          <span className="section-label">Navigation</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '1px', padding: '0 0.75rem', flex: 1 }}>
          {links.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              className={`sidebar-link${current === id ? ' active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate(id === 'dashboard' ? '' : id); onClose(); }}
              href={`#${id}`}
            >
              <Icon size={15} />
              {label}
            </a>
          ))}
        </nav>

        {/* Bottom user strip */}
        <div style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              flexShrink: 0,
            }}>
              A
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.2 }}>Admin</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>Online</span>
              </div>
            </div>
          </div>
          <button
            style={{
              background: 'none',
              border: '1px solid transparent',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '0.25rem',
              borderRadius: '4px',
              display: 'flex',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            title="Settings"
            onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
            onMouseOut={e  => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'; }}
          >
            <SettingsIcon size={14} />
          </button>
        </div>
      </aside>

      {isMobile && <div style={{ width: 0 }} />}
    </>
  );
}

function DashIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
function RackIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  );
}
function DeviceIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function CableIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9a2 2 0 0 0 2-2V5h12v2a2 2 0 0 0 4 0V3H2v2a2 2 0 0 0 2 2z"/>
      <path d="M4 15a2 2 0 0 1 2 2v2h12v-2a2 2 0 0 1 4 0v2H2v-2a2 2 0 0 1 2-2z"/>
      <line x1="12" y1="9" x2="12" y2="15"/>
    </svg>
  );
}
function QRIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/>
      <rect x="3" y="16" width="5" height="5" rx="1"/>
      <path d="M21 16h-3v3"/><path d="M21 21v.01"/><path d="M12 7v3h3"/>
      <path d="M12 3v.01"/><path d="M12 12v.01"/><path d="M16 12v.01"/><path d="M7 12h.01"/>
    </svg>
  );
}
function ScanIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  );
}
function SettingsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
