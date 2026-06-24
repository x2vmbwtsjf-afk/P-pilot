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
        () => { /* scan attempt — ignore per-frame errors */ }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.toLowerCase().includes('permission')
        ? 'Camera permission denied. Please allow camera access in your browser settings and try again.'
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

    // Extract kind/id from URL hash
    let kind = '', id = '';
    try {
      const url = new URL(text);
      const hash = url.hash.replace(/^#\/?/, '');
      const parts = hash.split('/');
      kind = parts[0] ?? '';
      id   = parts[1] ?? '';
    } catch (_) {
      // Maybe raw path like "device/abc123"
      const parts = text.replace(/^#\/?/, '').split('/');
      kind = parts[0] ?? '';
      id   = parts[1] ?? '';
    }

    if (!kind || !id || !['device','rack','cable'].includes(kind)) {
      setState('found'); // show raw result, no navigation
      return;
    }

    // Check if item exists
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
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Scanner</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Scan a P-Pilot QR code to navigate to any asset</p>
      </div>

      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>

          {state === 'idle' && (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Ready to Scan</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                Point your camera at a P-Pilot QR code to instantly open that asset's detail page.
              </p>
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={startScanner}>
                <CameraIcon /> Start Camera
              </button>
            </>
          )}

          {state === 'scanning' && (
            <>
              <div id={divId} style={{ width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: '1rem', border: '2px solid rgba(0,212,255,0.4)' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>Align the QR code within the frame</p>
              <button className="btn-secondary" onClick={reset}>Stop Camera</button>
            </>
          )}

          {state === 'found' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#00FF94', marginBottom: '0.5rem' }}>QR Code Scanned!</h3>
              {result && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', wordBreak: 'break-all', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {result}
                </div>
              )}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>Navigating to asset…</p>
              <button className="btn-secondary" onClick={reset}>Scan Another</button>
            </>
          )}

          {state === 'notfound' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#ffb700', marginBottom: '0.5rem' }}>Asset Not Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                This QR code points to an item that doesn't exist in the database.
              </p>
              {result && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.6rem', marginBottom: '1rem', wordBreak: 'break-all', fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {result}
                </div>
              )}
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={reset}>Try Again</button>
            </>
          )}

          {state === 'error' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#ff4d4d', marginBottom: '0.5rem' }}>Camera Error</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>{error}</p>
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={reset}>Try Again</button>
            </>
          )}
        </div>

        {(state === 'idle' || state === 'error' || state === 'notfound') && (
          <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Or paste a QR URL manually
            </h4>
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
        <input className="input" value={val} onChange={e => { setVal(e.target.value); setNotFound(false); }}
          placeholder="Paste QR URL here…"
          onKeyDown={e => e.key === 'Enter' && go()} />
        <button className="btn-primary" onClick={go} disabled={checking} style={{ whiteSpace: 'nowrap' }}>
          {checking ? '…' : 'Go'}
        </button>
      </div>
      {notFound && <div style={{ fontSize: '0.75rem', color: '#ff4d4d', marginTop: '0.4rem' }}>Item not found in database.</div>}
    </div>
  );
}

function CameraIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }
