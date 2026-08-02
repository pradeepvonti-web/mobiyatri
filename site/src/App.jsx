import React from 'react';
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
import { WhyBand, WhatBand, HowBand, InsuranceBand, ReferralBand, BusinessBand, SupportBand, AppBand } from './components/Bands.jsx';
import { AuthProvider } from './lib/auth.jsx';
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

function Landing() {
  return (
    <>
      <Hero />
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
          <Route path="*" element={<Landing />} />
        </Routes>
        <Footer />
        <AuthModal />
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}
