import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HeroScene, PhoneMock, ShieldScene, ReferScene } from './Illustrations.jsx';
import { useAuth } from '../lib/auth.jsx';

const DURATION = 6500;

const TICKS = ['190+ destinations', 'UPI · RuPay · Cards', 'Instant QR delivery', '24/7 English + हिन्दी support'];

export default function Hero() {
  const { user, openAuth } = useAuth();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const SLIDES = [
    {
      key: 'store',
      title: <>Global connection,<br /><span style={{ color: 'var(--coral)' }}>Indian prices.</span></>,
      sub: <><span style={{ fontWeight: 700 }}>नमस्ते!</span> Instant travel eSIMs for 190+ countries — Thailand from ₹49. Pay with UPI, install in one tap, land connected. No roaming shocks, ever.</>,
      ctas: (
        <>
          <Link className="pill pill-coral" to="/app">Explore the eSIM store</Link>
          {!user && <button className="pill pill-white" onClick={() => openAuth('signup')}>Sign up</button>}
        </>
      ),
      art: <HeroScene />,
    },
    {
      key: 'install',
      title: <>Installed before<br />you board.</>,
      sub: 'Your QR arrives by email the second you pay. iPhones install it in one tap — no SIM shops, no airport counters, no paperwork.',
      ctas: (
        <>
          <a className="pill pill-coral" href="/#how">See how it works</a>
          <Link className="pill pill-white" to="/app">Browse plans</Link>
        </>
      ),
      art: <div style={{ display: 'flex', justifyContent: 'center' }}><PhoneMock /></div>,
    },
    {
      key: 'insurance',
      title: <>Don't fly<br />uninsured.</>,
      sub: 'Add travel cover from IRDAI-licensed insurers to your eSIM order in one tap — medical, trip delays and lost baggage. Required for Schengen visas.',
      ctas: (
        <>
          <Link className="pill pill-coral" to="/app">Get covered in the app</Link>
          <a className="pill pill-white" href="/#insurance">Learn more</a>
        </>
      ),
      art: <ShieldScene />,
    },
    {
      key: 'refer',
      title: <>Refer friends.<br /><span style={{ color: 'var(--coral)' }}>Earn ₹150.</span></>,
      sub: 'Get ₹150 YatriCash for every friend who takes their first trip with MobiYatri — and they get a discount on their first eSIM too.',
      ctas: (
        <>
          <Link className="pill pill-coral" to="/profile">Get your invite code</Link>
        </>
      ),
      art: <ReferScene />,
    },
  ];

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx(i => (i + 1) % SLIDES.length), DURATION);
    return () => clearTimeout(t);
  }, [idx, paused]);

  const s = SLIDES[idx];
  const go = d => setIdx(i => (i + d + SLIDES.length) % SLIDES.length);

  return (
    <section style={{ padding: '18px 0 10px' }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="container">
        <div style={{ overflow: 'hidden' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={s.key}
              initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }}
              transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }}
              className="heroslide"
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
                gap: 30, alignItems: 'center', minHeight: 380
              }}>
              <div>
                <h1 style={{ fontSize: 'clamp(32px,4.8vw,54px)', fontWeight: 800, lineHeight: 1.1 }}>{s.title}</h1>
                <p style={{ fontSize: 17, fontWeight: 500, color: 'var(--muted)', maxWidth: 520, margin: '16px 0 24px' }}>{s.sub}</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{s.ctas}</div>
              </div>
              <div>{s.art}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* arrows + progress bars, Airalo-style */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: 720, margin: '26px auto 0' }}>
          <button aria-label="Previous slide" onClick={() => go(-1)} style={arrowStyle}>←</button>
          <div style={{ flex: 1, display: 'flex', gap: 8 }}>
            {SLIDES.map((x, i) => (
              <button key={x.key} aria-label={`Slide ${i + 1}`} onClick={() => setIdx(i)}
                style={{ flex: 1, height: 5, borderRadius: 3, background: '#DDD5C4', overflow: 'hidden', padding: 0 }}>
                {i === idx && (
                  <span key={idx + (paused ? 'p' : 'r')} style={{
                    display: 'block', height: '100%', background: 'var(--ink)', borderRadius: 3,
                    width: i === idx ? undefined : 0,
                    animation: paused ? 'none' : `fillbar ${DURATION}ms linear forwards`
                  }} />
                )}
                {i < idx && <span style={{ display: 'block', height: '100%', width: '100%', background: 'var(--ink)', borderRadius: 3 }} />}
              </button>
            ))}
          </div>
          <button aria-label="Next slide" onClick={() => go(1)} style={arrowStyle}>→</button>
        </div>

        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 26px',
          marginTop: 26, fontWeight: 700, fontSize: 14.5, color: 'var(--muted)'
        }}>
          {TICKS.map(t => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E8D62" strokeWidth="3" strokeLinecap="round"><path d="M4 13l5 5L20 7" /></svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const arrowStyle = {
  width: 42, height: 42, borderRadius: '50%', background: '#fff', fontSize: 17, fontWeight: 700,
  color: 'var(--ink)', boxShadow: '0 3px 12px rgba(22,24,42,.12)', flex: 'none'
};
