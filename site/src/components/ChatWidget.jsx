import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { authHeaders } from '../lib/supabase.js';

const GREETING = { role: 'assistant', content: 'नमस्ते! I\'m Yatri Sahayak — ask me anything about eSIMs, installation, or your orders. English या हिन्दी, आपकी मर्ज़ी!' };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([GREETING]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [msgs, open]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: 'user', content: t }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      const headers = await authHeaders();
      const d = await fetch('/api/assistant', {
        method: 'POST', headers,
        body: JSON.stringify({
          messages: next.filter(m => m !== GREETING).slice(-12),
          context: { page: location.pathname, ua: navigator.userAgent }
        })
      }).then(r => r.json());
      setMsgs(m => [...m, { role: 'assistant', content: d.reply || d.error || 'Sorry — I could not answer just now. Please try again.' }]);
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'I seem to be offline — please try again in a moment.' }]);
    } finally { setBusy(false); }
  };

  return (
    <>
      <button className="fab" aria-label="Chat with Yatri Sahayak" onClick={() => setOpen(o => !o)}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a8 8 0 01-8 8H4l2.5-3A8 8 0 1121 12z" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: .96 }} transition={{ duration: .22 }}
            style={{
              position: 'fixed', right: 18, bottom: 92, zIndex: 90, width: 'min(380px, calc(100vw - 36px))',
              height: 'min(540px, calc(100vh - 130px))', background: 'var(--cream)', borderRadius: 24,
              boxShadow: '0 24px 70px rgba(22,24,42,.35)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
            <div style={{ background: 'var(--indigo)', color: '#fff', padding: '16px 20px' }}>
              <b style={{ fontFamily: 'var(--head)', fontSize: 16.5 }}>Yatri Sahayak</b>
              <p style={{ fontSize: 12, fontWeight: 600, opacity: .75 }}>AI travel-data expert · 24/7 · English + हिन्दी</p>
            </div>
            <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? 'var(--indigo)' : '#fff',
                  color: m.role === 'user' ? '#fff' : 'var(--ink)',
                  borderRadius: 16, padding: '11px 15px', maxWidth: '85%',
                  fontSize: 14, fontWeight: 500, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                  boxShadow: '0 2px 8px rgba(22,24,42,.07)'
                }}>{m.content}</div>
              ))}
              {busy && <div style={{ alignSelf: 'flex-start', color: 'var(--muted)', fontWeight: 700, fontSize: 13, padding: '4px 8px' }}>typing…</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, padding: 12, background: '#fff' }}>
              <input
                value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about eSIMs, plans, installation…"
                style={{ flex: 1, border: '1.5px solid #E3DCCB', borderRadius: 999, padding: '11px 16px', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, outline: 'none' }} />
              <button onClick={send} className="pill pill-coral" style={{ padding: '10px 20px', fontSize: 14 }}>Send</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
