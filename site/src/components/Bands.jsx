import React from 'react';
import { motion } from 'framer-motion';
import Reveal, { Stagger, item } from './Reveal.jsx';
import { ChipViz, PhoneMock } from './Illustrations.jsx';

/* ---------- Why band (powder blue) ---------- */
const WHY = [
  { icon: '🌏', text: 'Local, regional and global packs for 190+ destinations' },
  { icon: '₹', text: 'True Indian pricing — UPI, RuPay and cards, packs from ₹49' },
  { icon: '⚡', text: 'Instant QR delivery with one-tap install on iOS 17.4+' },
  { icon: '💬', text: 'Yatri Sahayak AI support, 24/7 in English and हिन्दी' },
];

export function WhyBand() {
  return (
    <section id="why" className="band" style={{ background: 'var(--powder)' }}>
      <div className="container">
        <Reveal><h2 className="band-title">Why do Indian travellers<br />pick MobiYatri?</h2></Reveal>
        <Stagger style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
          gap: '38px 26px', maxWidth: 980, margin: '48px auto 0'
        }}>
          {WHY.map(w => (
            <motion.div key={w.text} variants={item} style={{ textAlign: 'center' }}>
              <span style={{
                width: 86, height: 86, borderRadius: '50%', background: '#fff', fontSize: 34,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--head)', fontWeight: 800, boxShadow: '0 6px 18px rgba(22,24,42,.10)'
              }}>{w.icon}</span>
              <p style={{ fontWeight: 700, fontSize: 16.5, marginTop: 16, lineHeight: 1.45 }}>{w.text}</p>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------- What is an eSIM ---------- */
export function WhatBand() {
  return (
    <section className="band" style={{ background: 'var(--cream-deep)' }}>
      <div className="container" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
        gap: 44, alignItems: 'center', maxWidth: 1020
      }}>
        <Reveal><ChipViz /></Reveal>
        <Reveal delay={.1}>
          <h2 style={{ fontSize: 'clamp(28px,3.8vw,42px)', fontWeight: 800, lineHeight: 1.15 }}>What is an eSIM?</h2>
          <p style={{ marginTop: 14, fontWeight: 500, color: 'var(--muted)', fontSize: 16.5 }}>
            An eSIM is a digital SIM already built into your phone. Instead of hunting for a SIM shop
            at the airport, you scan a QR code before you fly — and data switches on automatically when you land.
            Your Indian SIM stays in for OTPs and WhatsApp.
          </p>
          <p style={{
            marginTop: 16, fontWeight: 700, background: '#fff', borderRadius: 14,
            padding: '14px 18px', fontSize: 15
          }}>
            📱 Quick check: dial <span style={{ color: 'var(--coral-deep)' }}>*#06#</span> — if you see an
            EID number, your phone supports eSIM.
          </p>
          <a className="pill pill-coral" href="/app" style={{ marginTop: 22 }}>Check my phone in the app</a>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
const STEPS = [
  { n: '1', t: 'Pick your destination', d: 'Search 190+ countries and choose a pack that fits your trip — clear ₹ prices, no hidden charges.' },
  { n: '2', t: 'Install before you fly', d: 'Get the QR instantly on email. iPhone? One tap installs it straight from the message.' },
  { n: '3', t: 'Land and connect', d: 'Switch on data roaming for your MobiYatri eSIM and you are online before the seatbelt sign is off.' },
];

export function HowBand() {
  return (
    <section id="how" style={{ padding: '64px 0 30px' }}>
      <div className="container">
        <Reveal><h2 className="band-title">Connected in 3 steps</h2></Reveal>
        <Stagger style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
          gap: 22, marginTop: 44
        }}>
          {STEPS.map(s => (
            <motion.div key={s.n} variants={item} style={{
              background: '#fff', borderRadius: 24, padding: '30px 26px',
              boxShadow: '0 4px 18px rgba(22,24,42,.06)'
            }}>
              <span style={{
                width: 46, height: 46, borderRadius: '50%', background: 'var(--indigo)', color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--head)', fontWeight: 800, fontSize: 20
              }}>{s.n}</span>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: '16px 0 8px' }}>{s.t}</h3>
              <p style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 15.5 }}>{s.d}</p>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ---------- Insurance ---------- */
export function InsuranceBand() {
  return (
    <section id="insurance" className="band" style={{ background: 'var(--indigo)', color: '#fff' }}>
      <div className="container" style={{ textAlign: 'center', maxWidth: 760 }}>
        <Reveal>
          <div style={{ fontSize: 44 }}>🛡️</div>
          <h2 className="band-title" style={{ color: '#fff' }}>Don't fly uninsured</h2>
          <p style={{ color: '#C9CDE8', fontWeight: 500, fontSize: 16.5 }}>
            Add travel insurance to your eSIM order in one tap — medical cover, trip delays and lost
            baggage, from IRDAI-licensed insurers. Required for Schengen visas, smart everywhere else.
          </p>
          <a className="pill pill-coral" href="/app" style={{ marginTop: 26 }}>Get covered in the app</a>
          <p style={{ fontSize: 12.5, color: '#8E93BC', marginTop: 18, fontWeight: 500 }}>
            Insurance is offered by IRDAI-licensed insurers via referral partners. MobiYatri does not
            sell or underwrite insurance.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Referral ---------- */
export function ReferralBand() {
  return (
    <section className="band" style={{
      background: 'linear-gradient(120deg,var(--coral) 0%,var(--coral-deep) 100%)', color: '#fff', padding: '56px 24px'
    }}>
      <div className="container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 26, flexWrap: 'wrap'
      }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(26px,3.6vw,40px)', fontWeight: 800 }}>Refer friends. Earn ₹150.</h2>
          <p style={{ fontWeight: 500, opacity: .92, maxWidth: 520, marginTop: 8 }}>
            Get ₹150 cashback for every friend who takes their first trip with MobiYatri — and they
            get a discount on their first eSIM too.
          </p>
        </Reveal>
        <Reveal delay={.12}><a className="pill pill-white" href="/app" style={{ color: 'var(--coral-deep)' }}>Get started</a></Reveal>
      </div>
    </section>
  );
}

/* ---------- Business ---------- */
const BIZ = [
  { t: 'Travel agents & tour operators', d: 'Bundle eSIMs with your packages and earn on every traveller you send abroad.' },
  { t: 'Corporate travel', d: 'Predictable ₹ pricing and central billing for teams that fly — no surprise roaming invoices.' },
  { t: 'Partners & resellers', d: 'White-label our catalogue through a simple API and launch your own travel-data offering.' },
];

export function BusinessBand() {
  return (
    <section id="business" style={{ padding: '64px 0' }}>
      <div className="container">
        <Reveal>
          <h2 className="band-title">One platform,<br />every business trip covered</h2>
          <p className="band-sub">Work with MobiYatri to keep your travellers, teams and customers connected.</p>
        </Reveal>
        <Stagger style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
          gap: 22, marginTop: 44
        }}>
          {BIZ.map(b => (
            <motion.div key={b.t} variants={item} style={{
              background: '#fff', borderRadius: 24, padding: '30px 26px',
              boxShadow: '0 4px 18px rgba(22,24,42,.06)'
            }}>
              <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{b.t}</h3>
              <p style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 15.5 }}>{b.d}</p>
            </motion.div>
          ))}
        </Stagger>
        <Reveal style={{ textAlign: 'center', marginTop: 34 }}>
          <a className="pill pill-coral" href="mailto:hello@mobiyatri.in?subject=MobiYatri%20for%20Business">
            Talk to us — hello@mobiyatri.in
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Support ---------- */
export function SupportBand() {
  return (
    <section id="support" className="band" style={{ background: 'var(--cream-deep)', padding: '56px 24px' }}>
      <div className="container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 26, flexWrap: 'wrap'
      }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(26px,3.4vw,36px)', fontWeight: 800 }}>Need help? We're on, 24/7</h2>
          <p style={{ color: 'var(--muted)', fontWeight: 500, marginTop: 6, maxWidth: 520 }}>
            Yatri Sahayak — our AI travel-data expert — answers in English or हिन्दी, knows your orders,
            and walks you through installation step by step.
          </p>
        </Reveal>
        <Reveal delay={.1} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a className="pill pill-coral" href="/app">💬 Chat with Yatri Sahayak</a>
          <a className="pill pill-white" href="mailto:hello@mobiyatri.in">Email us</a>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- App download ---------- */
function StoreBadge({ store }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 10, background: '#16182A', color: '#fff',
      borderRadius: 14, padding: '10px 20px', minWidth: 190
    }}>
      <span style={{ fontSize: 22 }}>{store === 'ios' ? '' : '▶'}</span>
      <span style={{ textAlign: 'left', lineHeight: 1.15 }}>
        <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, opacity: .8 }}>
          Coming soon {store === 'ios' ? 'on the' : 'on'}
        </span>
        <span style={{ display: 'block', fontSize: 17, fontWeight: 800 }}>
          {store === 'ios' ? 'App Store' : 'Google Play'}
        </span>
      </span>
    </span>
  );
}

export function AppBand() {
  return (
    <section className="band" style={{ background: 'var(--sky)' }}>
      <div className="container" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))',
        gap: 40, alignItems: 'center', maxWidth: 1000
      }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, lineHeight: 1.12 }}>
            Take MobiYatri<br />with you
          </h2>
          <p style={{ fontWeight: 500, opacity: .85, marginTop: 12, maxWidth: 480 }}>
            Buy, install and manage your eSIMs from the app — with one-tap install, live plan tracking
            and Yatri Sahayak in your pocket.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>
            <StoreBadge store="ios" /><StoreBadge store="android" />
          </div>
          <p style={{ fontWeight: 700, fontSize: 14, marginTop: 18 }}>
            Until then — the web app works great on your phone:&nbsp;
            <a href="/app" style={{ textDecoration: 'underline' }}>mobiyatri.in/app</a>
          </p>
        </Reveal>
        <Reveal delay={.12} style={{ display: 'flex', justifyContent: 'center' }}>
          <PhoneMock />
        </Reveal>
      </div>
    </section>
  );
}
