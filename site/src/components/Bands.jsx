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

/* original corner art — animated: bobbing bodies, waving arms, drifting plane */
const wave = (delay = 0) => ({
  animate: { rotate: [0, 16, -4, 16, 0] },
  transition: { duration: 2.2, repeat: Infinity, repeatDelay: 1.4, delay, ease: 'easeInOut' },
  style: { transformBox: 'fill-box', transformOrigin: '85% 90%' }
});

function CornerTraveller() {
  return (
    <motion.svg className="bandart" viewBox="0 0 210 240" width="185"
      style={{ position: 'absolute', top: -14, left: 6 }}
      animate={{ y: [0, -6, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}>
      {/* rolling suitcase */}
      <rect x="36" y="152" width="132" height="66" rx="15" fill="#E85340" />
      <rect x="36" y="176" width="132" height="9" fill="#C43A28" />
      <rect x="88" y="142" width="28" height="13" rx="5" fill="#C43A28" />
      <rect x="120" y="192" width="30" height="17" rx="3.5" fill="#FFD166" transform="rotate(-7 135 200)" />
      <circle cx="60" cy="222" r="8.5" fill="#16182A" /><circle cx="60" cy="222" r="3.2" fill="#F5F0E7" />
      <circle cx="144" cy="222" r="8.5" fill="#16182A" /><circle cx="144" cy="222" r="3.2" fill="#F5F0E7" />
      {/* crossed legs */}
      <path d="M72 146q-10 20 10 27 21 7 44-4 13-8 6-21z" fill="#33386E" />
      <path d="M126 158q16 2 18 14" stroke="#33386E" strokeWidth="13" strokeLinecap="round" fill="none" />
      <ellipse cx="147" cy="176" rx="13" ry="8.5" fill="#F5F0E7" />
      <ellipse cx="66" cy="176" rx="13" ry="8.5" fill="#F5F0E7" />
      {/* torso — mustard kurti */}
      <path d="M76 94q-10 38 6 58 23 9 46 0 15-19 5-58-28-13-57 0z" fill="#F4B63F" />
      <path d="M79 118q24 10 48 0" stroke="#D89A22" strokeWidth="3" fill="none" opacity=".6" />
      {/* resting arm */}
      <path d="M78 106q-19 17-9 40" stroke="#F4B63F" strokeWidth="13" strokeLinecap="round" fill="none" />
      <circle cx="70" cy="149" r="7.5" fill="#B4744C" />
      {/* waving arm */}
      <motion.g {...wave(0.4)}>
        <path d="M128 104q21-11 24-35" stroke="#F4B63F" strokeWidth="13" strokeLinecap="round" fill="none" />
        <circle cx="153" cy="65" r="8.5" fill="#B4744C" />
      </motion.g>
      {/* head */}
      <circle cx="104" cy="68" r="27" fill="#B4744C" />
      {/* hair — side-swept bob with bun */}
      <path d="M77 64q-2-32 29-32 27 0 28 27-9-13-21-12-4 7-15 7-15 0-21 10z" fill="#2E1F14" />
      <circle cx="131" cy="42" r="8" fill="#2E1F14" />
      {/* face */}
      <circle cx="96" cy="70" r="2.7" fill="#16182A" /><circle cx="114" cy="70" r="2.7" fill="#16182A" />
      <path d="M100 80q5.5 5.5 12 0" stroke="#16182A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="88" cy="78" r="3.6" fill="#D98E63" opacity=".65" />
      <circle cx="121" cy="78" r="3.6" fill="#D98E63" opacity=".65" />
      {/* earring */}
      <circle cx="82" cy="76" r="2.2" fill="#FFD166" />
      {/* drifting paper plane */}
      <motion.g animate={{ x: [0, 12, 0], y: [0, -9, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <path d="M12 36q10-18 30-16" {...stroke} strokeDasharray="3 6" opacity=".6" />
        <path d="M44 10 26 38l13 2z" fill="#FF6B57" />
      </motion.g>
    </motion.svg>
  );
}

function CornerFriends() {
  return (
    <motion.svg className="bandart" viewBox="0 0 240 230" width="205"
      style={{ position: 'absolute', bottom: -10, right: 2 }}
      animate={{ y: [0, -5, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: .8 }}>
      <ellipse cx="120" cy="218" rx="105" ry="10" fill="rgba(22,24,42,.08)" />
      {/* red suitcase behind */}
      <rect x="168" y="150" width="58" height="66" rx="10" fill="#D93B2B" />
      <rect x="168" y="172" width="58" height="8" fill="#B02A1D" />
      <rect x="186" y="140" width="22" height="12" rx="5" fill="#B02A1D" />
      {/* leafy sprig */}
      <path d="M228 150q16-8 10-26M232 152q14 2 20-10" stroke="#4E8D62" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="236" cy="120" rx="7" ry="11" fill="#4E8D62" transform="rotate(20 236 120)" />
      <ellipse cx="254" cy="140" rx="6" ry="9" fill="#4E8D62" transform="rotate(60 254 140)" />

      {/* Friend A — coral kurta, selfie arm */}
      <path d="M60 196v22" stroke="#33386E" strokeWidth="13" strokeLinecap="round" />
      <path d="M84 196v22" stroke="#33386E" strokeWidth="13" strokeLinecap="round" />
      <ellipse cx="57" cy="222" rx="12" ry="7.5" fill="#16182A" />
      <ellipse cx="87" cy="222" rx="12" ry="7.5" fill="#16182A" />
      <path d="M52 120q-8 48 10 78 16 7 38 0 16-30 8-78-28-11-56 0z" fill="#FF6B57" />
      <path d="M55 146q22 9 46 0" stroke="#E85340" strokeWidth="3" fill="none" opacity=".7" />
      <path d="M54 130q-15 17-8 38" stroke="#FF6B57" strokeWidth="12" strokeLinecap="round" fill="none" />
      <circle cx="47" cy="170" r="7" fill="#8A5A3B" />
      {/* selfie arm raised */}
      <motion.g animate={{ rotate: [0, -9, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformBox: 'fill-box', transformOrigin: '15% 95%' }}>
        <path d="M104 130q20-16 18-42" stroke="#FF6B57" strokeWidth="12" strokeLinecap="round" fill="none" />
        <rect x="112" y="62" width="17" height="28" rx="5" fill="#16182A" />
        <rect x="115" y="66" width="11" height="17" rx="2.5" fill="#BFE3F2" />
      </motion.g>
      {/* head — short crop hair */}
      <circle cx="76" cy="98" r="23" fill="#8A5A3B" />
      <path d="M54 92q1-24 23-24 21 0 22 19-9-9-20-7-13 2-25 12z" fill="#1F1710" />
      <circle cx="69" cy="99" r="2.5" fill="#16182A" /><circle cx="85" cy="99" r="2.5" fill="#16182A" />
      <path d="M72 108q4.5 4.5 10 0" stroke="#16182A" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Friend B — indigo top, gold pants, waving, ponytail */}
      <path d="M148 198v20" stroke="#D89A22" strokeWidth="12" strokeLinecap="round" />
      <path d="M168 198v20" stroke="#D89A22" strokeWidth="12" strokeLinecap="round" />
      <ellipse cx="146" cy="222" rx="11" ry="7" fill="#7A4B00" />
      <ellipse cx="171" cy="222" rx="11" ry="7" fill="#7A4B00" />
      <path d="M142 138q-7 40 8 64 14 6 32 0 13-24 7-64-23-10-47 0z" fill="#33386E" />
      <path d="M143 128q-13 14-8 32" stroke="#33386E" strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="137" cy="162" r="6.5" fill="#B4744C" />
      {/* waving arm */}
      <motion.g {...wave(1.2)}>
        <path d="M186 140q18-10 20-32" stroke="#33386E" strokeWidth="11" strokeLinecap="round" fill="none" />
        <circle cx="207" cy="105" r="7.5" fill="#B4744C" />
      </motion.g>
      {/* head — ponytail */}
      <circle cx="164" cy="114" r="21" fill="#B4744C" />
      <path d="M144 110q0-22 21-22 19 0 20 18-8-9-18-7-12 2-23 11z" fill="#2E1F14" />
      <path d="M184 100q14 4 12 24-6-4-10-12" fill="#2E1F14" />
      <circle cx="158" cy="115" r="2.4" fill="#16182A" /><circle cx="172" cy="115" r="2.4" fill="#16182A" />
      <path d="M160 123q4 4 9 0" stroke="#16182A" strokeWidth="2.1" fill="none" strokeLinecap="round" />
      <circle cx="150" cy="121" r="3" fill="#D98E63" opacity=".6" />
      <circle cx="179" cy="121" r="3" fill="#D98E63" opacity=".6" />
    </motion.svg>
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
          gap: '38px 26px', maxWidth: 880, margin: '52px auto 0'
        }}>
          {WHY.map(w => (
            <motion.div key={w.text}
              variants={{
                hide: { opacity: 0, y: 34 },
                show: { opacity: 1, y: 0, transition: { duration: .5, ease: [0.22, 1, 0.36, 1] } }
              }}
              style={{ textAlign: 'center' }}>
              <motion.span
                variants={{
                  hide: { scale: 0.3, opacity: 0 },
                  show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 15 } }
                }}
                whileHover={{ scale: 1.12, rotate: 6, transition: { type: 'spring', stiffness: 400, damping: 12 } }}
                style={{
                  width: 96, height: 96, borderRadius: '50%', background: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(22,24,42,.10)', cursor: 'default'
                }}>{w.icon}</motion.span>
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
