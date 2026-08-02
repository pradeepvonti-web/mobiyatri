import React from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import StoreBand from './components/StoreBand.jsx';
import Faq from './components/Faq.jsx';
import Footer from './components/Footer.jsx';
import { WhyBand, WhatBand, HowBand, InsuranceBand, ReferralBand, BusinessBand, SupportBand, AppBand } from './components/Bands.jsx';
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

function ChatFab() {
  return (
    <a className="fab" href="/app" aria-label="Chat with Yatri Sahayak">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 01-8 8H4l2.5-3A8 8 0 1121 12z" />
        <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="3" />
      </svg>
    </a>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <JumpBar />
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
      <Footer />
      <ChatFab />
    </>
  );
}
