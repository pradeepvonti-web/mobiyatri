import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SearchBox from './SearchBox.jsx';
import { useScrollY } from '../hooks.js';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  { label: 'Destinations', href: '/#destinations' },
  { label: 'Why MobiYatri', href: '/#why' },
  { label: 'How it works', href: '/#how' },
  { label: 'Insurance', href: '/#insurance' },
  { label: 'Business', href: '/#business' },
  { label: 'Support', href: '/#support' },
];

function AccountArea({ closeMenu }) {
  const { user, openAuth, logout } = useAuth();
  if (!user) return (
    <>
      <button className="pill pill-white" onClick={() => { openAuth('login'); closeMenu?.(); }}
        style={{ padding: '11px 20px', fontSize: 14.5 }}>Log in</button>
      <button className="pill pill-coral" onClick={() => { openAuth('signup'); closeMenu?.(); }}
        style={{ padding: '11px 22px', fontSize: 14.5 }}>Sign up</button>
    </>
  );
  return (
    <>
      <Link to="/my-esims" onClick={closeMenu} className="acctlink" style={{ fontWeight: 700, fontSize: 14.5, padding: '8px 10px' }}>My eSIMs</Link>
      <Link to="/profile" onClick={closeMenu} className="acctlink" style={{ fontWeight: 700, fontSize: 14.5, padding: '8px 10px' }}>Profile</Link>
      <span style={{
        background: '#DCEDDC', color: '#1F5B33', fontWeight: 800, fontSize: 13.5,
        borderRadius: 999, padding: '7px 14px', whiteSpace: 'nowrap'
      }}>YatriCash ₹0</span>
      <button className="pill pill-white" onClick={() => { logout(); closeMenu?.(); }}
        style={{ padding: '10px 18px', fontSize: 14 }}>Log out</button>
    </>
  );
}

export function Logo({ light = false }) {
  return (
    <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="30" height="30" viewBox="0 0 32 32">
        <path d="M29 4L3 14.5l8.2 3.4L26 7.5 14.2 19.8l1 8.2 4.3-5.6 6 2.6z" fill="#FF6B57" />
      </svg>
      <span style={{
        fontFamily: 'var(--head)', fontWeight: 800, fontSize: 23, letterSpacing: '-.02em',
        color: light ? '#fff' : 'var(--ink)'
      }}>
        <span style={{ color: 'var(--coral)' }}>mobi</span>yatri
      </span>
    </a>
  );
}

export default function Header() {
  const y = useScrollY();
  const scrolled = y > 560;
  const [menu, setMenu] = useState(false);

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50, background: 'var(--cream)',
        boxShadow: y > 8 ? '0 2px 20px rgba(22,24,42,.08)' : 'none',
        transition: 'box-shadow .2s'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 20, height: 76 }}>
          <Logo />
          <div style={{ flex: 1, minWidth: 0 }}>
            <AnimatePresence>
              {scrolled && (
                <motion.div
                  initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: .22 }}
                  style={{ maxWidth: 560, margin: '0 auto' }}>
                  <SearchBox compact placeholder="Where do you need data?" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <nav className="topnav" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="acctarea" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AccountArea />
            </span>
            <button aria-label="Menu" onClick={() => setMenu(m => !m)}
              style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ width: 24, height: 2.6, background: 'var(--ink)', borderRadius: 2, transition: 'transform .2s', transform: menu ? 'translateY(7.6px) rotate(45deg)' : 'none' }} />
              <span style={{ width: 24, height: 2.6, background: 'var(--ink)', borderRadius: 2, opacity: menu ? 0 : 1, transition: 'opacity .15s' }} />
              <span style={{ width: 24, height: 2.6, background: 'var(--ink)', borderRadius: 2, transition: 'transform .2s', transform: menu ? 'translateY(-7.6px) rotate(-45deg)' : 'none' }} />
            </button>
          </nav>
        </div>
        {/* secondary nav — hides once scrolled */}
        <AnimatePresence>
          {!scrolled && (
            <motion.nav
              initial={false} exit={{ height: 0, opacity: 0 }} transition={{ duration: .2 }}
              style={{ overflow: 'hidden' }}>
              <div className="container secnav" style={{
                display: 'flex', gap: 28, paddingBottom: 14, fontWeight: 700, fontSize: 15,
                overflowX: 'auto', whiteSpace: 'nowrap'
              }}>
                {NAV.map(n => (
                  <a key={n.href} href={n.href} onClick={() => setMenu(false)}
                    style={{ opacity: .85, paddingBottom: 4, borderBottom: '2.5px solid transparent' }}
                    onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'var(--coral)'}
                    onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}>
                    {n.label}
                  </a>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* full menu sheet */}
      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}
            transition={{ duration: .2 }}
            style={{
              position: 'fixed', top: 76, left: 0, right: 0, zIndex: 49,
              background: 'var(--cream)', boxShadow: '0 24px 50px rgba(22,24,42,.18)',
              padding: '18px 24px 26px', borderRadius: '0 0 28px 28px'
            }}>
            {NAV.map(n => (
              <a key={n.href} href={n.href} onClick={() => setMenu(false)} style={{
                display: 'block', padding: '15px 6px', fontWeight: 700, fontSize: 17,
                borderBottom: '1px solid rgba(22,24,42,.08)'
              }}>{n.label}</a>
            ))}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18, alignItems: 'center' }}>
              <AccountArea closeMenu={() => setMenu(false)} />
            </div>
            <Link to="/app" onClick={() => setMenu(false)} className="pill pill-coral"
              style={{ marginTop: 14, width: '100%' }}>Browse the eSIM store</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
