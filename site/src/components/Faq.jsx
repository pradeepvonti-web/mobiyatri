import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Reveal from './Reveal.jsx';

const QA = [
  {
    q: 'Will my phone work with an eSIM?',
    a: 'Most phones from 2019 onwards support eSIM. Dial *#06# — if an EID number appears, you are ready. Your phone must also be network-unlocked. The app has a one-tap compatibility checker too.'
  },
  {
    q: 'When does my plan start?',
    a: 'Validity starts only when the eSIM first connects to a network at your destination — not when you buy or install. Install at home in India, activate when you land.'
  },
  {
    q: 'Can I keep my Indian number for WhatsApp and OTPs?',
    a: 'Yes. Your Indian SIM stays in the phone with roaming data off, so WhatsApp keeps working on your existing number and you still receive OTP SMS. The MobiYatri eSIM handles all your data.'
  },
  {
    q: 'How do I pay?',
    a: 'Prices are in Indian Rupees. UPI, RuPay and all major cards are supported — no forex mark-up, no international transaction charges.'
  },
  {
    q: 'What if something does not work?',
    a: 'Yatri Sahayak, our 24/7 AI assistant, solves most installation issues in minutes — in English or हिन्दी. If the fault is on our side, we fix it or refund the pack.'
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section style={{ padding: '64px 0' }}>
      <div className="container" style={{ maxWidth: 860 }}>
        <Reveal>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 34 }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800 }}>Questions, answered</h2>
            <a className="pill pill-white" href="/app">More help in the app</a>
          </div>
        </Reveal>
        {QA.map((x, i) => (
          <Reveal key={x.q} delay={i * .05}>
            <div className="faq-item">
              <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                {x.q}
                <motion.svg animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: .25 }}
                  width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16182A" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M6 9l6 6 6-6" />
                </motion.svg>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div className="faq-a"
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: .28 }}
                    style={{ overflow: 'hidden' }}>
                    <div>{x.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
