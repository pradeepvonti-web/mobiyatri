import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/* ---------------- Toasts ---------------- */
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, tone = 'ok') => {
    const id = ++pushId;
    setToasts(t => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, left: 0, right: 0, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 20, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}
              style={{
                background: t.tone === 'err' ? 'var(--coral-deep)' : 'var(--ink)', color: '#fff',
                borderRadius: 999, padding: '12px 22px', fontWeight: 700, fontSize: 14,
                boxShadow: '0 10px 30px rgba(0,0,0,.25)', maxWidth: 'min(480px,90vw)', textAlign: 'center'
              }}>
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
let pushId = 0;
export const useToast = () => useContext(ToastCtx);

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, children, maxWidth = 460 }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={e => e.target === e.currentTarget && onClose?.()}
          style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(22,24,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          <motion.div initial={{ opacity: 0, y: 26, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 26, scale: .97 }}
            transition={{ duration: .22 }}
            style={{ width: '100%', maxWidth, background: 'var(--cream)', borderRadius: 26, boxShadow: '0 30px 80px rgba(0,0,0,.3)', maxHeight: '92vh', overflowY: 'auto', position: 'relative' }}>
            {onClose && (
              <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: '50%', background: '#fff', fontSize: 16, boxShadow: '0 2px 10px rgba(22,24,42,.12)', zIndex: 2 }}>✕</button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- Bits ---------------- */
export const Skeleton = ({ h = 18, w = '100%', r = 10, style }) => (
  <span style={{ display: 'block', height: h, width: w, borderRadius: r, background: 'linear-gradient(90deg,#E9E2D3 25%,#F3EDE1 50%,#E9E2D3 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.3s infinite linear', ...style }} />
);

export function Toggle({ on, onChange, disabled }) {
  return (
    <button onClick={() => !disabled && onChange(!on)} aria-pressed={on} disabled={disabled} style={{
      width: 52, height: 30, borderRadius: 999, position: 'relative', flex: 'none',
      background: on ? 'var(--indigo)' : '#D8D2C4', opacity: disabled ? .5 : 1, transition: 'background .18s'
    }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .18s', boxShadow: '0 1px 4px rgba(0,0,0,.25)' }} />
    </button>
  );
}

export const Badge = ({ children, tone = 'gold' }) => {
  const tones = {
    gold: ['#FFE9C9', '#8A5A00'], green: ['#DCEDDC', '#1F5B33'],
    indigo: ['#E2E4F5', '#33386E'], coral: ['#FFE1DB', '#C43A28'],
  };
  const [bg, fg] = tones[tone] || tones.gold;
  return <span style={{ fontSize: 11, fontWeight: 800, background: bg, color: fg, borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap' }}>{children}</span>;
};

export function Disclosure({ title, children, icon }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(22,24,42,.05)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', textAlign: 'left', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <span style={{ flex: 1 }}>{title}</span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16182A" strokeWidth="2.6" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .24 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 20px 18px', color: 'var(--muted)', fontWeight: 500, fontSize: 14.5, lineHeight: 1.7 }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const Spinner = ({ size = 20, color = '#fff' }) => (
  <span style={{ display: 'inline-block', width: size, height: size, border: `3px solid ${color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
);

export const Field = ({ label, children, hint }) => (
  <label style={{ display: 'block' }}>
    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>{label}</span>
    {children}
    {hint && <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginTop: 5 }}>{hint}</span>}
  </label>
);

export const inputStyle = {
  width: '100%', padding: '13px 16px', borderRadius: 13, border: '1.5px solid #DDD5C6',
  background: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 500, outline: 'none', color: 'var(--ink)'
};
