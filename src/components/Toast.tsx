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

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        zIndex: 999, pointerEvents: 'none',
      }}>
        {items.map(item => (
          <div key={item.id} style={{
            padding: '0.7rem 1.1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: '#fff',
            pointerEvents: 'auto',
            animation: 'fadeIn 0.2s ease',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: item.type === 'success'
              ? 'linear-gradient(135deg,#0d9f6e,#00c27a)'
              : item.type === 'error'
              ? 'linear-gradient(135deg,#c0392b,#e74c3c)'
              : 'linear-gradient(135deg,#1565c0,#1976d2)',
          }}>
            {item.type === 'success' ? '✓' : item.type === 'error' ? '✕' : 'ℹ'}
            {item.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
