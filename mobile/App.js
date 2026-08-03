// MobiYatri — native app (Expo / React Native, SDK 57)
// Same backend + Supabase as the web app. Dev API points at the desktop server on LAN;
// switch API to the deployed URL (e.g. https://mobiyatri.onrender.com) for production builds.
import 'react-native-url-polyfill/auto';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Image, KeyboardAvoidingView, Linking, Modal,
  Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

/* soft pastel confetti backdrop shared by splash + welcome */
const CONFETTI_SHAPES = [
  ['6%', '78%', '#F6DBA6', 56, 28, '30deg', 14],
  ['10%', '4%', '#CFE6D6', 42, 42, '0deg', 21],
  ['26%', '58%', '#CBE2EE', 52, 52, '18deg', 10],
  ['46%', '-4%', '#DDE6DA', 46, 46, '14deg', 10],
  ['52%', '86%', '#F3C08F', 40, 40, '0deg', 20],
  ['70%', '76%', '#CBE2EE', 50, 26, '-18deg', 13],
  ['80%', '6%', '#F6DBA6', 34, 30, '-12deg', 12],
  ['88%', '46%', '#DDE6DA', 44, 44, '0deg', 22],
];
const ConfettiBG = () => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {CONFETTI_SHAPES.map(([top, left, bg, w, h, rot, r], i) => (
      <View key={i} style={{
        position: 'absolute', top, left, width: w, height: h, backgroundColor: bg,
        opacity: .75, borderRadius: r, transform: [{ rotate: rot }],
      }} />
    ))}
  </View>
);

/* welcome illustration: traveller searching the globe — animated (original art) */
function SearchGlobeScene({ width = 250 }) {
  const h = Math.round(width * 0.84);
  const drift = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const pop1 = useRef(new Animated.Value(0)).current;
  const pop2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 5500, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 5500, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 2600, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(sweep, { toValue: 0, duration: 2600, useNativeDriver: true }),
      Animated.delay(500),
    ])).start();
    const pop = (v, delay) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.spring(v, { toValue: 1, friction: 3.2, useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(v, { toValue: 0, duration: 260, useNativeDriver: true }),
    ])).start();
    pop(pop1, 400); pop(pop2, 1700);
  }, []);
  return (
    <View style={{ width, height: h }}>
      <Svg width={width} height={h} viewBox="0 0 250 210">
        <Circle cx="150" cy="95" r="82" fill="#E7EBF2" />
        <Path d="M112 44q26-14 44 2-8 20-30 18-22-2-14-20z" fill="#C7D3E4" />
        <Path d="M186 96q22-6 32 10-6 22-28 20-18-4-4-30z" fill="#C7D3E4" />
        <Path d="M128 130q18-8 30 4-4 18-22 16-16-2-8-20z" fill="#C7D3E4" />
        <Rect x="198" y="116" width="46" height="80" rx="12" fill="#DFE5EC" />
        <Rect x="214" y="100" width="14" height="18" rx="4" fill="#C9D2DC" />
        <Rect x="168" y="140" width="34" height="56" rx="10" fill="#E85340" />
        <Rect x="172" y="154" width="26" height="10" rx="4" fill="#F08A76" />
        <Rect x="172" y="170" width="26" height="10" rx="4" fill="#F08A76" />
        <Circle cx="178" cy="200" r="5" fill="#23253A" /><Circle cx="192" cy="200" r="5" fill="#23253A" />
        <Circle cx="208" cy="200" r="5" fill="#23253A" /><Circle cx="234" cy="200" r="5" fill="#23253A" />
        <Path d="M26 146q26-16 54 0 6 18-8 20-20 6-38 0-14-2-8-20z" fill="#2E8674" />
        <Path d="M30 118q22-18 44 0l-4 28q-18 8-36 0z" fill="#5C9CDF" />
        <Path d="M70 116q16-10 20-24" stroke="#5C9CDF" strokeWidth="10" strokeLinecap="round" fill="none" />
        <Circle cx="92" cy="88" r="6" fill="#B4744C" />
        <Circle cx="52" cy="94" r="16" fill="#B4744C" />
        <Path d="M36 90q2-16 16-16 14 0 16 14-8-7-16-5-10 2-16 7z" fill="#1F1710" />
        <Circle cx="47" cy="95" r="4.5" fill="none" stroke="#23253A" strokeWidth="1.6" />
        <Circle cx="58" cy="95" r="4.5" fill="none" stroke="#23253A" strokeWidth="1.6" />
        <Rect x="34" y="128" width="48" height="26" rx="4" fill="#C9D2DC" transform="rotate(-6 58 141)" />
        <Ellipse cx="34" cy="196" rx="12" ry="7" fill="#23253A" /><Ellipse cx="66" cy="198" rx="12" ry="7" fill="#23253A" />
      </Svg>
      <Animated.View style={{
        position: 'absolute', left: 6, top: 18,
        transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }],
      }}>
        <Svg width={58} height={22} viewBox="0 0 58 22">
          <Ellipse cx="18" cy="15" rx="15" ry="6.5" fill="#EDF1F7" /><Ellipse cx="38" cy="11" rx="19" ry="8.5" fill="#EDF1F7" />
        </Svg>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: width * .42, top: h * .17, transform: [{ scale: pop1 }] }}>
        <Svg width={26} height={34} viewBox="0 0 26 34">
          <Path d="M13 0C6 0 1 5 1 12c0 9 12 22 12 22s12-13 12-22C25 5 20 0 13 0z" fill="#E85340" />
          <Circle cx="13" cy="12" r="5" fill="#fff" />
        </Svg>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: width * .58, top: h * .42, transform: [{ scale: pop2 }] }}>
        <Svg width={22} height={29} viewBox="0 0 26 34">
          <Path d="M13 0C6 0 1 5 1 12c0 9 12 22 12 22s12-13 12-22C25 5 20 0 13 0z" fill="#E85340" />
          <Circle cx="13" cy="12" r="5" fill="#fff" />
        </Svg>
      </Animated.View>
      <Animated.View style={{
        position: 'absolute', left: width * .22, top: h * .04,
        transform: [
          { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, width * .22] }) },
          { translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, h * .3] }) },
        ],
      }}>
        <Svg width={72} height={88} viewBox="0 0 72 88">
          <Circle cx="30" cy="30" r="25" fill="rgba(255,255,255,.5)" stroke="#23253A" strokeWidth="5" />
          <Path d="M47 51 L63 80" stroke="#2E8674" strokeWidth="11" strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/* welcome illustration: traveller stepping out of a phone (original art, unused) */
const PhoneTravellerScene = ({ width = 190 }) => (
  <Svg width={width} height={width * 0.98} viewBox="0 0 200 196">
    <Ellipse cx="100" cy="184" rx="80" ry="8" fill="#D9E2EE" />
    {/* phone */}
    <Rect x="55" y="6" width="90" height="170" rx="18" fill="#23253A" />
    <Rect x="61" y="12" width="78" height="158" rx="12" fill="#DDEEF8" />
    {/* screen scene */}
    <Path d="M61 118 L88 82 L106 110 L120 90 L139 118 Z" fill="#A9C3DE" />
    <Path d="M61 118 h78 v40 q0 12 -12 12 h-54 q-12 0 -12 -12 z" fill="#BFE0C6" />
    {/* pines */}
    <Path d="M146 128 l11 -26 11 26z" fill="#3F7D53" />
    <Path d="M146 146 l11 -26 11 26z" fill="#4E8D62" />
    <Rect x="154.5" y="146" width="5" height="14" fill="#6B4A2E" />
    {/* traveller */}
    <Rect x="58" y="118" width="28" height="40" rx="11" fill="#5C9CDF" />
    <Path d="M72 168 q-4 -46 24 -46 q24 0 24 44 l-8 4z" fill="#E85340" />
    <Path d="M86 124 q-10 4 -12 16" stroke="#4C86C9" strokeWidth="6" strokeLinecap="round" fill="none" />
    <Circle cx="98" cy="98" r="17" fill="#B4744C" />
    <Path d="M81 94 q2 -17 17 -17 q14 0 16 15 q-8 -8 -17 -6 q-10 2 -16 8z" fill="#2E1F14" />
    <Path d="M118 134 q14 -7 22 -18" stroke="#E85340" strokeWidth="10" strokeLinecap="round" fill="none" />
    <Circle cx="142" cy="114" r="6" fill="#B4744C" />
    {/* grass */}
    <Path d="M50 172 q6 -12 14 -2 q-8 4 -14 2z" fill="#8BC09A" />
    <Path d="M140 176 q6 -10 12 -2 q-6 4 -12 2z" fill="#8BC09A" />
  </Svg>
);

/* small line icons for the welcome bullets */
const WIcon = ({ d, dot }) => (
  <Svg width="21" height="21" viewBox="0 0 24 24">
    <Path d={d} fill="none" stroke="#23253A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    {dot && <Circle cx="16" cy="8" r="1.7" fill="#23253A" />}
  </Svg>
);
const WELCOME_BULLETS = [
  ['M3.5 11.5 L11.5 3.5 h9 v9 l-8 8 z', true, 'No expensive international roaming'],
  ['M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9s1.3-6.5 3.8-9z', false, 'Coverage in 190+ destinations'],
  ['M12 3a9 9 0 100 18 9 9 0 000-18zM8.2 12.2l2.6 2.6 5-5.6', false, 'Connect in minutes, no physical SIM'],
  ['M20 12a8 8 0 01-8 8H4.5l2.3-2.7A8 8 0 1120 12z', false, '24/7 support in English & हिन्दी'],
];

/* MobiYatri paper-plane logo mark (same path as the website wordmark) */
const LogoMark = ({ size = 90, color = '#FF6B57' }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32">
    <Path d="M29 4L3 14.5l8.2 3.4L26 7.5 14.2 19.8l1 8.2 4.3-5.6 6 2.6z" fill={color} />
  </Svg>
);

/* travel flat-lay scene for the splash: folded map + pin, camera, binoculars, backpack, van, phone */
const TravelScene = ({ width = 230 }) => (
  <Svg width={width} height={width * 0.8} viewBox="0 0 230 184">
    {/* folded map */}
    <Path d="M45 60 L95 48 L95 150 L45 162 Z" fill="#E3E9F2" />
    <Path d="M95 48 L145 60 L145 162 L95 150 Z" fill="#EDF1F7" />
    <Path d="M145 60 L195 48 L195 150 L145 162 Z" fill="#E3E9F2" />
    <Path d="M55 82q18-10 30 4-4 16-22 14-14-4-8-18z" fill="#C7D3E4" />
    <Path d="M150 102q16-8 28 2-2 14-18 14-14-2-10-16z" fill="#C7D3E4" />
    <Path d="M100 122q12-6 20 2-2 10-14 10-10-2-6-12z" fill="#C7D3E4" />
    {/* location pin */}
    <Path d="M120 72c-10 0-17 7-17 16 0 12 17 30 17 30s17-18 17-30c0-9-7-16-17-16z" fill="#5C9CDF" />
    <Circle cx="120" cy="88" r="6.5" fill="#fff" />
    {/* camera */}
    <Rect x="92" y="10" width="56" height="38" rx="9" fill="#F08A76" />
    <Rect x="92" y="30" width="56" height="18" rx="9" fill="#F6B3A6" />
    <Rect x="106" y="4" width="16" height="10" rx="4" fill="#E85340" />
    <Circle cx="120" cy="29" r="12" fill="#F9D5CD" /><Circle cx="120" cy="29" r="8.5" fill="#16182A" />
    <Rect x="134" y="16" width="10" height="5" rx="2.5" fill="#fff" opacity=".8" />
    {/* binoculars */}
    <G transform="rotate(-24 30 60)">
      <Rect x="14" y="40" width="13" height="34" rx="6" fill="#5C9CDF" />
      <Rect x="33" y="40" width="13" height="34" rx="6" fill="#5C9CDF" />
      <Rect x="14" y="52" width="32" height="5" fill="#3D7CC0" />
      <Path d="M12 74l4 12h9l3-12z" fill="#3D7CC0" /><Path d="M31 74l4 12h9l3-12z" fill="#3D7CC0" />
    </G>
    {/* backpack */}
    <Rect x="18" y="112" width="52" height="58" rx="16" fill="#5C9CDF" />
    <Path d="M22 118q22-16 44 0l-4 22q-18 8-36 0z" fill="#F08A76" />
    <Rect x="26" y="148" width="36" height="20" rx="8" fill="#F08A76" />
    <Rect x="40" y="128" width="8" height="14" rx="3" fill="#16182A" />
    {/* camper van */}
    <Path d="M150 140q2-14 16-14h32q14 0 16 14l2 12q0 6-6 6h-56q-6 0-6-6z" fill="#3FA08C" />
    <Rect x="150" y="148" width="66" height="12" rx="5" fill="#2E8674" />
    <Rect x="158" y="132" width="20" height="9" rx="3" fill="#D7E5EC" />
    <Rect x="182" y="132" width="24" height="9" rx="3" fill="#D7E5EC" />
    <Circle cx="164" cy="162" r="7" fill="#16182A" /><Circle cx="164" cy="162" r="2.6" fill="#fff" />
    <Circle cx="202" cy="162" r="7" fill="#16182A" /><Circle cx="202" cy="162" r="2.6" fill="#fff" />
    {/* phone */}
    <G transform="rotate(14 205 96)">
      <Rect x="196" y="70" width="26" height="48" rx="6" fill="#5C9CDF" />
      <Rect x="199" y="74" width="20" height="40" rx="4" fill="#EDF3F8" />
    </G>
  </Svg>
);

/* ---------------- config ---------------- */
const API = 'http://192.168.1.122:4000'; // dev: desktop server on LAN. Prod: deployed URL.
const SUPABASE_URL = 'https://acvjjepiyoxzwleggqvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdmpqZXBpeW94endsZWdncXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MjE3NDIsImV4cCI6MjEwMTE5Nzc0Mn0.wBsCo6aX1arPpKR8Z9Qqj4Ful_VAsKex1903qmz1xcg';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

/* ---------------- theme ---------------- */
const T = {
  bg: '#F1F5FB', bgTop: '#E4EAF6', card: '#FFFFFF', ink: '#23253A', soft: '#76819B',
  line: '#E5EBF5', coral: '#FF6B57', coralDeep: '#E85340', indigo: '#33386E',
  indigoDark: '#20234A', night: '#151834', mint: '#D6EBDB', mintInk: '#1F7A40', tint: '#E7ECF8',
};
const TOPPAD = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 54;

/* ---------------- fallback data (until catalogue loads) ---------------- */
const FALLBACK = [
  { iso: 'th', n: 'Thailand', op: 'AIS', from: 329, pop: 1 },
  { iso: 'ae', n: 'UAE (Dubai)', op: 'Etisalat', from: 399, pop: 1 },
  { iso: 'sg', n: 'Singapore', op: 'StarHub', from: 349, pop: 1 },
  { iso: 'id', n: 'Indonesia (Bali)', op: 'Telkomsel', from: 379, pop: 1 },
];

const flagUrl = iso => `https://flagcdn.com/w160/${iso}.png`;

/* ================= root ================= */
export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [showSplash, setShowSplash] = useState(true);
  const splashFade = useRef(new Animated.Value(1)).current;
  const [tab, setTab] = useState('store');
  const [countries, setCountries] = useState(FALLBACK);
  const [regions, setRegions] = useState([]);
  const [globalPacks, setGlobalPacks] = useState([]);
  const [mode, setMode] = useState(null);
  const [cat, setCat] = useState('popular');
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [session, setSession] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingBuy, setPendingBuy] = useState(false);
  const [order, setOrder] = useState(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installEsim, setInstallEsim] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [myEsims, setMyEsims] = useState([]);
  const [insQuote, setInsQuote] = useState(null);
  const [insOn, setInsOn] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s || null));
    fetch(API + '/api/catalogue').then(r => r.json()).then(d => {
      if (d && d.countries && d.countries.length) {
        setCountries(d.countries.filter(c => c.iso));
        setRegions(d.regions || []);
        setGlobalPacks(d.global || []);
        setMode(d.mode);
      }
    }).catch(() => {});
    const t = setTimeout(() => {
      Animated.timing(splashFade, { toValue: 0, duration: 750, useNativeDriver: true })
        .start(() => setShowSplash(false));
    }, 3000);
    return () => { clearTimeout(t); sub && sub.subscription && sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (session && screen === 'welcome') setScreen('main'); // skip welcome for signed-in users (splash still covers the swap)
  }, [session]);

  const userName = useMemo(() => {
    if (!session) return 'यात्री';
    const n = (session.user.user_metadata && session.user.user_metadata.full_name) || session.user.email || 'Traveller';
    return n.split(' ')[0].split('@')[0];
  }, [session]);

  const list = useMemo(() => {
    let base;
    if (cat === 'popular') base = countries.filter(c => c.pop);
    else if (cat === 'countries') base = [...countries].sort((a, b) => a.n.localeCompare(b.n));
    else if (cat === 'regional') base = regions;
    else base = globalPacks;
    if (query.trim()) base = countries.filter(c => c.n.toLowerCase().includes(query.trim().toLowerCase()));
    return base;
  }, [cat, countries, regions, globalPacks, query]);

  const openCountry = c => { setSel(c); setPkg(firstPkg(c)); setScreen('country'); };

  const loadInsurance = async selc => {
    try {
      const days = pkg ? parseInt(pkg.days) || 7 : 7;
      const q = await fetch(API + '/api/insurance/quote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: (selc || sel).n, iso: (selc || sel).iso || null, days }),
      }).then(r => r.json());
      if (q && q.premiumINR) setInsQuote(q);
    } catch (e) {}
  };

  const buyNow = () => {
    if (!session) { setPendingBuy(true); setAuthOpen(true); return; }
    setInsQuote(null); setInsOn(false); setScreen('checkout'); loadInsurance();
  };

  const payNow = async () => {
    if (paying) return;           // guard against double-tap double-purchases
    setPaying(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (session) headers.Authorization = 'Bearer ' + session.access_token;
      const o = await fetch(API + '/api/orders', {
        method: 'POST', headers,
        body: JSON.stringify({ bundle: pkg.bundle, country: sel.n, package: pkg.label + ' · ' + pkg.days, price: pkg.price }),
      }).then(r => r.json());
      if (o.error) throw new Error(o.error);
      setOrder(o); setPolicy(null); setScreen('ordercomplete');
      if (insOn && insQuote) {
        const p = await fetch(API + '/api/insurance/policy', {
          method: 'POST', headers,
          body: JSON.stringify({ quoteId: insQuote.quoteId, destination: sel.n, premium: insQuote.premiumINR, days: insQuote.days }),
        }).then(r => r.json());
        if (p && p.policyNumber) setPolicy(p);
      }
    } catch (e) { Alert.alert('Payment', 'Could not complete the order — is the server reachable?'); }
    setPaying(false);
  };

  const loadMyEsims = async () => {
    if (!session) { setMyEsims([]); return; }
    const { data } = await sb.from('esims')
      .select('iccid,matching_id,smdp_address,lpa_string,status,created_at,orders(country_name,package_label,price_inr)')
      .order('created_at', { ascending: false });
    setMyEsims(data || []);
  };
  useEffect(() => { if (screen === 'main' && tab === 'esims') loadMyEsims(); }, [screen, tab, session]);

  const splashOverlay = showSplash ? (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: splashFade, zIndex: 99, elevation: 99 }]}>
      <Splash />
    </Animated.View>
  ) : null;

  if (screen === 'welcome') return (
    <View style={{ flex: 1 }}>
      <Welcome onExplore={() => setScreen('main')} onAuth={() => setAuthOpen(true)}
        authModal={<AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onDone={() => { setAuthOpen(false); setScreen('main'); }} />} />
      {splashOverlay}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="dark-content" />
      {splashOverlay}
      {screen === 'main' && tab === 'store' && (
        <Store userName={userName} query={query} setQuery={setQuery} cat={cat} setCat={setCat}
          list={list} mode={mode} onCountry={openCountry} onChat={() => setChatOpen(true)} />
      )}
      {screen === 'main' && tab === 'esims' && (
        <MyEsims esims={myEsims} session={session} countries={countries}
          onAuth={() => setAuthOpen(true)}
          onInstall={e => { setInstallEsim(e); setInstallOpen(true); }}
          onBrowse={() => setTab('store')} />
      )}
      {screen === 'main' && tab === 'profile' && (
        <Profile session={session} onAuth={() => setAuthOpen(true)}
          onLogout={async () => { await sb.auth.signOut(); }}
          onChat={() => setChatOpen(true)} />
      )}
      {screen === 'country' && sel && (
        <Country c={sel} pkg={pkg} setPkg={setPkg} onBack={() => setScreen('main')} onBuy={buyNow} />
      )}
      {screen === 'checkout' && (
        <Checkout price={pkg ? pkg.price : 0} insQuote={insQuote} insOn={insOn} setInsOn={setInsOn}
          onBack={() => setScreen('country')} onPay={payNow} paying={paying} />
      )}
      {screen === 'ordercomplete' && (
        <OrderComplete order={order} policy={policy} country={sel ? sel.n : ''}
          onDone={() => { setScreen('main'); setTab('esims'); }}
          onInstall={() => { setInstallEsim({ lpa_string: order && order.esim && order.esim.lpa, iccid: order && order.esim && order.esim.iccid }); setInstallOpen(true); }} />
      )}

      {screen === 'main' && (
        <View style={s.tabbar}>
          {[['store', 'Store', '🛍'], ['esims', 'My eSIMs', '▦'], ['profile', 'Profile', '👤']].map(([k, label, ic]) => (
            <Pressable key={k} style={s.tabbtn} onPress={() => setTab(k)}>
              <Text style={{ fontSize: 20, opacity: tab === k ? 1 : 0.45 }}>{ic}</Text>
              <Text style={[s.tablbl, tab === k && { color: T.ink }]}>{label}</Text>
              {tab === k && <View style={s.tabdot} />}
            </Pressable>
          ))}
        </View>
      )}

      <AuthModal open={authOpen} onClose={() => { setAuthOpen(false); setPendingBuy(false); }}
        onDone={() => { setAuthOpen(false); if (pendingBuy) { setPendingBuy(false); setScreen('checkout'); loadInsurance(); } }} />
      <InstallModal open={installOpen} esim={installEsim} onClose={() => setInstallOpen(false)} />
      <ChatModal open={chatOpen} session={session} onClose={() => setChatOpen(false)} />
    </View>
  );
}

/* ================= helpers ================= */
function firstPkg(c) {
  if (c.packages && c.packages.std && c.packages.std.length) {
    const g = c.packages.std[0]; const p = g.list[0];
    return { label: p.label, days: g.d, price: p.price, bundle: p.bundle };
  }
  return { label: '1 GB', days: '7 days', price: c.from, bundle: null };
}

/* ================= screens ================= */
function Splash() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 6000, useNativeDriver: true })).start();
  }, []);
  return (
    <View style={[s.fill, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]}>
      <StatusBar barStyle="dark-content" />
      <ConfettiBG />
      <Animated.View style={{
        transform: [{ scale: spin.interpolate({ inputRange: [0, .5, 1], outputRange: [1, 1.06, 1] }) }],
      }}>
        <TravelScene width={240} />
      </Animated.View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
        <LogoMark size={38} />
        <Text style={{ fontSize: 36, fontWeight: '800', marginLeft: 8 }}>
          <Text style={{ color: T.coral }}>mobi</Text><Text style={{ color: T.ink }}>yatri</Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <View style={{ width: 22, height: 4, backgroundColor: '#FF9933', borderRadius: 2 }} />
        <View style={{ width: 22, height: 4, backgroundColor: '#fff', borderRadius: 2, marginHorizontal: 2 }} />
        <View style={{ width: 22, height: 4, backgroundColor: '#2E7D4F', borderRadius: 2 }} />
      </View>
      <Text style={{ color: T.coral, marginTop: 12, fontWeight: '700' }}>नमस्ते · शुभ यात्रा</Text>
      <ActivityIndicator size="large" color={T.coral} style={{ marginTop: 28 }} />
    </View>
  );
}

function Welcome({ onExplore, onAuth, authModal }) {
  return (
    <View style={[s.fill, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="dark-content" />
      <ConfettiBG />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <SearchGlobeScene width={250} />
        <Text style={{ fontSize: 25, fontWeight: '800', color: T.ink, marginTop: 18 }}>Welcome to MobiYatri</Text>
        <View style={{ marginTop: 18, alignSelf: 'stretch', paddingHorizontal: 10 }}>
          {WELCOME_BULLETS.map(([d, dot, label]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
              <WIcon d={d} dot={dot} />
              <Text style={{ color: T.ink, fontWeight: '600', fontSize: 14.5, marginLeft: 12, flex: 1 }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ padding: 20, paddingBottom: 34 }}>
        <Pressable style={s.btnOutlineLight} onPress={onAuth}><Text style={{ color: T.ink, fontWeight: '800', fontSize: 16 }}>Sign up / Log in</Text></Pressable>
        <Pressable style={[s.btnPrimary, { marginTop: 12 }]} onPress={onExplore}><Text style={s.btnPrimaryTxt}>Explore eSIMs</Text></Pressable>
      </View>
      {authModal}
    </View>
  );
}

/* dark promo card — same 3 rotating slides as the web app */
const PROMO_SLIDES = [
  { icon: '🧳', t: 'New to MobiYatri?', d: "Let's pick the perfect eSIM together — learn how eSIMs work and get set for your next trip abroad." },
  { icon: '🪙', t: 'Refer friends. Earn ₹150.', d: 'Get ₹150 cashback for every friend you bring — they get a discount on their first eSIM.' },
  { icon: '🌐', t: '190+ countries. One app.', d: 'Land, switch on, connect — trusted local networks across the world, paid in ₹.' },
];

function PromoCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % PROMO_SLIDES.length), 5000); return () => clearInterval(t); }, []);
  const p = PROMO_SLIDES[i];
  return (
    <Pressable onPress={() => setI(x => (x + 1) % PROMO_SLIDES.length)} style={s.promo}>
      <Text style={{ fontSize: 34, textAlign: 'center' }}>{p.icon}</Text>
      <Text style={{ color: '#F5F6FC', fontWeight: '800', fontSize: 16, textAlign: 'center', marginTop: 6 }}>{p.t}</Text>
      <Text style={{ color: '#A9ACC9', fontWeight: '600', fontSize: 12.5, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>{p.d}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {PROMO_SLIDES.map((_, x) => (
          <Pressable key={x} onPress={() => setI(x)}
            style={{ width: x === i ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: x === i ? T.coral : '#3A3F73' }} />
        ))}
      </View>
    </Pressable>
  );
}

function Store({ userName, query, setQuery, cat, setCat, list, mode, onCountry, onChat }) {
  return (
    <View style={s.fill}>
      <FlatList
        data={list}
        keyExtractor={(item, i) => (item.iso || item.n) + i}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: TOPPAD }}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: T.soft, fontWeight: '700' }}>Cashback</Text>
              <View style={{ backgroundColor: T.mint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ color: T.mintInk, fontWeight: '800', fontSize: 13 }}>₹0.00</Text>
              </View>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: T.ink, marginBottom: 12 }}>नमस्ते, {userName}</Text>
            <TextInput style={s.search} placeholder="Where are you travelling to?" placeholderTextColor={T.soft}
              value={query} onChangeText={setQuery} />
            <PromoCarousel />
            <View style={s.svcgrid}>
              {[['📶', 'Country eSIM', '#E7ECF8', () => setCat('popular')],
                ['🌏', 'Regional', '#E2F1E6', () => setCat('regional')],
                ['🌐', 'Global', '#FBF0DA', () => setCat('global')],
                ['🛡️', 'Insurance', '#FDE9E4', () => Alert.alert('Travel insurance', 'Add trip protection during checkout — cover from IRDAI-licensed partners for medical, delays and baggage.')],
                ['💬', 'Ask AI', T.tint, onChat]].map(([ic, lb, bg, fn]) => (
                  <Pressable key={lb} style={s.svc} onPress={fn}>
                    <View style={[s.svcIcon, { backgroundColor: bg }]}><Text style={{ fontSize: 20 }}>{ic}</Text></View>
                    <Text style={s.svcLbl}>{lb}</Text>
                  </Pressable>
                ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 22, borderBottomWidth: 1.5, borderColor: '#DDE4F0', marginBottom: 10 }}>
              {[['popular', 'Popular'], ['countries', 'Countries'], ['regional', 'Regional'], ['global', 'Global']].map(([k, lb]) => (
                <Pressable key={k} onPress={() => setCat(k)} style={{ paddingVertical: 10, borderBottomWidth: 2.5, borderColor: cat === k ? T.ink : 'transparent', marginBottom: -1.5 }}>
                  <Text style={{ fontWeight: '700', color: cat === k ? T.ink : T.soft, fontSize: 14 }}>{lb}</Text>
                </Pressable>
              ))}
            </View>
            {mode ? <Text style={{ fontSize: 11, color: T.soft, fontWeight: '600', marginBottom: 8 }}>
              {mode.startsWith('live') ? '● Live catalogue · ' + mode.replace('live:', '') : 'Demo catalogue'}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={s.crow} onPress={() => onCountry(item)}>
            {item.iso
              ? <Image source={{ uri: flagUrl(item.iso) }} style={s.flag} />
              : <View style={[s.flag, { backgroundColor: '#C9DEF2', alignItems: 'center', justifyContent: 'center' }]}><Text>🌏</Text></View>}
            <Text style={{ flex: 1, fontWeight: '700', fontSize: 15, color: T.ink }}>{item.n}</Text>
            <Text style={{ fontWeight: '800', fontSize: 15, color: T.ink }}>₹{item.from} <Text style={{ color: T.soft, fontSize: 11 }}>INR</Text></Text>
          </Pressable>
        )}
      />
      <Pressable style={s.fab} onPress={onChat}><Text style={{ fontSize: 22 }}>💬</Text></Pressable>
    </View>
  );
}

function Country({ c, pkg, setPkg, onBack, onBuy }) {
  const groups = (c.packages && [...(c.packages.std || []), ...((c.packages.unl || []).map(g => ({ ...g, unl: true })))]) || [];
  return (
    <View style={s.fill}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: TOPPAD, paddingBottom: 140 }}>
        <Pressable onPress={onBack}><Text style={{ fontSize: 22, color: T.ink, fontWeight: '700' }}>‹ Back</Text></Pressable>
        <Text style={{ fontSize: 26, fontWeight: '800', color: T.ink, marginVertical: 10 }}>{c.n}</Text>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {c.iso ? <Image source={{ uri: flagUrl(c.iso) }} style={s.flag} /> : <Text style={{ fontSize: 22 }}>🌏</Text>}
            <Text style={{ fontWeight: '800', fontSize: 15, color: T.ink }}>{c.n}</Text>
          </View>
          <Text style={{ color: T.soft, fontWeight: '600', marginTop: 8, fontSize: 13 }}>📶 {c.op || 'Local networks'} · 5G where available</Text>
        </View>
        <Text style={{ fontWeight: '800', fontSize: 16, color: T.ink, marginTop: 18, marginBottom: 6 }}>Choose your package</Text>
        {groups.map(g => (
          <View key={g.d + (g.unl ? 'u' : '')}>
            <Text style={{ fontWeight: '800', color: T.soft, fontSize: 13, marginTop: 10, marginBottom: 6 }}>{g.d}{g.unl ? ' · Unlimited' : ''}</Text>
            {g.list.map(p => {
              const selp = pkg && pkg.bundle === p.bundle && pkg.days === g.d;
              return (
                <Pressable key={(p.bundle || p.label) + g.d} onPress={() => setPkg({ label: p.label, days: g.d, price: p.price, bundle: p.bundle })}
                  style={[s.pkg, selp && { borderColor: T.coral }]}>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: T.ink }}>{p.label}</Text>
                  <Text style={{ fontWeight: '800', fontSize: 15, color: T.ink }}>₹{p.price} <Text style={{ color: T.soft, fontSize: 11 }}>INR</Text></Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={s.buybar}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: T.soft, fontWeight: '700' }}>Total</Text>
          <Text style={{ fontWeight: '800', fontSize: 19, color: T.ink }}>₹{pkg ? pkg.price : c.from}</Text>
        </View>
        <Pressable style={s.btnPrimary} onPress={onBuy}><Text style={s.btnPrimaryTxt}>Buy now</Text></Pressable>
      </View>
    </View>
  );
}

function Checkout({ price, insQuote, insOn, setInsOn, onBack, onPay, paying }) {
  const [pay, setPay] = useState('gpay');
  const total = price + (insOn && insQuote ? insQuote.premiumINR : 0);
  const opts = [['gpay', 'Google Pay', 'UPI · instant'], ['phonepe', 'PhonePe', 'UPI · instant'], ['paytm', 'Paytm UPI', 'UPI · instant'], ['card', 'Card', 'Visa · Mastercard · RuPay']];
  return (
    <View style={s.fill}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: TOPPAD, paddingBottom: 150 }}>
        <Pressable onPress={onBack}><Text style={{ fontSize: 22, color: T.ink, fontWeight: '700' }}>‹ Back</Text></Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: T.ink, textAlign: 'center', marginBottom: 14 }}>Secure checkout</Text>
        {insQuote ? (
          <Pressable style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }]} onPress={() => setInsOn(!insOn)}>
            <Text style={{ fontSize: 24 }}>🛡</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: T.ink, fontSize: 14 }}>Add trip protection  <Text style={{ fontSize: 10, color: T.soft }}>DEMO</Text></Text>
              <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12 }}>₹{insQuote.premiumINR} · medical {insQuote.coverage.medical} + baggage + delays</Text>
            </View>
            <View style={[s.toggle, insOn && { backgroundColor: T.coral }]}>
              <View style={[s.knob, insOn && { alignSelf: 'flex-end' }]} />
            </View>
          </Pressable>
        ) : null}
        <Text style={{ fontWeight: '800', color: T.ink, fontSize: 13, textAlign: 'center', marginVertical: 8 }}>— Pay with —</Text>
        {opts.map(([k, name, sub]) => (
          <Pressable key={k} style={[s.pkg, pay === k && { borderColor: T.coral }]} onPress={() => setPay(k)}>
            <View>
              <Text style={{ fontWeight: '700', color: T.ink, fontSize: 14.5 }}>{name}</Text>
              <Text style={{ color: T.soft, fontSize: 11.5, fontWeight: '600' }}>{sub}</Text>
            </View>
            <View style={[s.radio, pay === k && { borderColor: T.coral }]}>{pay === k ? <View style={s.radioDot} /> : null}</View>
          </Pressable>
        ))}
        <Text style={{ color: T.soft, fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: 10 }}>
          Demo checkout — Razorpay UPI goes live at launch.
        </Text>
      </ScrollView>
      <View style={s.buybar}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: T.soft, fontWeight: '700' }}>Total</Text>
          <Text style={{ fontWeight: '800', fontSize: 19, color: T.ink }}>₹{total}</Text>
        </View>
        <Pressable style={[s.btnPrimary, paying && { opacity: 0.6 }]} onPress={onPay} disabled={paying}>
          {paying ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryTxt}>Pay now</Text>}
        </Pressable>
      </View>
    </View>
  );
}

/* order-complete art: hand holding a phone, signal badge pulsing above (original) */
function ConnectedScene({ width = 170 }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);
  const h = Math.round(width * 1.05);
  return (
    <View style={{ width, height: h, alignSelf: 'center' }}>
      <Svg width={width} height={h} viewBox="0 0 170 178">
        {/* floating dots */}
        <Circle cx="18" cy="70" r="4" fill="#5C9CDF" /><Circle cx="10" cy="104" r="6" fill="#23253A" />
        <Circle cx="156" cy="86" r="4" fill="#E85340" /><Circle cx="160" cy="112" r="6" fill="#5C9CDF" />
        <Circle cx="26" cy="48" r="2.5" fill="#23253A" />
        {/* sleeve + hand */}
        <Path d="M38 168q-10-28 10-40l14-8 44 6 8 42z" fill="#7B86E8" />
        <Path d="M52 122q-8-32 6-44 8-6 12 2l2 14 40-4q10 2 8 12l-4 44-50 10z" fill="#F6E3D5" />
        {/* phone */}
        <Rect x="58" y="34" width="62" height="106" rx="14" fill="#fff" stroke="#33386E" strokeWidth="4" />
        <Rect x="78" y="38" width="22" height="7" rx="3.5" fill="#7B86E8" />
        {/* screen: network badge + coral bar */}
        <Circle cx="89" cy="78" r="19" fill="none" stroke="#33386E" strokeWidth="1.8" />
        <Path d="M78 86h22v-10l-11-8-11 8z" fill="#7B86E8" />
        <Rect x="72" y="102" width="34" height="14" rx="3" fill="#FF6B57" />
        <Path d="M80 109h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </Svg>
      {/* pulsing signal badge */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: width / 2 - 26,
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }],
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [.85, 1] }),
      }}>
        <Svg width={52} height={52} viewBox="0 0 52 52">
          <Circle cx="26" cy="26" r="24" fill="#FF6B57" />
          <Path d="M14 24a17 17 0 0124 0" stroke="#FFD3CB" strokeWidth="4" fill="none" strokeLinecap="round" />
          <Path d="M19 30a10 10 0 0114 0" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
          <Circle cx="26" cy="37" r="3" fill="#fff" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function OrderComplete({ order, policy, country, onDone, onInstall }) {
  return (
    <View style={[s.fill, { padding: 20, paddingTop: TOPPAD + 30 }]}>
      <ConnectedScene width={170} />
      <Text style={{ color: T.coral, fontWeight: '800', fontSize: 17, textAlign: 'center', marginTop: 8 }}>शुभ यात्रा!</Text>
      <Text style={{ fontWeight: '800', fontSize: 22, color: T.ink, textAlign: 'center', marginTop: 4 }}>Your {country} eSIM is ready</Text>
      {order && order.orderReference ? (
        <Text style={{ color: T.soft, fontWeight: '600', textAlign: 'center', marginTop: 8 }}>
          Order {order.orderReference}{order.persisted ? ' · saved to your account' : ''}{order.emailSent ? ' · QR emailed' : ''}
        </Text>
      ) : null}
      {policy ? (
        <View style={[s.card, { marginTop: 18, flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
          <Text style={{ fontSize: 24 }}>🛡</Text>
          <View>
            <Text style={{ fontWeight: '800', color: T.ink }}>Trip protection active <Text style={{ fontSize: 10, color: T.soft }}>DEMO</Text></Text>
            <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5 }}>Policy {policy.policyNumber}</Text>
          </View>
        </View>
      ) : null}
      <View style={{ marginTop: 'auto', paddingBottom: 30 }}>
        <Pressable style={s.btnPrimary} onPress={onInstall}><Text style={s.btnPrimaryTxt}>Install or share</Text></Pressable>
        <Pressable style={[s.btnOutline, { marginTop: 12 }]} onPress={onDone}><Text style={s.btnOutlineTxt}>Go to My eSIMs</Text></Pressable>
      </View>
    </View>
  );
}

function MyEsims({ esims, session, countries, onAuth, onInstall, onBrowse }) {
  return (
    <ScrollView style={s.fill} contentContainerStyle={{ padding: 16, paddingTop: TOPPAD, paddingBottom: 110 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: T.ink, marginBottom: 14 }}>My eSIMs</Text>
      {!session ? (
        <View style={[s.card, { alignItems: 'center', padding: 30 }]}>
          <Text style={{ fontWeight: '800', fontSize: 16, color: T.ink }}>Sign in to see your eSIMs</Text>
          <Text style={{ color: T.soft, fontWeight: '600', textAlign: 'center', marginVertical: 10 }}>Purchases are saved to your account across devices.</Text>
          <Pressable style={[s.btnPrimary, { alignSelf: 'stretch' }]} onPress={onAuth}><Text style={s.btnPrimaryTxt}>Sign up / Log in</Text></Pressable>
        </View>
      ) : null}
      {session && esims.length === 0 ? (
        <View style={[s.card, { alignItems: 'center', padding: 30 }]}>
          <Text style={{ fontSize: 40 }}>🛒</Text>
          <Text style={{ fontWeight: '800', fontSize: 16, color: T.ink, marginTop: 8 }}>No eSIMs yet</Text>
          <Pressable style={[s.btnPrimary, { alignSelf: 'stretch', marginTop: 14 }]} onPress={onBrowse}><Text style={s.btnPrimaryTxt}>Browse eSIMs</Text></Pressable>
        </View>
      ) : null}
      {esims.map((e, i) => {
        const o = e.orders || {};
        const c = countries.find(x => x.n === o.country_name);
        const parts = (o.package_label || '— · —').split(' · ');
        return (
          <View key={(e.iccid || '') + i} style={[s.card, { marginBottom: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: T.line, paddingBottom: 10 }}>
              {c && c.iso ? <Image source={{ uri: flagUrl(c.iso) }} style={s.flag} /> : <Text style={{ fontSize: 20 }}>🌏</Text>}
              <Text style={{ fontWeight: '800', fontSize: 16, color: T.ink }}>{o.country_name || 'eSIM'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={s.stat}><Text style={s.statK}>Data</Text><Text style={s.statV}>{parts[0]}</Text></View>
              <View style={s.stat}><Text style={s.statK}>Validity</Text><Text style={s.statV}>{parts[1]}</Text></View>
            </View>
            <Pressable style={[s.btnPrimary, { marginTop: 12 }]} onPress={() => onInstall(e)}>
              <Text style={s.btnPrimaryTxt}>Install or share</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Profile({ session, onAuth, onLogout, onChat }) {
  const name = session ? ((session.user.user_metadata && session.user.user_metadata.full_name) || session.user.email) : 'Guest';
  return (
    <ScrollView style={s.fill} contentContainerStyle={{ padding: 16, paddingTop: TOPPAD, paddingBottom: 110 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: T.ink }}>Profile</Text>
      <View style={{ alignItems: 'center', marginVertical: 16 }}>
        <View style={s.avatar}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 24 }}>{(name[0] || 'G').toUpperCase()}</Text></View>
        <Text style={{ fontWeight: '800', fontSize: 18, color: T.ink, marginTop: 8 }}>{name}</Text>
        {!session ? <Pressable onPress={onAuth}><Text style={{ color: T.coral, fontWeight: '700', marginTop: 4 }}>Sign in / create account</Text></Pressable> : null}
      </View>
      {[['💬', 'Ask Yatri Sahayak (AI support)', onChat],
        ['📱', 'Check device compatibility', () => Alert.alert('Compatibility check', 'Dial *#06# — if you see an EID number, your phone supports eSIM.\n\niPhone XS/XR+, Pixel 3+, Samsung S20+ and most flagships after 2020. Phone must be network-unlocked.')],
        ['🛡', 'Travel insurance', () => Linking.openURL('https://www.policybazaar.com/travel-insurance/')],
        ['💱', 'Currency · INR ₹', null],
      ].map(([ic, lb, fn]) => (
        <Pressable key={lb} style={s.mitem} onPress={fn || undefined}>
          <Text style={{ fontSize: 18, width: 30 }}>{ic}</Text>
          <Text style={{ fontWeight: '700', fontSize: 14.5, color: T.ink, flex: 1 }}>{lb}</Text>
          <Text style={{ color: '#B2BFD4', fontSize: 18 }}>›</Text>
        </Pressable>
      ))}
      {session ? (
        <Pressable style={s.mitem} onPress={onLogout}>
          <Text style={{ fontSize: 18, width: 30 }}>🚪</Text>
          <Text style={{ fontWeight: '700', fontSize: 14.5, color: T.ink, flex: 1 }}>Log out</Text>
        </Pressable>
      ) : null}
      <Text style={{ textAlign: 'center', color: T.soft, fontSize: 11.5, fontWeight: '600', marginTop: 20 }}>
        MobiYatri v1.0 · Made in India with ❤️ · शुभ यात्रा
      </Text>
    </ScrollView>
  );
}

/* ================= modals ================= */
function AuthModal({ open, onClose, onDone }) {
  const [mode, setMode] = useState('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!email || !pass) return;
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await sb.auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
      onDone();
    } catch (e) { Alert.alert('Account', e.message || 'Something went wrong'); }
    setBusy(false);
  };
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.fill, { padding: 22, paddingTop: TOPPAD }]}>
        <Pressable onPress={onClose} style={{ alignSelf: 'flex-end' }}><Text style={{ fontSize: 22, color: T.ink }}>✕</Text></Pressable>
        <View style={{ flexDirection: 'row', gap: 26, borderBottomWidth: 1.5, borderColor: T.line, marginBottom: 20 }}>
          {[['login', 'Log in'], ['signup', 'Sign up']].map(([k, lb]) => (
            <Pressable key={k} onPress={() => setMode(k)} style={{ paddingVertical: 10, borderBottomWidth: 2.5, borderColor: mode === k ? T.ink : 'transparent' }}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: mode === k ? T.ink : T.soft }}>{lb}</Text>
            </Pressable>
          ))}
        </View>
        {mode === 'signup' ? <TextInput style={s.field} placeholder="Full name" placeholderTextColor={T.soft} value={name} onChangeText={setName} /> : null}
        <TextInput style={s.field} placeholder="Email" placeholderTextColor={T.soft} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={s.field} placeholder="Password" placeholderTextColor={T.soft} secureTextEntry value={pass} onChangeText={setPass} />
        <Pressable style={[s.btnPrimary, { marginTop: 8 }]} onPress={go} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryTxt}>{mode === 'signup' ? 'Agree and sign up' : 'Log in'}</Text>}
        </Pressable>
        <Text style={{ color: T.soft, fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: 14 }}>
          By continuing you agree to the Terms and Privacy Policy.
        </Text>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InstallModal({ open, esim, onClose }) {
  const lpa = esim && (esim.lpa_string || esim.lpa);
  const qr = lpa ? 'https://api.qrserver.com/v1/create-qr-code/?size=520x520&data=' + encodeURIComponent(lpa) : null;
  const oneTap = lpa ? 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=' + encodeURIComponent(lpa) : null;
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={s.fill} contentContainerStyle={{ padding: 22, paddingTop: TOPPAD }}>
        <Pressable onPress={onClose} style={{ alignSelf: 'flex-end' }}><Text style={{ fontSize: 22, color: T.ink }}>✕</Text></Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: T.ink, marginBottom: 14 }}>Install your eSIM</Text>
        {qr ? <Image source={{ uri: qr }} style={{ width: 210, height: 210, alignSelf: 'center', borderRadius: 12, backgroundColor: '#fff' }} /> : null}
        {esim && esim.iccid ? <Text style={{ textAlign: 'center', color: T.soft, fontWeight: '600', fontSize: 12, marginTop: 10 }}>ICCID {esim.iccid}</Text> : null}
        {Platform.OS === 'ios' && oneTap ? (
          <Pressable style={[s.btnPrimary, { marginTop: 18 }]} onPress={() => Linking.openURL(oneTap)}>
            <Text style={s.btnPrimaryTxt}>⚡ Install in one tap</Text>
          </Pressable>
        ) : null}
        {Platform.OS === 'android' && lpa ? (
          <View style={[s.card, { marginTop: 18 }]}>
            <Text style={{ fontWeight: '700', color: T.ink, fontSize: 13.5 }}>Android: Settings → Connections → SIM manager → Add eSIM → enter this code:</Text>
            <Text selectable style={{ fontFamily: 'monospace', fontSize: 12, color: T.ink, marginTop: 8 }}>{lpa}</Text>
          </View>
        ) : null}
        <View style={{ marginTop: 20 }}>
          {['1. Stay on Wi-Fi while installing', '2. Install BEFORE you fly — validity starts when you connect abroad',
            '3. On landing: data roaming ON for the MobiYatri line only', '4. Keep roaming OFF on your Jio/Airtel/Vi SIM'].map(t => (
              <Text key={t} style={{ color: T.soft, fontWeight: '600', fontSize: 13.5, marginVertical: 5 }}>{t}</Text>
            ))}
        </View>
      </ScrollView>
    </Modal>
  );
}

function ChatModal({ open, session, onClose }) {
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: "Namaste! 🙏 I'm Yatri Sahayak — ask me about choosing, installing, or fixing your eSIM. English या हिंदी!" }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const send = async preset => {
    const text = (preset || input).trim();
    if (!text || busy) return;
    setInput('');
    const next = [...msgs, { role: 'user', content: text }];
    setMsgs(next); setBusy(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (session) headers.Authorization = 'Bearer ' + session.access_token;
      const apiMsgs = next.slice(1).slice(-12); // drop the greeting; API needs user-first
      const d = await fetch(API + '/api/assistant', {
        method: 'POST', headers,
        body: JSON.stringify({ messages: apiMsgs, context: { device: 'MobiYatri native app · ' + Platform.OS + ' ' + Platform.Version } }),
      }).then(r => r.json());
      setMsgs(m => [...m, { role: 'assistant', content: d.reply || 'Sorry — try again.' }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', content: 'Could not reach support — check your connection.' }]);
    }
    setBusy(false);
  };
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.fill}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: TOPPAD, borderBottomWidth: 1, borderColor: T.line, gap: 12 }}>
          <View style={[s.avatar, { width: 40, height: 40, borderRadius: 20 }]}><Text style={{ fontSize: 18 }}>🛫</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 15, color: T.ink }}>Yatri Sahayak</Text>
            <Text style={{ color: T.soft, fontSize: 11.5, fontWeight: '600' }}>AI support · English + हिन्दी · 24/7</Text>
          </View>
          <Pressable onPress={onClose}><Text style={{ fontSize: 22, color: T.ink }}>✕</Text></Pressable>
        </View>
        <FlatList
          ref={listRef} data={busy ? [...msgs, { role: 'typing', content: '' }] : msgs} keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => listRef.current && listRef.current.scrollToEnd({ animated: true })}
          renderItem={({ item }) => item.role === 'typing'
            ? <View style={[s.bub, s.bubBot]}><ActivityIndicator size="small" color={T.soft} /></View>
            : <View style={[s.bub, item.role === 'user' ? s.bubUser : s.bubBot]}>
                <Text style={{ color: item.role === 'user' ? '#fff' : T.ink, fontWeight: '600', fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
              </View>}
        />
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 6, flexWrap: 'wrap' }}>
          {['How do I install?', 'eSIM not working', 'हिंदी में पूछें'].map(q => (
            <Pressable key={q} style={s.chip} onPress={() => send(q)}><Text style={{ fontWeight: '700', fontSize: 12, color: T.ink }}>{q}</Text></Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 28, borderTopWidth: 1, borderColor: T.line }}>
          <TextInput style={[s.field, { flex: 1, marginBottom: 0, borderRadius: 999 }]} placeholder="Ask anything about your eSIM…"
            placeholderTextColor={T.soft} value={input} onChangeText={setInput} onSubmitEditing={() => send()} />
          <Pressable style={s.sendBtn} onPress={() => send()}><Text style={{ color: '#fff', fontSize: 17 }}>➤</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ================= styles ================= */
const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: T.bg },
  card: { backgroundColor: T.card, borderRadius: 18, padding: 16, shadowColor: '#2A2C4A', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  search: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, fontWeight: '600', color: T.ink, marginBottom: 14, elevation: 2, shadowColor: '#2A2C4A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  promo: { backgroundColor: T.indigoDark, borderRadius: 20, padding: 18, marginBottom: 14 },
  svcgrid: { backgroundColor: '#fff', borderRadius: 20, flexDirection: 'row', paddingVertical: 14, marginBottom: 14, elevation: 2, shadowColor: '#2A2C4A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  svc: { flex: 1, alignItems: 'center', gap: 6 },
  svcIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: T.tint, alignItems: 'center', justifyContent: 'center' },
  svcLbl: { fontSize: 11.5, fontWeight: '700', color: T.ink },
  crow: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 15, elevation: 2, shadowColor: '#2A2C4A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  flag: { width: 38, height: 28, borderRadius: 6, backgroundColor: '#E8E7EF' },
  fab: { position: 'absolute', right: 16, bottom: 100, width: 54, height: 54, borderRadius: 27, backgroundColor: T.coral, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: T.coral, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  tabbar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderColor: T.line, paddingTop: 8, paddingBottom: 24 },
  tabbtn: { flex: 1, alignItems: 'center', gap: 2 },
  tablbl: { fontSize: 11, fontWeight: '700', color: '#94A1B8' },
  tabdot: { width: 20, height: 3, borderRadius: 2, backgroundColor: T.coral, marginTop: 2 },
  pkg: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 2, borderColor: 'transparent', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#2A2C4A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  buybar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(246,250,254,0.97)', borderTopWidth: 1, borderColor: '#DDE4F0', padding: 16, paddingBottom: 30 },
  btnPrimary: { backgroundColor: T.coral, borderRadius: 999, paddingVertical: 15, alignItems: 'center', shadowColor: T.coral, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D8E1EF', borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  btnOutlineTxt: { color: T.ink, fontWeight: '700', fontSize: 16 },
  btnOutlineDark: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.26)', borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  btnOutlineLight: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D6DDEB', borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  field: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D8E1EF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: T.ink, marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: T.coralDeep, alignItems: 'center', justifyContent: 'center' },
  mitem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 14, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: '#EAF0F9', borderRadius: 12, padding: 10 },
  statK: { fontSize: 11.5, color: T.soft, fontWeight: '700' },
  statV: { fontSize: 15, fontWeight: '800', color: T.ink, marginTop: 2 },
  toggle: { width: 46, height: 28, borderRadius: 999, backgroundColor: '#DDE4F0', padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: 'flex-start', elevation: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C6D2E4', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: T.coral },
  bub: { maxWidth: '82%', padding: 12, borderRadius: 16, marginBottom: 10 },
  bubUser: { alignSelf: 'flex-end', backgroundColor: T.coral, borderBottomRightRadius: 6 },
  bubBot: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 6, elevation: 1 },
  chip: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D8E1EF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: T.coral, alignItems: 'center', justifyContent: 'center' },
});
