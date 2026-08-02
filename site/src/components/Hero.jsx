import React from 'react';
import { motion } from 'framer-motion';
import { HeroScene } from './Illustrations.jsx';

const TICKS = ['190+ destinations', 'UPI · RuPay · Cards', 'Instant QR delivery', '24/7 English + हिन्दी support'];

export default function Hero() {
  return (
    <section style={{ padding: '26px 0 10px' }}>
      <div className="container">
        <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: .8, delay: .15, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: 10 }}>
          <HeroScene />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .7, delay: .3 }}
          style={{ textAlign: 'center', marginTop: 26 }}>
          <h1 style={{ fontSize: 'clamp(34px,5.6vw,58px)', fontWeight: 800, lineHeight: 1.08 }}>
            Global connection,<br /><span style={{ color: 'var(--coral)' }}>Indian prices.</span>
          </h1>
          <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--muted)', maxWidth: 620, margin: '16px auto 0' }}>
            <span style={{ fontWeight: 700 }}>नमस्ते!</span> Instant travel eSIMs for 190+ countries — Thailand from ₹49.
            Pay with UPI, install in one tap, land connected. No roaming shocks, ever.
          </p>
          <a className="pill pill-coral" href="/app" style={{ marginTop: 26, fontSize: 17, padding: '17px 40px' }}>
            Explore the eSIM store
          </a>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 26px',
            marginTop: 28, fontWeight: 700, fontSize: 14.5, color: 'var(--muted)'
          }}>
            {TICKS.map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E8D62" strokeWidth="3" strokeLinecap="round"><path d="M4 13l5 5L20 7" /></svg>
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
