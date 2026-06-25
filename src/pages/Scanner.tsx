import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getDevice, getRack, getCable } from '../db';
import { navigate } from '../App';

type ScanState = 'idle' | 'scanning' | 'found' | 'notfound' | 'error';

export default function Scanner() {
  const [state, setState]   = useState<ScanState>('idle');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError]   = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divId = 'qr-reader';

  useEffect(() => () => { stopScanner(); }, []);

  async function startScanner() {
    setState('scanning');
    setError('');
    setResult(null);
    try {
      const scanner = new Html5Qrcode(divId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => handleScan(decoded),
        () => { /* per-frame scan attempt — ignore */ }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.toLowerCase().includes('permission')
        ? 'Camera permission denied. Please allow camera access and try again.'
        : msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no device')
        ? 'No camera found. Please connect a camera and try again.'
        : `Camera error: ${msg}`;
      setError(friendly);
      setState('error');
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (_) { /* ignore */ }
      scannerRef.current = null;
    }
  }

  async function handleScan(text: string) {
    await stopScanner();
    setResult(text);

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

    if (!kind || !id || !['device','rack','cable'].includes(kind)) {
      setState('found');
      return;
    }

    try {
      let exists = false;
      if (kind === 'device') exists = !!(await getDevice(id));
      if (kind === 'rack')   exists = !!(await getRack(id));
      if (kind === 'cable')  exists = !!(await getCable(id));

      if (exists) {
        setState('found');
        setTimeout(() => navigate(`${kind}/${id}`), 600);
      } else {
        setState('notfound');
      }
    } catch (_) {
      setState('notfound');
    }
  }

  async function reset() {
    await stopScanner();
    setState('idle');
    setResult(null);
    setError('');
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Scanner</h1>
          <p className="page-sub">Scan a P-Pilot QR code to navigate to any asset</p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>

          {state === 'idle' && (
            <>
              <div style={{ marginBottom: '1.25rem', color: 'var(--text-muted)' }}>
                <CameraIcon size={40} />
              </div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Ready to Scan</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                Point your camera at a P-Pilot QR code to instantly open that asset's detail page.
              </p>
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={startScanner}>
                <CameraIconSmall /> Start Camera
              </button>
            </>
          )}

          {state === 'scanning' && (
            <>
              <div id={divId} style={{ width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: '1rem', border: '1px solid var(--accent-blue)', boxShadow: '0 0 20px var(--blue-glow)' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>Align the QR code within the frame</p>
              <button className="btn-secondary" onClick={reset}>Stop Camera</button>
            </>
          )}

          {state === 'found' && (
            <>
              <div style={{ marginBottom: '0.85rem', color: '#10b981' }}>
                <CheckIcon size={36} />
              </div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#10b981', marginBottom: '0.5rem' }}>QR Code Scanned</h3>
              {result && (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.6rem', marginBottom: '1rem', wordBreak: 'break-all', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {result}
                </div>
              )}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>Navigating to asset…</p>
              <button className="btn-secondary" onClick={reset}>Scan Another</button>
            </>
          )}

          {state === 'notfound' && (
            <>
              <div style={{ marginBottom: '0.85rem', color: '#f59e0b' }}>
                <WarnIcon size={36} />
              </div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#f59e0b', marginBottom: '0.5rem' }}>Asset Not Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem', lineHeight: 1.7 }}>
                This QR code points to an item that doesn't exist in the database.
              </p>
              {result && (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.6rem', marginBottom: '1rem', wordBreak: 'break-all', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {result}
                </div>
              )}
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={reset}>Try Again</button>
            </>
          )}

          {state === 'error' && (
            <>
              <div style={{ marginBottom: '0.85rem', color: '#ef4444' }}>
                <ErrorIcon size={36} />
              </div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#ef4444', marginBottom: '0.5rem' }}>Camera Error</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem', lineHeight: 1.7 }}>{error}</p>
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={reset}>Try Again</button>
            </>
          )}
        </div>

        {(state === 'idle' || state === 'error' || state === 'notfound') && (
          <div className="card" style={{ padding: '1.25rem', marginTop: '0.85rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Or paste a QR URL manually
            </div>
            <ManualInput />
          </div>
        )}
      </div>
    </div>
  );
}

function ManualInput() {
  const [val, setVal] = useState('');
  const [checking, setChecking] = useState(false);
  const [notFound, setNotFound] = useState(false);

  async function go() {
    const raw = val.trim();
    if (!raw) return;
    setChecking(true);
    setNotFound(false);

    let kind = '', id = '';
    try {
      const url = new URL(raw);
      const hash = url.hash.replace(/^#\/?/, '');
      const parts = hash.split('/');
      kind = parts[0]; id = parts[1];
    } catch (_) {
      const parts = raw.replace(/^#\/?/, '').split('/');
      kind = parts[0]; id = parts[1];
    }

    if (kind && id && ['device','rack','cable'].includes(kind)) {
      try {
        let exists = false;
        if (kind === 'device') exists = !!(await getDevice(id));
        if (kind === 'rack')   exists = !!(await getRack(id));
        if (kind === 'cable')  exists = !!(await getCable(id));
        if (exists) { navigate(`${kind}/${id}`); return; }
      } catch (_) { /* fall through */ }
      setNotFound(true);
    } else {
      navigate(raw.replace(/^#\/?/, ''));
    }
    setChecking(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          className="input"
          value={val}
          onChange={e => { setVal(e.target.value); setNotFound(false); }}
          placeholder="Paste QR URL here…"
          onKeyDown={e => e.key === 'Enter' && go()}
        />
        <button className="btn-primary" onClick={go} disabled={checking} style={{ whiteSpace: 'nowrap' }}>
          {checking ? '…' : 'Go'}
        </button>
      </div>
      {notFound && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.4rem' }}>Item not found in database.</div>}
    </div>
  );
}

function CameraIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
    </svg>
  );
}
function CameraIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
    </svg>
  );
}
function CheckIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}
function WarnIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}
function ErrorIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
