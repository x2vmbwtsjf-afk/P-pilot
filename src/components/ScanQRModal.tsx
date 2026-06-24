import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getDevice, getRack, getCable } from '../db';
import { navigate } from '../App';

type ScanState = 'scanning' | 'found' | 'notfound' | 'external' | 'error';

interface Props {
  onClose: () => void;
  onAddNew?: (prefillId: string) => void;
}

export default function ScanQRModal({ onClose, onAddNew }: Props) {
  const [state, setState]      = useState<ScanState>('scanning');
  const [error, setError]      = useState('');
  const [scannedUrl, setScannedUrl] = useState('');
  const [scannedKind, setScannedKind] = useState('');
  const [scannedId, setScannedId]   = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divId = 'scan-modal-reader';

  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
  }, []);

  async function startScanner() {
    // small delay to let the modal DOM render
    await new Promise(r => setTimeout(r, 120));
    try {
      const scanner = new Html5Qrcode(divId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => handleScan(decoded),
        () => {}
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.toLowerCase().includes('permission')
        ? 'Camera permission denied. Please allow camera access in your browser settings.'
        : msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no device')
        ? 'No camera found on this device.'
        : `Camera error: ${msg}`;
      setError(friendly);
      setState('error');
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (_) {}
      scannerRef.current = null;
    }
  }

  async function handleScan(text: string) {
    await stopScanner();
    setScannedUrl(text);

    // Parse kind + id from URL
    let kind = '', id = '';
    try {
      const url = new URL(text);
      const hash = url.hash.replace(/^#\/?/, '');
      const parts = hash.split('/');
      kind = parts[0] ?? '';
      id   = parts[1] ?? '';
    } catch (_) {
      const parts = text.replace(/^#\/?/, '').split('/');
      kind = parts[0] ?? '';
      id   = parts[1] ?? '';
    }

    if (!kind || !id || !['device', 'rack', 'cable'].includes(kind)) {
      setState('external');
      return;
    }

    setScannedKind(kind);
    setScannedId(id);

    try {
      let exists = false;
      if (kind === 'device') exists = !!(await getDevice(id));
      if (kind === 'rack')   exists = !!(await getRack(id));
      if (kind === 'cable')  exists = !!(await getCable(id));

      if (exists) {
        setState('found');
        setTimeout(() => { onClose(); navigate(`${kind}/${id}`); }, 500);
      } else {
        setState('notfound');
      }
    } catch (_) {
      setState('notfound');
    }
  }

  function handleAddNew() {
    onClose();
    onAddNew?.(scannedId);
  }

  function openExternal() {
    window.open(scannedUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Scan QR Code</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>

        {/* Camera view — always in DOM so html5-qrcode can mount */}
        <div
          id={divId}
          style={{
            width: '100%',
            borderRadius: 10,
            overflow: 'hidden',
            border: '2px solid rgba(0,212,255,0.35)',
            display: state === 'scanning' ? 'block' : 'none',
            marginBottom: '1rem',
          }}
        />

        {state === 'scanning' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Align a P-Pilot QR code within the frame
            </p>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        )}

        {state === 'found' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#00FF94', marginBottom: '0.25rem' }}>Found!</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Navigating to {scannedKind}…</div>
          </div>
        )}

        {state === 'notfound' && (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffb700', marginBottom: '0.4rem' }}>Item Not Found</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.6 }}>
              This QR code points to a <strong style={{ color: 'var(--text-secondary)' }}>{scannedKind}</strong> with ID
              <code style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.3rem', wordBreak: 'break-all', color: 'var(--accent-blue)' }}>{scannedId}</code>
              which doesn't exist in the database.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={onClose}>Close</button>
              <button className="btn-primary" onClick={handleAddNew}>
                <PlusIcon /> Add New Item
              </button>
            </div>
          </div>
        )}

        {state === 'external' && (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌐</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>External QR Code</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              This QR is not linked to a P-Pilot item.
            </p>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.6rem 0.75rem', marginBottom: '1rem', wordBreak: 'break-all', fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--accent-blue)', textAlign: 'left' }}>
              {scannedUrl}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={onClose}>Close</button>
              <button className="btn-primary" onClick={openExternal}>
                <ExternalIcon /> Open URL
              </button>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ff4d4d', marginBottom: '0.5rem' }}>Camera Error</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>{error}</p>
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function ExternalIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
}
