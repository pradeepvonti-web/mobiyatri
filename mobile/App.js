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
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

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
  const [screen, setScreen] = useState('splash');
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
    const t = setTimeout(() => setScreen(s => (s === 'splash' ? 'welcome' : s)), 2200);
    return () => { clearTimeout(t); sub && sub.subscription && sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (session && (screen === 'splash' || screen === 'welcome')) {
      const t = setTimeout(() => setScreen('main'), screen === 'splash' ? 2200 : 0);
      return () => clearTimeout(t);
    }
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

  if (screen === 'splash') return <Splash />;
  if (screen === 'welcome') return (
    <Welcome onExplore={() => setScreen('main')} onAuth={() => setAuthOpen(true)}
      authModal={<AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onDone={() => { setAuthOpen(false); setScreen('main'); }} />} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="dark-content" />
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
  const CONFETTI = [
    ['6%', '78%', '#F6DBA6', 56, 28, '30deg', 14],   // gold capsule top-right
    ['10%', '4%', '#CFE6D6', 42, 42, '0deg', 21],    // mint circle
    ['26%', '58%', '#CBE2EE', 52, 52, '18deg', 10],  // powder diamond
    ['46%', '-4%', '#DDE6DA', 46, 46, '14deg', 10],
    ['52%', '86%', '#F3C08F', 40, 40, '0deg', 20],   // peach circle
    ['70%', '76%', '#CBE2EE', 50, 26, '-18deg', 13],
    ['80%', '6%', '#F6DBA6', 34, 30, '-12deg', 12],
    ['88%', '46%', '#DDE6DA', 44, 44, '0deg', 22],
  ];
  return (
    <View style={[s.fill, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]}>
      <StatusBar barStyle="dark-content" />
      {CONFETTI.map(([top, left, bg, w, h, rot, r], i) => (
        <View key={i} pointerEvents="none" style={{
          position: 'absolute', top, left, width: w, height: h, backgroundColor: bg,
          opacity: .75, borderRadius: r, transform: [{ rotate: rot }],
        }} />
      ))}
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
      <Text style={{ color: T.soft, marginTop: 12, fontWeight: '600' }}>Travel data for Indian tourists</Text>
      <Text style={{ color: T.coral, marginTop: 4, fontWeight: '700' }}>नमस्ते · शुभ यात्रा</Text>
    </View>
  );
}

/* night-sky scenery matching the web app's welcome screen (stars, glows, confetti, flight path) */
function NightScenery() {
  const stars = [[58, 64], [142, 36], [332, 58], [262, 26], [372, 128], [28, 152], [205, 80], [92, 112], [360, 300], [40, 520], [150, 560], [330, 480]];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', top: -90, right: -70, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(123,108,255,.16)' }} />
      <View style={{ position: 'absolute', top: 260, left: -90, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(62,214,192,.10)' }} />
      <View style={{ position: 'absolute', bottom: 40, right: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,107,87,.16)' }} />
      {stars.map(([x, y], i) => (
        <View key={i} style={{ position: 'absolute', left: x, top: y, width: i % 3 ? 2.5 : 3.5, height: i % 3 ? 2.5 : 3.5, borderRadius: 2, backgroundColor: '#C9CEF5', opacity: .5 }} />
      ))}
      {[['8%', '10%', '#F6DBA6', 34, 15, '22deg'], ['13%', '78%', '#CFE6D6', 24, 24, '0deg'], ['40%', '4%', '#F3C98F', 16, 16, '0deg'],
        ['78%', '8%', '#F6C185', 20, 20, '-15deg'], ['86%', '80%', '#CBE2DE', 34, 13, '30deg'], ['26%', '88%', '#F9E3BC', 14, 30, '-25deg']]
        .map(([top, left, bg, w, h, rot], i) => (
          <View key={'c' + i} style={{ position: 'absolute', top, left, width: w, height: h, backgroundColor: bg, opacity: .5, borderRadius: w === h ? w / 2 : 4, transform: [{ rotate: rot }] }} />
        ))}
      <Text style={{ position: 'absolute', top: '30%', right: '14%', fontSize: 26, transform: [{ rotate: '12deg' }] }}>🛩️</Text>
    </View>
  );
}

function Welcome({ onExplore, onAuth, authModal }) {
  return (
    <View style={[s.fill, { backgroundColor: T.night }]}>
      <StatusBar barStyle="light-content" />
      <NightScenery />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <LogoMark size={74} />
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#F5F6FC', marginTop: 14 }}>Welcome to MobiYatri</Text>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <View style={{ width: 22, height: 4, backgroundColor: '#FF9933', borderRadius: 2 }} />
          <View style={{ width: 22, height: 4, backgroundColor: '#F3ECDF', borderRadius: 2, marginHorizontal: 2 }} />
          <View style={{ width: 22, height: 4, backgroundColor: '#2E7D4F', borderRadius: 2 }} />
        </View>
        <Text style={{ color: '#A9ACC9', textAlign: 'center', marginTop: 10, fontWeight: '600' }}>
          नमस्ते! Travel data for Indian tourists — pay in ₹, connect anywhere.
        </Text>
        <View style={{ marginTop: 22, alignSelf: 'stretch' }}>
          {['🏷  No expensive international roaming', '🌏  Coverage in 190+ destinations',
            '⚡  Connect in minutes, no physical SIM', '💬  24/7 support in English & हिन्दी'].map(t => (
              <Text key={t} style={{ color: '#E7E9F6', fontWeight: '700', fontSize: 14.5, marginVertical: 7 }}>{t}</Text>
            ))}
        </View>
      </View>
      <View style={{ padding: 20, paddingBottom: 34 }}>
        <Pressable style={s.btnOutlineDark} onPress={onAuth}><Text style={{ color: '#F5F6FC', fontWeight: '700', fontSize: 16 }}>Sign up / Log in</Text></Pressable>
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

function OrderComplete({ order, policy, country, onDone, onInstall }) {
  return (
    <View style={[s.fill, { padding: 20, paddingTop: TOPPAD + 30 }]}>
      <Text style={{ fontSize: 56, textAlign: 'center' }}>🎉</Text>
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
