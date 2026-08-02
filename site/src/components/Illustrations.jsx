import React from 'react';
import { motion } from 'framer-motion';

/* Original flat illustration scenes — MobiYatri palette. */

const float = (dur, dy = 10) => ({
  animate: { y: [0, -dy, 0] },
  transition: { duration: dur, repeat: Infinity, ease: 'easeInOut' }
});

/* Hero: travellers' road-trip scene with landmarks, plane and phone signal */
export function HeroScene() {
  return (
    <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
      <svg viewBox="0 0 680 340" style={{ width: '100%', display: 'block' }}>
        {/* ground */}
        <ellipse cx="340" cy="312" rx="320" ry="22" fill="#E7DECD" />
        {/* hills */}
        <path d="M40 300 Q160 210 300 300 Z" fill="#C9DEC5" />
        <path d="M330 300 Q470 200 640 300 Z" fill="#B7D4BE" />
        {/* landmarks skyline (stylised, original) */}
        <g opacity=".9">
          {/* dome monument */}
          <rect x="96" y="238" width="70" height="62" rx="4" fill="#EAD9BF" />
          <path d="M131 196 Q159 222 161 240 L101 240 Q103 222 131 196Z" fill="#F3E6CF" />
          <rect x="88" y="252" width="8" height="48" rx="3" fill="#EAD9BF" />
          <rect x="166" y="252" width="8" height="48" rx="3" fill="#EAD9BF" />
          <circle cx="131" cy="196" r="5" fill="#E8B04B" />
          {/* pagoda */}
          <path d="M545 300v-34h36v34" fill="#E5C8A8" />
          <path d="M536 268h54l-10-14h-34z" fill="#D98E63" />
          <path d="M542 254h42l-8-12h-26z" fill="#E0A173" />
          {/* tower */}
          <path d="M470 300l10-70 10 70" fill="#D8CBB4" stroke="#C9B999" strokeWidth="3" strokeLinejoin="round" />
        </g>
        {/* road */}
        <path d="M60 312 Q340 268 620 312" stroke="#fff" strokeWidth="4" strokeDasharray="14 12" fill="none" opacity=".8" />
        {/* car with travellers */}
        <g>
          <rect x="252" y="238" width="176" height="52" rx="24" fill="#FF6B57" />
          <path d="M282 240 Q300 206 336 206 h30 Q392 206 404 240 Z" fill="#FFD9C9" />
          <rect x="300" y="214" width="40" height="26" rx="8" fill="#BFE3F2" />
          <rect x="348" y="214" width="40" height="26" rx="8" fill="#BFE3F2" />
          <circle cx="292" cy="292" r="20" fill="#2A2D45" />
          <circle cx="292" cy="292" r="9" fill="#EDE6D9" />
          <circle cx="392" cy="292" r="20" fill="#2A2D45" />
          <circle cx="392" cy="292" r="9" fill="#EDE6D9" />
          {/* traveller waving from window */}
          <circle cx="322" cy="204" r="12" fill="#B4744C" />
          <path d="M332 196 q12 -12 16 -22" stroke="#B4744C" strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M310 208 q-4 8 2 12" stroke="#33386E" strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>
        {/* location pin ahead */}
        <g transform="translate(560 208)">
          <path d="M0 0C-14 0-24 10-24 23 0 48 0 48 0 48s24-25 24-25C24 10 14 0 0 0z" fill="#E85340" />
          <circle cx="0" cy="21" r="9" fill="#fff" />
        </g>
        {/* trees */}
        <g fill="#4E8D62">
          <path d="M76 300l14-34 14 34z" /><path d="M76 282l14-30 14 30z" opacity=".85" />
          <path d="M612 300l12-28 12 28z" /><path d="M612 286l12-26 12 26z" opacity=".85" />
        </g>
      </svg>

      {/* floating plane */}
      <motion.svg {...float(4.5, 14)} viewBox="0 0 60 60" width="72"
        style={{ position: 'absolute', top: -8, left: '6%' }}>
        <path d="M55 8L6 27l15.4 6.4L49 14l-22 23 1.8 15.4 8-10.5 11.3 4.9z" fill="#33386E" />
      </motion.svg>

      {/* floating phone with signal */}
      <motion.div {...float(3.6, 9)} style={{ position: 'absolute', top: 8, right: '8%' }}>
        <svg viewBox="0 0 74 120" width="62">
          <rect x="2" y="2" width="70" height="116" rx="16" fill="#16182A" />
          <rect x="8" y="10" width="58" height="100" rx="10" fill="#BFE3F2" />
          <g stroke="#E85340" strokeWidth="6" strokeLinecap="round">
            <path d="M24 84v-8" /><path d="M37 84v-18" /><path d="M50 84v-30" />
          </g>
          <circle cx="37" cy="34" r="10" fill="#fff" />
          <path d="M31 34l4 4 8-9" stroke="#4E8D62" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* cloud */}
      <motion.svg {...float(6, 8)} viewBox="0 0 120 44" width="110"
        style={{ position: 'absolute', top: 44, right: '30%', opacity: .95 }}>
        <ellipse cx="36" cy="30" rx="30" ry="14" fill="#fff" />
        <ellipse cx="70" cy="24" rx="34" ry="17" fill="#fff" />
        <ellipse cx="98" cy="32" rx="20" ry="11" fill="#fff" />
      </motion.svg>
    </div>
  );
}

/* Phone mock used in the app-download band */
export function PhoneMock() {
  return (
    <motion.svg {...float(4, 10)} viewBox="0 0 200 400" style={{ width: 190, display: 'block' }}>
      <rect x="4" y="4" width="192" height="392" rx="34" fill="#16182A" />
      <rect x="14" y="16" width="172" height="368" rx="26" fill="#F5F0E7" />
      <rect x="70" y="24" width="60" height="8" rx="4" fill="#16182A" opacity=".85" />
      <text x="100" y="70" textAnchor="middle" fontFamily="Alexandria,sans-serif" fontWeight="800" fontSize="17" fill="#16182A">
        <tspan fill="#FF6B57">mobi</tspan>yatri
      </text>
      <rect x="30" y="88" width="140" height="44" rx="12" fill="#fff" />
      <text x="42" y="115" fontFamily="Satoshi,sans-serif" fontSize="12" fill="#8B8FA5">Where to next?</text>
      <rect x="30" y="146" width="140" height="52" rx="14" fill="#33386E" />
      <text x="44" y="168" fontFamily="Satoshi,sans-serif" fontWeight="700" fontSize="12" fill="#fff">Thailand · 1GB · 7 days</text>
      <text x="44" y="186" fontFamily="Alexandria,sans-serif" fontWeight="800" fontSize="15" fill="#FFD166">₹49</text>
      <rect x="30" y="210" width="140" height="52" rx="14" fill="#fff" />
      <text x="44" y="232" fontFamily="Satoshi,sans-serif" fontWeight="700" fontSize="12" fill="#16182A">Dubai · 1GB · 7 days</text>
      <text x="44" y="250" fontFamily="Alexandria,sans-serif" fontWeight="800" fontSize="15" fill="#E85340">₹99</text>
      <rect x="30" y="274" width="140" height="52" rx="14" fill="#fff" />
      <text x="44" y="296" fontFamily="Satoshi,sans-serif" fontWeight="700" fontSize="12" fill="#16182A">Europe · 39 countries</text>
      <text x="44" y="314" fontFamily="Alexandria,sans-serif" fontWeight="800" fontSize="15" fill="#E85340">₹149</text>
      <rect x="30" y="340" width="140" height="34" rx="17" fill="#FF6B57" />
      <text x="100" y="362" textAnchor="middle" fontFamily="Satoshi,sans-serif" fontWeight="900" fontSize="13" fill="#fff">Buy eSIM</text>
    </motion.svg>
  );
}

/* Small animated eSIM chip */
export function ChipViz() {
  return (
    <svg viewBox="0 0 220 160" style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto' }}>
      <rect x="10" y="10" width="200" height="140" rx="20" fill="#33386E" />
      <rect x="60" y="40" width="100" height="80" rx="14" fill="#E8B04B" />
      <g stroke="#B27F27" strokeWidth="3" fill="none">
        <path d="M60 66h30v28h-30M160 66h-30v28h30M93 40v26M127 40v26M93 120V94M127 120V94" />
      </g>
      <motion.g animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
        <path d="M186 34a26 26 0 010 36" stroke="#FF6B57" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M178 42a15 15 0 010 20" stroke="#FF6B57" strokeWidth="5" fill="none" strokeLinecap="round" />
      </motion.g>
    </svg>
  );
}
