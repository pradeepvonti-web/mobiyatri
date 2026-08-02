import React from 'react';
import { motion } from 'framer-motion';
import Reveal, { Stagger, item } from './Reveal.jsx';
import { ChipViz, PhoneMock } from './Illustrations.jsx';

/* ---------- Why band (powder blue) ---------- */
const stroke = { fill: 'none', stroke: '#16182A', strokeWidth: 2.1, strokeLinecap: 'round', strokeLinejoin: 'round' };

const WHY = [
  {
    icon: <svg width="38" height="38" viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9S14.6 18.4 12 21M12 3c-2.6 2.6-3.9 5.6-3.9 9s1.3 6.4 3.9 9" /></svg>,
    text: 'Local, regional and global packs for 190+ destinations'
  },
  {
    icon: <svg width="38" height="38" viewBox="0 0 24 24" {...stroke}><path d="M6 3h12M6 8h12M6 3c4 0 7 1 7 5s-3 5-7 5l8 8" /></svg>,
    text: 'True Indian pricing — UPI, RuPay and cards, packs from ₹49'
  },
  {
    icon: <svg width="38" height="38" viewBox="0 0 24 24" {...stroke}><path d="M13 2 5 13.5h6L11 22l8-11.5h-6z" /></svg>,
    text: 'Instant QR delivery with one-tap install on iOS 17.4+'
  },
  {
    icon: <svg width="38" height="38" viewBox="0 0 24 24" {...stroke}><path d="M21 12a8 8 0 0 1-8 8H4l2.5-3A8 8 0 1 1 21 12z" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="3" /></svg>,
    text: 'Yatri Sahayak AI support, 24/7 in English and हिन्दी'
  },
];

/* original corner art — traveller on a suitcase (top-left), pair with phones (bottom-right) */
function CornerTraveller() {
  return (
    <svg className="bandart" viewBox="0 0 220 220" width="200" style={{ position: 'absolute', top: -6, left: -6 }}>
      <rect x="52" y="128" width="96" height="62" rx="12" fill="#E85340" />
      <rect x="52" y="150" width="96" height="6" fill="#C43A28" />
      <circle cx="100" cy="70" r="22" fill="#B4744C" />
      <path d="M84 62q-6-16 8-22" {...stroke} stroke="#7A4B2B" strokeWidth="5" fill="none" />
      <rect x="76" y="92" width="48" height="42" rx="16" fill="#33386E" />
      <path d="M76 104q-18 6-22 22" stroke="#33386E" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M124 100q16-14 12-30" stroke="#33386E" strokeWidth="12" strokeLinecap="round" fill="none" />
      <circle cx="136" cy="64" r="8" fill="#B4744C" />
      <path d="M64 190v14M136 190v14" stroke="#16182A" strokeWidth="7" strokeLinecap="round" />
      <path d="M20 40q10-18 30-14" {...stroke} strokeDasharray="3 6" />
      <path d="M46 18 30 44l12 2z" fill="#FF6B57" />
    </svg>
  );
}

function CornerFriends() {
  return (
    <svg className="bandart" viewBox="0 0 220 200" width="210" style={{ position: 'absolute', bottom: -8, right: -4 }}>
      <ellipse cx="110" cy="188" rx="95" ry="10" fill="rgba(22,24,42,.08)" />
      <circle cx="78" cy="78" r="20" fill="#8A5A3B" />
      <rect x="56" y="98" width="44" height="60" rx="18" fill="#FF6B57" />
      <path d="M56 112q-16 8-18 26" stroke="#FF6B57" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M100 108q14-20 10-34" stroke="#FF6B57" strokeWidth="11" strokeLinecap="round" fill="none" />
      <rect x="102" y="62" width="14" height="22" rx="4" fill="#16182A" />
      <circle cx="148" cy="88" r="20" fill="#B4744C" />
      <path d="M132 78q-4-14 10-18" stroke="#7A4B2B" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="126" y="108" width="44" height="52" rx="18" fill="#33386E" />
      <path d="M170 118q16 6 18 24" stroke="#33386E" strokeWidth="11" strokeLinecap="round" fill="none" />
      <rect x="180" y="128" width="13" height="20" rx="4" fill="#16182A" />
      <path d="M66 158v26M90 158v26M136 160v24M160 160v24" stroke="#16182A" strokeWidth="7" strokeLinecap="round" />
      <path d="M196 168q14-2 16-14" {...stroke} />
      <path d="M204 176q10 0 14-8" {...stroke} />
    </svg>
  );
}

export function WhyBand() {
  return (
    <section id="why" className="band" style={{ background: 'var(--powder)' }}>
      <CornerTraveller />
      <CornerFriends />
      <div className="container">
        <Reveal><h2 className="band-title">Why do Indian travellers<br />pick MobiYatri?</h2></Reveal>
        <Stagger className="whygrid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
          gap: '38px 30px', maxWidth: 1240, margin: '52px auto 0'
        }}>
          {WHY.map(w => (
            <motion.div key={w.text} variants={item} style={{ textAlign: 'center' }}>
              <span style={{
                width: 96, height: 96, borderRadius: '50%', background: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(22,24,42,.10)'
              }}>{w.icon}</span>
              <p style={{ fontWeight: 700, fontSize: 16.5, marginTop: 18, lineHeight: 1.5, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>{w.text}</p>
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
