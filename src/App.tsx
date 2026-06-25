import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Racks from './pages/Racks';
import Devices from './pages/Devices';
import Cables from './pages/Cables';
import QRStudio from './pages/QRStudio';
import Scanner from './pages/Scanner';
import DetailPage from './pages/DetailPage';
import './index.css';

export type Route =
  | { page: 'dashboard' }
  | { page: 'racks' }
  | { page: 'devices' }
  | { page: 'cables' }
  | { page: 'qr-studio' }
  | { page: 'scanner' }
  | { page: 'detail'; kind: string; id: string };

function parseHash(hash: string): Route {
  const h = hash.replace(/^#\/?/, '');
  const parts = h.split('/');
  if (parts[0] === 'device' && parts[1]) return { page: 'detail', kind: 'device', id: parts[1] };
  if (parts[0] === 'rack'   && parts[1]) return { page: 'detail', kind: 'rack',   id: parts[1] };
  if (parts[0] === 'cable'  && parts[1]) return { page: 'detail', kind: 'cable',  id: parts[1] };
  if (parts[0] === 'racks')     return { page: 'racks' };
  if (parts[0] === 'devices')   return { page: 'devices' };
  if (parts[0] === 'cables')    return { page: 'cables' };
  if (parts[0] === 'qr-studio') return { page: 'qr-studio' };
  if (parts[0] === 'scanner')   return { page: 'scanner' };
  return { page: 'dashboard' };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function renderPage() {
    switch (route.page) {
      case 'dashboard':  return <Dashboard />;
      case 'racks':      return <Racks />;
      case 'devices':    return <Devices />;
      case 'cables':     return <Cables />;
      case 'qr-studio':  return <QRStudio />;
      case 'scanner':    return <Scanner />;
      case 'detail':     return <DetailPage kind={route.kind} id={route.id} />;
      default:           return <Dashboard />;
    }
  }

  const currentPage = route.page === 'detail' ? '' : route.page;

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', position: 'relative' }}>
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar current={currentPage} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile header */}
        <div style={{
          display: 'none',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--sidebar-bg)',
        }} id="mobile-header">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontWeight: 700,
            fontSize: '0.9rem',
            letterSpacing: '0.1em',
            color: 'var(--text-primary)',
          }}>
            P-PILOT
          </span>
        </div>

        <main style={{ flex: 1, padding: '1.75rem', overflowY: 'auto', maxWidth: '100%' }}>
          {renderPage()}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #mobile-header { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
