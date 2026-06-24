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
  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem 0.75rem',
      gap: '0.25rem',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflow: 'hidden auto',
      transition: 'transform 0.25s ease',
      zIndex: 50,
      ...(typeof window !== 'undefined' && window.innerWidth < 768 ? {
        position: 'fixed',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        left: 0,
        top: 0,
      } : {}),
    }}>
      {/* Logo */}
      <div style={{ padding: '0.5rem 0.5rem 1.25rem' }}>
        <div style={{
          fontWeight: 800,
          fontSize: '1.3rem',
          background: 'linear-gradient(90deg, #00D4FF, #00FF94)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em',
        }}>
          P-Pilot
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          DCIM Platform
        </div>
      </div>

      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', padding: '0 0.5rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
        Navigation
      </div>

      {links.map(({ id, label, icon: Icon }) => (
        <a
          key={id}
          className={`sidebar-link${current === id ? ' active' : ''}`}
          onClick={(e) => { e.preventDefault(); navigate(id === 'dashboard' ? '' : id); onClose(); }}
          href={`#${id}`}
        >
          <Icon size={16} />
          {label}
        </a>
      ))}

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF94', display: 'inline-block' }} />
          System Online
        </div>
      </div>
    </aside>
  );
}

function DashIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}
function RackIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  );
}
function DeviceIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
function CableIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9a2 2 0 0 0 2-2V5h12v2a2 2 0 0 0 4 0V3H2v2a2 2 0 0 0 2 2z"/><path d="M4 15a2 2 0 0 1 2 2v2h12v-2a2 2 0 0 1 4 0v2H2v-2a2 2 0 0 1 2-2z"/><line x1="12" y1="9" x2="12" y2="15"/>
    </svg>
  );
}
function QRIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
      <path d="M21 16h-3v3"/><path d="M21 21v.01"/><path d="M12 7v3h3"/><path d="M12 3v.01"/><path d="M12 12v.01"/><path d="M16 12v.01"/><path d="M7 12h.01"/>
    </svg>
  );
}
function ScanIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  );
}
