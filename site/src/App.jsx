import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import StoreBand from './components/StoreBand.jsx';
import Faq from './components/Faq.jsx';
import Footer from './components/Footer.jsx';
import AuthModal from './components/AuthModal.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import StoreHome from './pages/StoreHome.jsx';
import Country from './pages/Country.jsx';
import Checkout from './pages/Checkout.jsx';
import MyEsims from './pages/MyEsims.jsx';
import Profile from './pages/Profile.jsx';
import Partner from './pages/Partner.jsx';
import { WhyBand, WhatBand, HowBand, InsuranceBand, ReferralBand, BusinessBand, SupportBand, AppBand } from './components/Bands.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { ToastProvider } from './components/ui.jsx';
import { useScrollY } from './hooks.js';

const SECTIONS = [
  ['#destinations', 'Destinations'],
  ['#why', 'Why MobiYatri'],
  ['#how', 'How it works'],
  ['#insurance', 'Travel insurance'],
  ['#business', 'For business'],
  ['#support', 'Support & FAQ'],
];

function JumpBar() {
  const y = useScrollY();
  const { pathname } = useLocation();
  if (pathname !== '/') return null;
  return (
    <div className={'jumpbar' + (y > 900 ? ' on' : '')}>
      <select defaultValue="" onChange={e => {
        const el = document.querySelector(e.target.value);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        e.target.value = '';
      }}>
        <option value="" disabled>Choose a section</option>
        {SECTIONS.map(([href, label]) => <option key={href} value={href}>{label}</option>)}
      </select>
    </div>
  );
}

const CARD_MENUS = [
  {
    label: 'How MobiYatri works',
    links: [
      ['What is an eSIM?', '/#destinations'],
      ['Connected in 3 steps', '/#how'],
      ['Check phone compatibility', '/app'],
      ['FAQ & support', '/#support'],
    ]
  },
  {
    label: 'Destinations',
    links: [
      ['Thailand eSIM', '/country/th'],
      ['Dubai / UAE eSIM', '/country/ae'],
      ['Singapore eSIM', '/country/sg'],
      ['Bali / Indonesia eSIM', '/country/id'],
      ['All 190+ destinations →', '/app'],
    ]
  },
  {
    label: 'Business & insurance',
    links: [
      ['Agent & tour operator portal', '/partner'],
      ['MobiYatri for Business', '/#business'],
      ['Travel insurance', '/#insurance'],
      ['Refer & earn ₹150', '/profile'],
    ]
  },
];

function SectionCards() {
  const [open, setOpen] = React.useState(-1);
  return (
    <div className="sectioncards-wrap" style={{ position: 'sticky', top: 82, zIndex: 45 }}>
      <div className="container sectioncards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, padding: '6px 24px 10px' }}>
        {CARD_MENUS.map((m, i) => (
          <div key={m.label} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(open === i ? -1 : i)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fff', borderRadius: 16, padding: '17px 22px', fontWeight: 700, fontSize: 15.5,
              color: 'var(--ink)', boxShadow: '0 6px 22px rgba(22,24,42,.10)'
            }}>
              {m.label}
              <motion.svg animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: .2 }}
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16182A" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 4v16m0 0l-6-6m6 6l6-6" />
              </motion.svg>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: .18 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#fff',
                    borderRadius: 16, boxShadow: '0 20px 50px rgba(22,24,42,.18)', overflow: 'hidden', zIndex: 46
                  }}>
                  {m.links.map(([label, href]) => (
                    <a key={label} href={href} onClick={() => setOpen(-1)} style={{
                      display: 'block', padding: '13px 22px', fontWeight: 600, fontSize: 14.5,
                      borderBottom: '1px solid #F2EDE3'
                    }}>{label}</a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function Landing() {
  return (
    <>
      <Hero />
      <SectionCards />
      <WhyBand />
      <StoreBand />
      <WhatBand />
      <HowBand />
      <InsuranceBand />
      <ReferralBand />
      <BusinessBand />
      <SupportBand />
      <Faq />
      <AppBand />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Header />
        <JumpBar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<StoreHome />} />
          <Route path="/country/:iso" element={<Country />} />
          <Route path="/region/:name" element={<Country byRegion />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/my-esims" element={<MyEsims />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/partner" element={<Partner />} />
          <Route path="*" element={<Landing />} />
        </Routes>
        <Footer />
        <AuthModal />
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  );
}
