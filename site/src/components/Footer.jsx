import React from 'react';
import { useCatalogue, appLink } from '../hooks.js';

const POPULAR = [
  { iso: 'th', n: 'Thailand eSIM' },
  { iso: 'ae', n: 'Dubai / UAE eSIM' },
  { iso: 'sg', n: 'Singapore eSIM' },
  { iso: 'id', n: 'Bali / Indonesia eSIM' },
  { iso: 'us', n: 'USA eSIM' },
  { iso: 'gb', n: 'UK eSIM' },
];

const COLS = [
  {
    h: 'Product',
    links: [
      { n: 'Destinations', href: '#destinations' },
      { n: 'The app', href: '/app' },
      { n: 'Travel insurance', href: '#insurance' },
      { n: 'MobiYatri for Business', href: '#business' },
    ]
  },
  {
    h: 'Support',
    links: [
      { n: 'Yatri Sahayak (AI help)', href: '/app' },
      { n: 'Installation guide', href: '#how' },
      { n: 'FAQ', href: '#support' },
      { n: 'hello@mobiyatri.in', href: 'mailto:hello@mobiyatri.in' },
    ]
  },
  {
    h: 'Company',
    links: [
      { n: 'Terms of Service', href: '/terms' },
      { n: 'Privacy Policy', href: '/privacy' },
    ]
  },
];

export default function Footer() {
  useCatalogue();
  return (
    <footer style={{ background: 'var(--indigo)', color: '#fff', marginTop: 40, overflow: 'hidden' }}>
      <div className="container" style={{ padding: '64px 24px 20px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 36
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="26" height="26" viewBox="0 0 32 32">
                <path d="M29 4L3 14.5l8.2 3.4L26 7.5 14.2 19.8l1 8.2 4.3-5.6 6 2.6z" fill="#FF6B57" />
              </svg>
              <span style={{ fontFamily: 'var(--head)', fontWeight: 800, fontSize: 21 }}>
                <span style={{ color: 'var(--coral)' }}>mobi</span>yatri
              </span>
            </div>
            <p style={{ color: '#B9BDDD', fontSize: 14, fontWeight: 500, marginTop: 12 }}>
              Travel data for Indian tourists.<br />Made in India with ❤️ · शुभ यात्रा
            </p>
            <div style={{ display: 'flex', height: 5, width: 84, marginTop: 14, borderRadius: 3, overflow: 'hidden' }}>
              <span style={{ flex: 1, background: '#FF9933' }} />
              <span style={{ flex: 1, background: '#fff' }} />
              <span style={{ flex: 1, background: '#138808' }} />
            </div>
          </div>

          {COLS.map(c => (
            <div key={c.h}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: '#fff' }}>{c.h}</h3>
              {c.links.map(l => (
                <a key={l.n} href={l.href} style={{
                  display: 'block', color: '#B9BDDD', fontWeight: 500, fontSize: 14.5, padding: '5px 0'
                }}>{l.n}</a>
              ))}
            </div>
          ))}

          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Popular destinations</h3>
            {POPULAR.map(p => (
              <a key={p.iso} href={appLink(p.iso)} style={{
                display: 'block', color: '#B9BDDD', fontWeight: 500, fontSize: 14.5, padding: '5px 0'
              }}>{p.n}</a>
            ))}
          </div>
        </div>

        <div className="watermark" style={{ opacity: .07, marginTop: 46 }}>mobiyatri</div>

        <p style={{
          borderTop: '1px solid rgba(255,255,255,.14)', paddingTop: 18, marginTop: 8,
          color: '#8E93BC', fontSize: 12.5, fontWeight: 500, lineHeight: 1.7
        }}>
          © 2026 MobiYatri. Insurance is offered by IRDAI-licensed insurers via referral partners —
          MobiYatri does not sell or underwrite insurance. eSIM service availability depends on device
          compatibility and local network coverage.
        </p>
      </div>
    </footer>
  );
}
