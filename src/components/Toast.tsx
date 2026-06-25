import { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void;
}

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current;
    setItems(prev => [...prev, { id, message, type }]);
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const toastBg: Record<ToastType, string> = {
    success: '#111118',
    error:   '#111118',
    info:    '#111118',
  };
  const toastBorder: Record<ToastType, string> = {
    success: 'rgba(16,185,129,0.3)',
    error:   'rgba(239,68,68,0.3)',
    info:    'rgba(59,130,246,0.3)',
  };
  const toastDot: Record<ToastType, string> = {
    success: '#10b981',
    error:   '#ef4444',
    info:    '#3b82f6',
  };

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        zIndex: 999,
        pointerEvents: 'none',
      }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              pointerEvents: 'auto',
              animation: 'fadeIn 0.2s ease',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: toastBg[item.type],
              border: `1px solid ${toastBorder[item.type]}`,
              backdropFilter: 'blur(8px)',
              minWidth: 200,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: toastDot[item.type], flexShrink: 0 }} />
            {item.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
