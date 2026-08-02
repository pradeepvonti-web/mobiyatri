import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sb } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';

export default function AuthModal() {
  const { modal, closeAuth } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  React.useEffect(() => { if (modal) { setTab(modal); setErr(''); } }, [modal]);

  const google = () => sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + '/app' }
  });

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      if (tab === 'signup') {
        const { error } = await sb.auth.signUp({
          email, password: pass,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
      closeAuth();
    } catch (e) {
      setErr(e.message || 'Something went wrong — please try again.');
    } finally { setBusy(false); }
  };

  const input = {
    width: '100%', padding: '15px 16px', borderRadius: 14, border: '1.5px solid #DDD5C6',
    background: '#fff', fontFamily: 'inherit', fontSize: 15.5, fontWeight: 500,
    outline: 'none', color: 'var(--ink)'
  };

  return (
    <AnimatePresence>
      {modal && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={e => e.target === e.currentTarget && closeAuth()}
          style={{
            position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(22,24,42,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18
          }}>
          <motion.div
            initial={{ opacity: 0, y: 26, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 26, scale: .97 }} transition={{ duration: .25 }}
            style={{
              width: '100%', maxWidth: 460, background: 'var(--cream)', borderRadius: 26,
              boxShadow: '0 30px 80px rgba(0,0,0,.3)', overflow: 'hidden',
              maxHeight: '92vh', overflowY: 'auto'
            }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 14px 0' }}>
              <button onClick={closeAuth} aria-label="Close" style={{
                width: 40, height: 40, borderRadius: '50%', background: '#fff', fontSize: 18,
                boxShadow: '0 2px 10px rgba(22,24,42,.1)'
              }}>✕</button>
            </div>

            <div style={{ padding: '4px 34px 34px' }}>
              {/* tabs */}
              <div style={{ display: 'flex', borderBottom: '1.5px solid rgba(22,24,42,.15)', marginBottom: 26 }}>
                {['login', 'signup'].map(t => (
                  <button key={t} onClick={() => { setTab(t); setErr(''); }} style={{
                    flex: 1, padding: '12px 0 14px', fontFamily: 'var(--head)', fontWeight: 700,
                    fontSize: 19, color: 'var(--ink)', opacity: tab === t ? 1 : .5, position: 'relative'
                  }}>
                    {t === 'login' ? 'Log in' : 'Sign up'}
                    {tab === t && <motion.span layoutId="authtab" style={{
                      position: 'absolute', left: 0, right: 0, bottom: -1.5, height: 3,
                      background: 'var(--ink)', borderRadius: 2
                    }} />}
                  </button>
                ))}
              </div>

              {/* social */}
              <button onClick={google} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: '#fff', border: '1.5px solid #DDD5C6', borderRadius: 999,
                padding: '13px 0', fontWeight: 700, fontSize: 15.5, marginBottom: 20
              }}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 42.6 44 38 44 24c0-1.3-.1-2.6-.4-3.9z" />
                </svg>
                Continue with Google
              </button>

              <div style={{ display: 'grid', gap: 14 }}>
                {tab === 'signup' && (
                  <input style={input} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
                )}
                <input style={input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                <input style={input} type="password" placeholder="Password" value={pass}
                  onChange={e => setPass(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
              </div>

              {err && <p style={{ color: 'var(--coral-deep)', fontWeight: 600, fontSize: 13.5, marginTop: 12 }}>{err}</p>}

              <button onClick={submit} disabled={busy} className="pill pill-coral"
                style={{ width: '100%', marginTop: 22, opacity: busy ? .6 : 1 }}>
                {busy ? 'Please wait…' : tab === 'login' ? 'Log in' : 'Create account'}
              </button>

              <p style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500, marginTop: 18, textAlign: 'center' }}>
                By continuing you agree to our <a href="/terms" style={{ textDecoration: 'underline' }}>Terms</a> and{' '}
                <a href="/privacy" style={{ textDecoration: 'underline' }}>Privacy Policy</a>.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
