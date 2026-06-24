import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { navigate } from '../App';

type ScanState = 'idle' | 'scanning' | 'found' | 'error';

export default function Scanner() {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const divId = 'qr-scanner-container';

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  async function startScanner() {
    setState('scanning');
    setError('');
    setResult(null);

    try {
      const scanner = new Html5Qrcode(divId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScan(decodedText);
        },
        () => { /* ignore scan errors */ }
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('permission') ? 'Camera permission denied. Please allow camera access and try again.' : 'Could not start camera: ' + msg);
      setState('error');
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) { /* ignore */ }
      scannerRef.current = null;
    }
  }

  async function handleScan(text: string) {
    await stopScanner();
    setResult(text);
    setState('found');

    // Try to extract a hash route from the URL
    try {
      const url = new URL(text);
      const hash = url.hash;
      if (hash) {
        const route = hash.replace(/^#\/?/, '');
        setTimeout(() => navigate(route), 800);
        return;
      }
    } catch (_) { /* not a URL */ }

    // Maybe it's just a path fragment
    if (text.includes('/')) {
      const parts = text.split('/').filter(Boolean);
      if (['device','rack','cable'].includes(parts[0]) && parts[1]) {
        setTimeout(() => navigate(`${parts[0]}/${parts[1]}`), 800);
      }
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
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Scan a QR code to jump to any asset's detail page</p>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          {state === 'idle' && (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Ready to Scan</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Point your camera at a P-Pilot QR code to instantly navigate to that asset.
              </p>
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={startScanner}>
                <CameraIcon /> Start Camera
              </button>
            </>
          )}

          {state === 'scanning' && (
            <>
              <div
                id={divId}
                style={{ width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: '1rem', border: '2px solid rgba(0,212,255,0.3)' }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                Align QR code within the frame
              </p>
              <button className="btn-secondary" onClick={reset}>Stop</button>
            </>
          )}

          {state === 'found' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#00FF94', marginBottom: '0.5rem' }}>QR Code Scanned!</h3>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', wordBreak: 'break-all', fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                {result}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>Navigating to asset…</p>
              <button className="btn-secondary" onClick={reset}>Scan Another</button>
            </>
          )}

          {state === 'error' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚠️</div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', color: '#ff4d4d', marginBottom: '0.5rem' }}>Camera Error</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error}</p>
              <button className="btn-primary" style={{ margin: '0 auto' }} onClick={reset}>Try Again</button>
            </>
          )}
        </div>

        {/* Manual URL input */}
        {(state === 'idle' || state === 'error') && (
          <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Or enter a QR code URL manually
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
  function go() {
    if (!val.trim()) return;
    try {
      const url = new URL(val.trim());
      const hash = url.hash.replace(/^#\/?/, '');
      if (hash) { navigate(hash); return; }
    } catch (_) { /* not a URL */ }
    navigate(val.trim().replace(/^#\/?/, ''));
  }
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <input className="input" value={val} onChange={e => setVal(e.target.value)} placeholder="Paste QR URL here..." onKeyDown={e => e.key === 'Enter' && go()} />
      <button className="btn-primary" onClick={go} style={{ whiteSpace: 'nowrap' }}>Go</button>
    </div>
  );
}

function CameraIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
}
