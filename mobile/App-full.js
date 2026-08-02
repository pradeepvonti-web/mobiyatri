// MobiYatri — native app (Expo / React Native, SDK 57)
// Complete store: onboarding, auth, store home (tabs + search + intro carousel),
// country detail (packages, policy sheet, compatibility), checkout (insurance,
// payment methods), order complete, My eSIMs + eSIM detail (install, troubleshooting),
// full profile (account, orders, refer, notifications), Yatri Sahayak AI chat.
// Same backend + Supabase as the web app. Dev API points at the desktop server on LAN;
// switch API to the deployed URL (e.g. https://mobiyatri.onrender.com) for production builds.
import 'react-native-url-polyfill/auto';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, Image, KeyboardAvoidingView, Linking, Modal,
  Platform, Pressable, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/* ---------------- config ---------------- */
const API = 'http://192.168.1.122:4000'; // dev: desktop server on LAN. Prod: deployed URL.
const SUPABASE_URL = 'https://acvjjepiyoxzwleggqvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdmpqZXBpeW94endsZWdncXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MjE3NDIsImV4cCI6MjEwMTE5Nzc0Mn0.wBsCo6aX1arPpKR8Z9Qqj4Ful_VAsKex1903qmz1xcg';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

/* ---------------- theme (original app palette: ice-blue light surfaces + indigo/coral brand) ---------------- */
const T = {
  bg: '#F1F5FB', bgDeep: '#E4EAF6', card: '#FFFFFF', ink: '#23253A', soft: '#76819B',
  line: '#E5EBF5', coral: '#FF6B57', coralDeep: '#E85340', indigo: '#33386E',
  powder: '#A5C8D8', sage: '#8FC09B', gold: '#F4B63F', mint: '#D6EBDB', mintInk: '#1F7A40',
  goldBg: '#FFE9C9', goldInk: '#8A5A00', night: '#151834',
};
const TOPPAD = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 54;

const FALLBACK = [
  { iso: 'th', n: 'Thailand', op: 'AIS', from: 49, pop: 1 },
  { iso: 'ae', n: 'UAE (Dubai)', op: 'Etisalat', from: 99, pop: 1 },
  { iso: 'sg', n: 'Singapore', op: 'StarHub', from: 49, pop: 1 },
  { iso: 'id', n: 'Indonesia (Bali)', op: 'Telkomsel', from: 49, pop: 1 },
];
const flagUrl = iso => `https://flagcdn.com/w160/${iso}.png`;
const qrUrl = (lpa, size = 210) => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(lpa)}`;
const ONE_TAP = lpa => 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=' + encodeURIComponent(lpa);
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const firstName = session =>
  session?.user?.user_metadata?.full_name?.split(' ')[0] || (session?.user?.email || '').split('@')[0] || 'Yatri';

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const { data: { session } } = await sb.auth.getSession();
  if (session) headers.Authorization = 'Bearer ' + session.access_token;
  return headers;
}

/* ================= tiny UI kit ================= */
const Btn = ({ label, onPress, kind = 'coral', style, small, disabled, left }) => (
  <Pressable onPress={disabled ? null : onPress} style={({ pressed }) => [
    s.btn, kind === 'coral' && s.btnCoral, kind === 'white' && s.btnWhite, kind === 'outline' && s.btnOutline,
    small && { paddingVertical: 10, paddingHorizontal: 18 }, disabled && { opacity: .55 },
    pressed && { transform: [{ scale: .98 }] }, style,
  ]}>
    {left}
    <Text style={[s.btnTxt, kind !== 'coral' && { color: T.ink }, small && { fontSize: 14 }]}>{label}</Text>
  </Pressable>
);

const Chip = ({ txt, bg = T.goldBg, fg = T.goldInk, style }) => (
  <View style={[{ backgroundColor: bg, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 }, style]}>
    <Text style={{ color: fg, fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: .4 }}>{txt}</Text>
  </View>
);

const StatTile = ({ k, v, flex = 1 }) => (
  <View style={{ flex, backgroundColor: T.bg, borderRadius: 12, padding: 10 }}>
    <Text style={{ color: T.soft, fontSize: 11, fontWeight: '700' }}>{k}</Text>
    <Text style={{ color: T.ink, fontSize: 15, fontWeight: '800', marginTop: 2 }}>{v}</Text>
  </View>
);

function Accordion({ title, children, icon }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.accWrap}>
      <Pressable onPress={() => setOpen(o => !o)} style={s.accHead}>
        {icon ? <Text style={{ fontSize: 16, marginRight: 8 }}>{icon}</Text> : null}
        <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 14.5 }}>{title}</Text>
        <Text style={{ color: T.ink, fontSize: 15, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>⌄</Text>
      </Pressable>
      {open && <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text style={{ color: T.soft, fontSize: 13.5, lineHeight: 20, fontWeight: '500' }}>{children}</Text>
      </View>}
    </View>
  );
}

function Toggle({ on, onChange }) {
  return (
    <Pressable onPress={() => onChange(!on)} style={{
      width: 50, height: 29, borderRadius: 999, backgroundColor: on ? T.indigo : '#CBD2E4', padding: 3,
      alignItems: on ? 'flex-end' : 'flex-start', justifyContent: 'center',
    }}>
      <View style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: '#fff' }} />
    </Pressable>
  );
}

/* toast */
let pushToast = () => {};
function ToastHost() {
  const [msg, setMsg] = useState(null);
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pushToast = m => {
      setMsg(m);
      Animated.timing(op, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      setTimeout(() => Animated.timing(op, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => setMsg(null)), 3200);
    };
  }, []);
  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', bottom: 100, left: 24, right: 24, opacity: op, alignItems: 'center', zIndex: 99,
    }}>
      <View style={{ backgroundColor: T.ink, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 22, maxWidth: '100%' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13.5, textAlign: 'center' }}>{msg}</Text>
      </View>
    </Animated.View>
  );
}

/* ================= root ================= */
export default function App() {
  const [phase, setPhase] = useState('splash');           // splash | welcome | main
  const [tab, setTab] = useState('store');                // store | esims | profile
  const [stack, setStack] = useState([]);                 // pushed screens over tabs
  const [countries, setCountries] = useState(FALLBACK);
  const [regions, setRegions] = useState([]);
  const [globalPacks, setGlobalPacks] = useState([]);
  const [session, setSession] = useState(null);
  const [myEsims, setMyEsims] = useState(null);
  const [orders, setOrders] = useState(null);
  const [refCode, setRefCode] = useState(null);
  // modals
  const [authOpen, setAuthOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [installEsim, setInstallEsim] = useState(null);
  const [compatOpen, setCompatOpen] = useState(false);
  const pendingBuy = useRef(null);

  const push = (name, params) => setStack(st => [...st, { name, params }]);
  const pop = () => setStack(st => st.slice(0, -1));
  const home = () => setStack([]);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = sb.auth.onAuthStateChange((_e, sn) => setSession(sn || null));
    fetch(API + '/api/catalogue').then(r => r.json()).then(d => {
      if (d?.countries?.length) {
        setCountries(d.countries.filter(c => c.iso));
        setRegions(d.regions || []);
        setGlobalPacks(d.global || []);
      }
    }).catch(() => {});
    const t = setTimeout(() => setPhase(p => (p === 'splash' ? 'welcome' : p)), 2000);
    AsyncStorage.getItem('seenWelcome').then(v => { if (v) setTimeout(() => setPhase('main'), 2000); });
    return () => { clearTimeout(t); sub?.subscription?.unsubscribe(); };
  }, []);

  const loadAccount = async () => {
    if (!session) { setMyEsims(null); setOrders(null); return; }
    const { data: es } = await sb.from('esims')
      .select('iccid,matching_id,smdp_address,lpa_string,status,created_at,orders(country_name,package_label,price_inr)')
      .order('created_at', { ascending: false });
    setMyEsims(es || []);
    const { data: os } = await sb.from('orders')
      .select('order_reference,country_name,package_label,price_inr,created_at')
      .order('created_at', { ascending: false });
    setOrders(os || []);
    const { data: pr } = await sb.from('profiles').select('referral_code').eq('id', session.user.id).single();
    setRefCode(pr?.referral_code || null);
  };
  useEffect(() => { loadAccount(); }, [session]);

  const requireAuth = (fn) => {
    if (!session) { pendingBuy.current = fn; setAuthOpen(true); pushToast('Sign in to continue'); return; }
    fn();
  };
  useEffect(() => {
    if (session && pendingBuy.current) { const f = pendingBuy.current; pendingBuy.current = null; f(); }
  }, [session]);

  const ctx = {
    countries, regions, globalPacks, session, myEsims, orders, refCode, loadAccount,
    push, pop, home, setTab, requireAuth,
    openAuth: () => setAuthOpen(true), openSearch: () => setSearchOpen(true),
    openChat: () => setChatOpen(true), openInstall: setInstallEsim, openCompat: () => setCompatOpen(true),
    logout: () => { sb.auth.signOut(); home(); setTab('store'); pushToast('Logged out'); },
  };

  if (phase === 'splash') return <Splash />;
  if (phase === 'welcome') return <Welcome done={() => { AsyncStorage.setItem('seenWelcome', '1'); setPhase('main'); }} />;

  const top = stack[stack.length - 1];
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />
      {!top && tab === 'store' && <StoreHome ctx={ctx} />}
      {!top && tab === 'esims' && <MyEsimsScreen ctx={ctx} />}
      {!top && tab === 'profile' && <ProfileScreen ctx={ctx} />}
      {top?.name === 'country' && <CountryScreen ctx={ctx} c={top.params} />}
      {top?.name === 'checkout' && <CheckoutScreen ctx={ctx} order={top.params} />}
      {top?.name === 'complete' && <CompleteScreen ctx={ctx} result={top.params} />}
      {top?.name === 'esimdetail' && <EsimDetailScreen ctx={ctx} e={top.params} />}
      {top?.name === 'account' && <AccountScreen ctx={ctx} />}
      {top?.name === 'orders' && <OrdersScreen ctx={ctx} />}
      {top?.name === 'refer' && <ReferScreen ctx={ctx} />}
      {top?.name === 'notify' && <NotifyScreen ctx={ctx} />}

      {!top && <TabBar tab={tab} setTab={setTab} />}
      {!top && <ChatFab onPress={() => setChatOpen(true)} />}

      <AuthModal open={authOpen} close={() => setAuthOpen(false)} />
      <SearchModal open={searchOpen} close={() => setSearchOpen(false)} ctx={ctx} />
      <InstallModal esim={installEsim} close={() => setInstallEsim(null)} />
      <CompatModal open={compatOpen} close={() => setCompatOpen(false)} />
      <ChatModal open={chatOpen} close={() => setChatOpen(false)} session={session} />
      <ToastHost />
    </View>
  );
}

/* ================= splash + welcome ================= */
function Splash() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: T.night, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text style={{ fontSize: 54, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }] }}>✈️</Animated.Text>
      <Text style={{ marginTop: 14, fontSize: 30, fontWeight: '800' }}>
        <Text style={{ color: T.coral }}>mobi</Text><Text style={{ color: '#fff' }}>yatri</Text>
      </Text>
      <Text style={{ color: '#8E93BC', marginTop: 6, fontWeight: '600' }}>नमस्ते · शुभ यात्रा</Text>
    </View>
  );
}

const WELCOME_SLIDES = [
  { icon: '🌏', t: 'Global connection,\nIndian prices.', d: 'Instant travel eSIMs for 190+ countries — Thailand from ₹49. Pay with UPI, RuPay or cards.' },
  { icon: '⚡', t: 'Installed before\nyou board.', d: 'Your QR arrives the second you pay. iPhones install it in one tap — no SIM shops, no queues.' },
  { icon: '💬', t: 'Yatri Sahayak,\nalways on.', d: '24/7 AI help in English and हिन्दी that knows your orders and walks you through setup.' },
];

function Welcome({ done }) {
  const [i, setI] = useState(0);
  const sl = WELCOME_SLIDES[i];
  return (
    <View style={{ flex: 1, backgroundColor: T.night, padding: 28, paddingTop: TOPPAD + 30 }}>
      <Text style={{ fontSize: 24, fontWeight: '800' }}>
        <Text style={{ color: T.coral }}>mobi</Text><Text style={{ color: '#fff' }}>yatri</Text>
      </Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 74, marginBottom: 22 }}>{sl.icon}</Text>
        <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800', lineHeight: 42 }}>{sl.t}</Text>
        <Text style={{ color: '#A9ACC9', fontSize: 16, marginTop: 14, lineHeight: 24, fontWeight: '500' }}>{sl.d}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 26 }}>
        {WELCOME_SLIDES.map((_, x) => (
          <View key={x} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: x <= i ? T.coral : '#2A2D55' }} />
        ))}
      </View>
      <Btn label={i < 2 ? 'Next' : "Let's go — शुभ यात्रा!"} onPress={() => (i < 2 ? setI(i + 1) : done())} />
      {i < 2 && <Pressable onPress={done} style={{ alignItems: 'center', marginTop: 16 }}>
        <Text style={{ color: '#8E93BC', fontWeight: '700' }}>Skip</Text>
      </Pressable>}
    </View>
  );
}

/* ================= store home ================= */
const STORE_TABS = [['popular', 'Popular'], ['local', 'Local'], ['regional', 'Regional'], ['global', 'Global']];
const INTRO_SLIDES = [
  { t: 'New to MobiYatri?', d: 'Pick a destination, pay in ₹, scan one QR — you land connected. That simple.' },
  { t: 'Keep your Indian SIM', d: 'WhatsApp and OTPs keep working on your number. The eSIM only carries your data.' },
  { t: 'Check your phone', d: 'Dial *#06# — if an EID appears, your phone is eSIM-ready. Tap here to learn more.' },
];

function StoreHome({ ctx }) {
  const { countries, regions, globalPacks, session, push, openSearch, openCompat, openAuth } = ctx;
  const [cat, setCat] = useState('popular');
  const [intro, setIntro] = useState(0);
  useEffect(() => { const t = setInterval(() => setIntro(i => (i + 1) % INTRO_SLIDES.length), 5000); return () => clearInterval(t); }, []);

  let list = countries;
  if (cat === 'popular') list = countries.filter(c => c.pop);
  else if (cat === 'regional') list = regions;
  else if (cat === 'global') list = globalPacks;
  if (!list?.length) list = countries.slice(0, 12);

  return (
    <View style={{ flex: 1 }}>
      {/* header: greeting + wallet chip */}
      <View style={{ paddingTop: TOPPAD, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontSize: 26, fontWeight: '800', color: T.ink }}>
          {session ? `Hi ${firstName(session)}` : 'नमस्ते!'}
        </Text>
        <Pressable onPress={() => (session ? push('refer') : openAuth())} style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: T.soft, fontSize: 11, fontWeight: '700' }}>YatriCash</Text>
          <View style={{ backgroundColor: T.mint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 2 }}>
            <Text style={{ color: T.mintInk, fontWeight: '800', fontSize: 13 }}>₹0</Text>
          </View>
        </Pressable>
      </View>

      <FlatList
        data={list}
        keyExtractor={(c, i) => (c.iso || c.n) + i}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
        ListHeaderComponent={
          <View>
            {/* search */}
            <Pressable onPress={openSearch} style={[s.searchBar, { marginTop: 14 }]}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <Text style={{ color: '#8B8FA5', fontSize: 15.5, fontWeight: '600', marginLeft: 10 }}>Where do you need an eSIM?</Text>
            </Pressable>
            {/* intro carousel card */}
            <Pressable onPress={openCompat} style={{ backgroundColor: T.bgDeep, borderRadius: 20, padding: 20, marginTop: 14 }}>
              <Text style={{ fontSize: 34, textAlign: 'center' }}>{['🧳', '📱', '☎️'][intro]}</Text>
              <Text style={{ color: T.ink, fontWeight: '800', fontSize: 16.5, textAlign: 'center', marginTop: 8 }}>{INTRO_SLIDES[intro].t}</Text>
              <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, textAlign: 'center', marginTop: 4, lineHeight: 19 }}>{INTRO_SLIDES[intro].d}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
                {INTRO_SLIDES.map((_, x) => (
                  <View key={x} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: x === intro ? T.ink : '#CBD5E8' }} />
                ))}
              </View>
            </Pressable>
            {/* tabs */}
            <View style={{ flexDirection: 'row', marginTop: 18, borderBottomWidth: 1.5, borderBottomColor: 'rgba(22,24,42,.14)' }}>
              {STORE_TABS.map(([k, label]) => (
                <Pressable key={k} onPress={() => setCat(k)} style={{ flex: 1, alignItems: 'center', paddingBottom: 10 }}>
                  <Text style={{ fontWeight: '800', fontSize: 14.5, color: T.ink, opacity: cat === k ? 1 : .5 }}>{label}</Text>
                  {cat === k && <View style={{ position: 'absolute', bottom: -1.5, left: 12, right: 12, height: 3, borderRadius: 2, backgroundColor: T.ink }} />}
                </Pressable>
              ))}
            </View>
            <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5, marginVertical: 12 }}>
              Live ₹ prices — packages start from the shown price.
            </Text>
          </View>
        }
        renderItem={({ item: c }) => <CountryRow c={c} onPress={() => push('country', c)} />}
      />
    </View>
  );
}

function CountryRow({ c, onPress }) {
  return (
    <Pressable onPress={onPress} style={s.row}>
      {c.iso
        ? <Image source={{ uri: flagUrl(c.iso) }} style={s.flag} />
        : <View style={[s.flag, { backgroundColor: T.indigo, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ fontSize: 15 }}>🌐</Text></View>}
      <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 15.5, marginLeft: 12 }}>{c.n}</Text>
      <Text style={{ color: T.ink, fontWeight: '800', fontSize: 16 }}>₹{c.from}</Text>
      <Text style={{ color: T.soft, fontSize: 11, fontWeight: '600', marginLeft: 4 }}>per pack</Text>
    </Pressable>
  );
}

/* ================= search modal ================= */
function SearchModal({ open, close, ctx }) {
  const { countries, regions, globalPacks, push } = ctx;
  const [q, setQ] = useState('');
  const hits = q.trim() ? countries.filter(c => c.n.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const also = [...regions, ...globalPacks].slice(0, 3);
  const go = c => { close(); setQ(''); push('country', c); };
  return (
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: T.bg, paddingTop: TOPPAD }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
          <View style={[s.searchBar, { flex: 1, marginTop: 0 }]}>
            <Text style={{ fontSize: 16 }}>🔍</Text>
            <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Where do you need an eSIM?"
              placeholderTextColor="#8B8FA5" style={{ flex: 1, marginLeft: 10, fontSize: 15.5, fontWeight: '600', color: T.ink }} />
          </View>
          <Pressable onPress={close}><Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>Cancel</Text></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          {hits.map(c => <CountryRow key={c.iso} c={c} onPress={() => go(c)} />)}
          {q.trim().length > 0 && hits.length === 0 &&
            <Text style={{ color: T.soft, fontWeight: '600', padding: 18, textAlign: 'center' }}>No matches — try another spelling.</Text>}
          {q.trim().length > 0 && also.length > 0 && <View>
            <Text style={{ color: T.soft, fontWeight: '800', fontSize: 12, marginVertical: 10, textTransform: 'uppercase', letterSpacing: .5 }}>Also available in…</Text>
            {also.map((r, i) => <CountryRow key={r.n + i} c={r} onPress={() => go(r)} />)}
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ================= country detail ================= */
function CountryScreen({ ctx, c }) {
  const { pop, push, requireAuth, openCompat } = ctx;
  const [seg, setSeg] = useState('std');
  const [sel, setSel] = useState(null);
  const [details, setDetails] = useState(false);
  const groups = (c.packages && c.packages[seg]) || [];
  const flat = groups.flatMap(g => g.list.map(p => ({ ...p, d: g.d })));
  const active = sel || (flat[0] && { pkg: `${flat[0].label} · ${flat[0].d}`, price: flat[0].price, bundle: flat[0].bundle });
  const hasUnl = c.packages?.unl?.length > 0;

  const buy = () => requireAuth(() => push('checkout', { country: c.n, iso: c.iso || null, ...active }));

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title={c.n} onBack={pop} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 130 }}>
        {/* header card */}
        <View style={[s.card, { flexDirection: 'row', alignItems: 'center' }]}>
          {c.iso
            ? <Image source={{ uri: flagUrl(c.iso) }} style={{ width: 52, height: 37, borderRadius: 7 }} />
            : <Text style={{ fontSize: 34 }}>🌐</Text>}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 18 }}>{c.n}</Text>
            <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5, marginTop: 2 }}>📡 {c.op || 'Local networks'} · instant QR delivery</Text>
          </View>
        </View>
        <Pressable onPress={openCompat} style={[s.card, { marginTop: 10, flexDirection: 'row', alignItems: 'center' }]}>
          <Text style={{ fontSize: 16 }}>📱</Text>
          <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 13.5, marginLeft: 10 }}>Is this phone eSIM-compatible?</Text>
          <View style={{ backgroundColor: T.mint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ color: T.mintInk, fontWeight: '800', fontSize: 12.5 }}>Check ✓</Text>
          </View>
        </Pressable>

        {/* segment */}
        {hasUnl && (
          <View style={{ flexDirection: 'row', backgroundColor: T.card, borderRadius: 999, padding: 4, marginTop: 16, alignSelf: 'flex-start' }}>
            {[['std', 'Standard'], ['unl', 'Unlimited']].map(([k, label]) => (
              <Pressable key={k} onPress={() => { setSeg(k); setSel(null); }} style={{
                paddingVertical: 8, paddingHorizontal: 20, borderRadius: 999, backgroundColor: seg === k ? T.indigo : 'transparent',
              }}>
                <Text style={{ fontWeight: '800', fontSize: 13.5, color: seg === k ? '#fff' : T.ink }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* package groups */}
        {groups.map(g => (
          <View key={g.d}>
            <Text style={{ color: T.soft, fontWeight: '800', fontSize: 12, marginTop: 18, marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
              📅 {g.d} validity
            </Text>
            {g.list.map(p => {
              const key = `${p.label} · ${g.d}`;
              const isSel = active && active.pkg === key;
              return (
                <Pressable key={key} onPress={() => setSel({ pkg: key, price: p.price, bundle: p.bundle })}
                  style={[s.card, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: isSel ? T.indigo : 'transparent' }]}>
                  <View style={{
                    width: 20, height: 20, borderRadius: 10, borderWidth: isSel ? 6 : 2,
                    borderColor: isSel ? T.indigo : '#C5CBDD', marginRight: 12,
                  }} />
                  <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 15.5 }}>{p.label}</Text>
                  <Text style={{ color: T.ink, fontWeight: '800', fontSize: 16 }}>₹{p.price}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        <Btn kind="white" label="📋 Package details" onPress={() => setDetails(true)} style={{ marginTop: 14 }} />
        <Text style={{ color: T.soft, fontSize: 12, fontWeight: '500', marginTop: 12, lineHeight: 18 }}>
          By completing an order you confirm this device is eSIM-compatible and network-unlocked.
        </Text>
      </ScrollView>

      {/* buy bar */}
      {active && (
        <View style={s.buyBar}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: T.soft, fontWeight: '700', fontSize: 12 }}>{active.pkg}</Text>
            <Text style={{ color: T.coralDeep, fontWeight: '800', fontSize: 20 }}>₹{active.price}</Text>
          </View>
          <Btn label="Buy now" onPress={buy} style={{ paddingHorizontal: 34 }} />
        </View>
      )}

      {/* package policy sheet */}
      <Modal visible={details} transparent animationType="slide" onRequestClose={() => setDetails(false)}>
        <Pressable style={s.sheetBack} onPress={() => setDetails(false)} />
        <View style={s.sheet}>
          <Text style={s.sheetTitle}>Package details</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            <Accordion icon="⏱️" title="When does validity start?">
              Validity begins only when the eSIM first connects to a supported network at your destination — not at purchase or install. Install at home; it activates when you land.
            </Accordion>
            <Accordion icon="📥" title="Installation window">
              Your activation code stays installable for the period stated at purchase. One code installs on one device, once.
            </Accordion>
            <Accordion icon="🌐" title="Data & speeds">
              High-speed data on {'the local partner network'} — hotspot/tethering allowed. Speeds depend on local coverage and are not guaranteed.
            </Accordion>
            <Accordion icon="📵" title="No number included">
              This is a data-only eSIM. Keep your Indian SIM in for calls, WhatsApp and OTP SMS — just keep its data roaming off.
            </Accordion>
            <Accordion icon="🔁" title="Top-ups">
              Top-ups are coming soon. Until then, buying a fresh pack for the same destination works exactly the same way.
            </Accordion>
          </ScrollView>
          <Btn label="Got it" onPress={() => setDetails(false)} style={{ marginTop: 12 }} />
        </View>
      </Modal>
    </View>
  );
}

/* ================= checkout ================= */
const PAY_METHODS = [
  ['upi', '📲', 'UPI', 'GPay · PhonePe · Paytm · BHIM'],
  ['card', '💳', 'Card', 'Credit · Debit · RuPay'],
  ['net', '🏦', 'Netbanking', 'All major Indian banks'],
];

function CheckoutScreen({ ctx, order }) {
  const { pop, push, loadAccount } = ctx;
  const [pay, setPay] = useState('upi');
  const [ins, setIns] = useState({ quote: null, on: false });
  const [promo, setPromo] = useState('');
  const [promoMsg, setPromoMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const days = parseInt((order.pkg.split('·')[1] || '7')) || 7;
    fetch(API + '/api/insurance/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: order.country, iso: order.iso, days }),
    }).then(r => r.json()).then(q => q?.premiumINR && setIns({ quote: q, on: false })).catch(() => {});
  }, []);

  const total = order.price + (ins.on && ins.quote ? ins.quote.premiumINR : 0);

  const placeOrder = async () => {
    setBusy(true);
    try {
      const headers = await authHeaders();
      const o = await fetch(API + '/api/orders', {
        method: 'POST', headers,
        body: JSON.stringify({ bundle: order.bundle, country: order.country, package: order.pkg, price: order.price }),
      }).then(r => r.json());
      if (o.error) throw new Error(o.error);
      if (ins.on && ins.quote) {
        fetch(API + '/api/insurance/policy', {
          method: 'POST', headers,
          body: JSON.stringify({ quoteId: ins.quote.quoteId, destination: order.country, premium: ins.quote.premiumINR, days: ins.quote.days }),
        }).catch(() => {});
      }
      loadAccount();
      push('complete', { ...o, order });
    } catch (e) {
      pushToast(e.message || 'Order failed — please try again');
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Checkout" onBack={pop} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: T.ink, fontWeight: '700', fontSize: 15, flex: 1 }}>{order.country} · {order.pkg}</Text>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>₹{order.price}</Text>
          </View>
          {ins.quote && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: T.line }}>
              <Text style={{ fontSize: 20 }}>🛡️</Text>
              <View style={{ flex: 1, marginHorizontal: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: T.ink, fontWeight: '700', fontSize: 13.5 }}>Add trip protection</Text>
                  <Chip txt="Demo" />
                </View>
                <Text style={{ color: T.soft, fontWeight: '600', fontSize: 11.5, marginTop: 2 }}>
                  ₹{ins.quote.premiumINR} · medical {ins.quote.coverage?.medical} + baggage + delays · {ins.quote.days} days
                </Text>
              </View>
              <Toggle on={ins.on} onChange={v => setIns(x => ({ ...x, on: v }))} />
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: T.line }}>
            <TextInput value={promo} onChangeText={t => { setPromo(t); setPromoMsg(null); }} placeholder="Referral / promo code"
              placeholderTextColor="#8B8FA5" style={s.input} />
            <Btn kind="white" small label="Apply" onPress={() => promo.trim() && setPromoMsg(`Code "${promo.trim()}" saved — rewards are credited when payments launch.`)} />
          </View>
          {promoMsg && <Text style={{ color: T.mintInk, fontWeight: '600', fontSize: 12, marginTop: 8 }}>{promoMsg}</Text>}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: T.line }}>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 17 }}>Total</Text>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 17 }}>₹{total}</Text>
          </View>
        </View>

        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 16, marginTop: 22, marginBottom: 10 }}>Pay with</Text>
        {PAY_METHODS.map(([k, icon, label, sub]) => (
          <Pressable key={k} onPress={() => setPay(k)}
            style={[s.card, { marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: pay === k ? T.indigo : 'transparent' }]}>
            <Text style={{ fontSize: 22 }}>{icon}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: T.ink, fontWeight: '700', fontSize: 14.5 }}>{label}</Text>
              <Text style={{ color: T.soft, fontWeight: '600', fontSize: 11.5 }}>{sub}</Text>
            </View>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: pay === k ? 6 : 2, borderColor: pay === k ? T.indigo : '#C5CBDD' }} />
          </Pressable>
        ))}
        <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12, marginTop: 8 }}>
          🔒 Payments launch soon with Razorpay — during beta your order is placed without charge.
        </Text>
        <Btn label={busy ? 'Placing your order…' : `Pay ₹${total}`} onPress={placeOrder} disabled={busy}
          style={{ marginTop: 18 }} left={busy ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} /> : null} />
      </ScrollView>
    </View>
  );
}

/* ================= order complete ================= */
function CompleteScreen({ ctx, result }) {
  const { home, setTab, openInstall } = ctx;
  const esim = result.esim ? { lpa_string: result.esim.lpa || result.esim.lpaString, iccid: result.esim.iccid, orders: { country_name: result.order.country } } : null;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: TOPPAD + 16, paddingBottom: 60 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: T.mint, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 38 }}>✅</Text>
          </View>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 26, marginTop: 14 }}>Shubh yatra! 🎉</Text>
          <Text style={{ color: T.soft, fontWeight: '600', fontSize: 13.5, marginTop: 6, textAlign: 'center' }}>
            Order {result.orderReference || 'confirmed'} · {result.order.country} · {result.order.pkg}
            {result.emailSent ? '\nYour QR was also emailed to you.' : ''}
          </Text>
        </View>

        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 16, marginTop: 26, marginBottom: 10 }}>You've got your eSIM. What next?</Text>
        <Accordion icon="📥" title="When should I install it?">
          Install any time before you fly — at home on WiFi is easiest. Validity only starts when the eSIM first connects at your destination.
        </Accordion>
        <Accordion icon="✈️" title="How do I avoid roaming charges?">
          Before takeoff, turn OFF data roaming on your Indian SIM and keep it on only for the MobiYatri eSIM once you land. Your Indian number keeps receiving OTP SMS for free in most cases.
        </Accordion>
        <Accordion icon="📶" title="Nothing works after landing?">
          Toggle aeroplane mode, make sure data roaming is ON for the travel eSIM, and select the partner network manually if needed. Yatri Sahayak can walk you through it 24/7.
        </Accordion>

        {esim?.lpa_string && <Btn label="📲 Install or share" onPress={() => openInstall(esim)} style={{ marginTop: 20 }} />}
        <Btn kind="white" label="Go to My eSIMs" onPress={() => { home(); setTab('esims'); }} style={{ marginTop: 10 }} />
      </ScrollView>
    </View>
  );
}

/* ================= my esims ================= */
function MyEsimsScreen({ ctx }) {
  const { session, myEsims, push, openAuth, countries } = ctx;
  return (
    <View style={{ flex: 1, paddingTop: TOPPAD }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontSize: 26, fontWeight: '800', color: T.ink }}>My eSIMs</Text>
        <YatriCashChip />
      </View>
      {!session ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <Text style={{ fontSize: 44 }}>🧳</Text>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 19, marginTop: 10 }}>Sign in to see your eSIMs</Text>
          <Text style={{ color: T.soft, fontWeight: '500', textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
            Your purchases are saved to your account and available on any device.
          </Text>
          <Btn label="Log in / Sign up" onPress={openAuth} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
          <Pressable onPress={() => push('refer')} style={[s.card, { flexDirection: 'row', alignItems: 'center', marginBottom: 14 }]}>
            <Text style={{ fontSize: 20 }}>🪙</Text>
            <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 13.5, marginHorizontal: 10 }}>
              Get ₹150 YatriCash for each friend's first trip
            </Text>
            <Text style={{ color: T.ink, fontWeight: '800' }}>›</Text>
          </Pressable>
          {myEsims === null && <ActivityIndicator color={T.indigo} style={{ marginTop: 30 }} />}
          {myEsims && myEsims.length === 0 && (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 34 }]}>
              <Text style={{ fontSize: 36 }}>✈️</Text>
              <Text style={{ color: T.ink, fontWeight: '800', fontSize: 17, marginTop: 8 }}>No eSIMs yet</Text>
              <Text style={{ color: T.soft, fontWeight: '500', marginTop: 4, marginBottom: 14 }}>Your next trip starts here.</Text>
              <Btn small label="Browse destinations" onPress={() => ctx.setTab('store')} />
            </View>
          )}
          {(myEsims || []).map((e, i) => {
            const o = e.orders || {};
            const c = countries.find(x => x.n === o.country_name);
            const parts = (o.package_label || '— · —').split(' · ');
            return (
              <View key={e.iccid + i} style={[s.card, { marginBottom: 14 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {c?.iso && <Image source={{ uri: flagUrl(c.iso) }} style={{ width: 40, height: 28, borderRadius: 5 }} />}
                  <Text style={{ flex: 1, color: T.ink, fontWeight: '800', fontSize: 17, marginLeft: 10 }}>{o.country_name || 'eSIM'}</Text>
                  <Chip txt={e.status || 'ready'} bg={e.status === 'active' ? T.mint : T.goldBg} fg={e.status === 'active' ? T.mintInk : T.goldInk} />
                </View>
                <Text style={{ color: T.soft, fontWeight: '700', fontSize: 11.5, marginTop: 10, marginBottom: 6 }}>PACKAGE</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <StatTile k="⇅ Data" v={parts[0] || '—'} />
                  <StatTile k="📅 Validity" v={parts[1] || '—'} />
                  <StatTile k="₹ Paid" v={'₹' + (o.price_inr ?? '—')} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Btn kind="white" small label="View details" onPress={() => push('esimdetail', e)} style={{ flex: 1 }} />
                  {e.lpa_string && <Btn small label="Install or share" onPress={() => ctx.openInstall(e)} style={{ flex: 1 }} />}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/* ================= esim detail ================= */
function EsimDetailScreen({ ctx, e }) {
  const { pop, openInstall, openChat } = ctx;
  const o = e.orders || {};
  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title={o.country_name || 'eSIM'} onBack={pop} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={s.card}>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15, marginBottom: 8 }}>Ready to use your eSIM?</Text>
          <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13, lineHeight: 19 }}>
            📲 Installation takes a few minutes — you only need to do this once.
          </Text>
          {e.lpa_string && <Btn small label="Install or share" onPress={() => openInstall(e)} style={{ marginTop: 12 }} />}
        </View>

        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15, marginTop: 20, marginBottom: 8 }}>Package info</Text>
        <View style={s.card}>
          {[['Package', o.package_label], ['Price', o.price_inr ? '₹' + o.price_inr : null], ['Purchased', e.created_at ? fmtDate(e.created_at) : null],
            ['Status', e.status], ['ICCID', e.iccid], ['SM-DP+', e.smdp_address], ['Matching ID', e.matching_id]]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <Pressable key={k} onLongPress={() => Share.share({ message: String(v) })} style={{ flexDirection: 'row', paddingVertical: 6 }}>
                <Text style={{ width: 110, color: T.soft, fontWeight: '700', fontSize: 12.5 }}>{k}</Text>
                <Text style={{ flex: 1, color: T.ink, fontWeight: '600', fontSize: 12.5 }} numberOfLines={1}>{String(v)}</Text>
              </Pressable>
            ))}
          <Text style={{ color: T.soft, fontSize: 11, fontWeight: '500', marginTop: 6 }}>Long-press a row to share/copy its value.</Text>
        </View>

        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15, marginTop: 20, marginBottom: 8 }}>Troubleshooting & FAQs</Text>
        <Accordion icon="⏱️" title="When should I install my eSIM?">
          Any time before you fly — WiFi at home is easiest. Validity starts only when it first connects at your destination.
        </Accordion>
        <Accordion icon="🔍" title="Where can I see that it's installed?">
          iPhone: Settings → Mobile Data — you'll see a second plan listed. Android: Settings → Connections / Network → SIM manager.
        </Accordion>
        <Accordion icon="📶" title="Why is my eSIM not working?">
          Check data roaming is ON for this eSIM (and OFF for your Indian SIM), toggle aeroplane mode, or select the partner network manually. Still stuck? Ask Yatri Sahayak below.
        </Accordion>
        <Btn kind="white" label="💬 Ask Yatri Sahayak" onPress={openChat} style={{ marginTop: 14 }} />
      </ScrollView>
    </View>
  );
}

/* ================= install modal ================= */
function InstallModal({ esim, close }) {
  const [tab, setTab] = useState(Platform.OS === 'ios' ? 'ios' : 'android');
  const [done, setDone] = useState(false);
  if (!esim) return null;
  const lpa = esim.lpa_string;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={s.sheetBack} onPress={close} />
      <View style={s.sheet}>
        {done ? (
          <View style={{ alignItems: 'center', paddingVertical: 10 }}>
            <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: T.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 34 }}>✓</Text>
            </View>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 20, marginTop: 12 }}>Your eSIM is on its way in</Text>
            <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              💡 You can connect once you're in the eSIM's coverage area — switch on its data roaming when you land.
            </Text>
            <Btn label="OK, got it" onPress={close} style={{ marginTop: 18, alignSelf: 'stretch' }} />
          </View>
        ) : (
          <>
            <Text style={s.sheetTitle}>Install {esim.orders?.country_name} eSIM</Text>
            <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5, textAlign: 'center', marginBottom: 12 }}>
              One code installs on one device, once.
            </Text>
            <Image source={{ uri: qrUrl(lpa, 190) }} style={{ width: 170, height: 170, alignSelf: 'center', borderRadius: 12, backgroundColor: '#fff' }} />
            <View style={{ flexDirection: 'row', backgroundColor: T.bgDeep, borderRadius: 999, padding: 4, marginVertical: 14 }}>
              {[['ios', ' iPhone'], ['android', '🤖 Android']].map(([k, label]) => (
                <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999, backgroundColor: tab === k ? T.indigo : 'transparent' }}>
                  <Text style={{ fontWeight: '800', fontSize: 13, color: tab === k ? '#fff' : T.ink }}>{label}</Text>
                </Pressable>
              ))}
            </View>
            {tab === 'ios' ? (
              <>
                <Btn label="📱 One-tap install (iOS 17.4+)" onPress={() => { Linking.openURL(ONE_TAP(lpa)); setDone(true); }} />
                <Text style={s.installNote}>Older iOS: Settings → Mobile Data → Add eSIM → scan the QR from another screen.</Text>
              </>
            ) : (
              <>
                <Btn label="Share / copy activation code" onPress={() => { Share.share({ message: lpa }); setDone(true); }} />
                <Text style={s.installNote}>Settings → Connections / Network → SIM manager → Add eSIM → scan the QR or paste the code.</Text>
              </>
            )}
            <Btn kind="white" label="Close" onPress={close} style={{ marginTop: 8 }} />
          </>
        )}
      </View>
    </Modal>
  );
}

/* ================= profile ================= */
function ProfileScreen({ ctx }) {
  const { session, push, openAuth, openChat, logout, orders } = ctx;
  if (!session) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <Text style={{ fontSize: 44 }}>👤</Text>
      <Text style={{ color: T.ink, fontWeight: '800', fontSize: 19, marginTop: 10 }}>Your MobiYatri account</Text>
      <Text style={{ color: T.soft, fontWeight: '500', textAlign: 'center', marginTop: 6, marginBottom: 18 }}>
        Log in to see your orders, eSIMs and referral rewards.
      </Text>
      <Btn label="Log in / Sign up" onPress={openAuth} />
    </View>
  );
  const name = session.user.user_metadata?.full_name || firstName(session);
  const MENU = [
    ['👤', 'Account information', () => push('account')],
    ['🧾', `Orders${orders ? ` (${orders.length})` : ''}`, () => push('orders')],
    ['🎁', 'Refer and earn ₹150', () => push('refer')],
    ['🔔', 'Notification preferences', () => push('notify')],
    ['💳', 'Saved cards', () => pushToast('Card saving arrives with the payments launch')],
    ['🛡️', 'Travel insurance', () => pushToast('Add insurance during checkout — IRDAI-licensed partners')],
    ['📱', 'Check phone compatibility', ctx.openCompat],
    ['💬', 'Help — Yatri Sahayak', openChat],
  ];
  return (
    <View style={{ flex: 1, paddingTop: TOPPAD }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontSize: 26, fontWeight: '800', color: T.ink }}>Profile</Text>
        <YatriCashChip />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View style={[s.card, { flexDirection: 'row', alignItems: 'center', marginBottom: 14 }]}>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: T.coral, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{(name[0] || 'Y').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 17 }}>{name}</Text>
            <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5 }}>Yatri · member since {new Date(session.user.created_at).getFullYear()}</Text>
          </View>
        </View>
        <View style={s.card}>
          {MENU.map(([icon, label, fn], i) => (
            <Pressable key={label} onPress={fn} style={{
              flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
              borderBottomWidth: i < MENU.length - 1 ? 1 : 0, borderBottomColor: T.line,
            }}>
              <Text style={{ fontSize: 17, width: 30 }}>{icon}</Text>
              <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 14.5 }}>{label}</Text>
              <Text style={{ color: T.soft, fontWeight: '800' }}>›</Text>
            </Pressable>
          ))}
        </View>
        <Btn kind="white" label="Log out" onPress={logout} style={{ marginTop: 16 }} />
        <Text style={{ color: T.soft, fontWeight: '600', fontSize: 11.5, textAlign: 'center', marginTop: 14 }}>
          MobiYatri v1.1 · made in India with ❤️ · शुभ यात्रा
        </Text>
      </ScrollView>
    </View>
  );
}

function AccountScreen({ ctx }) {
  const { pop, session } = ctx;
  const [name, setName] = useState(session?.user?.user_metadata?.full_name || '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const saveName = async () => {
    setBusy(true);
    const { error } = await sb.auth.updateUser({ data: { full_name: name.trim() } });
    setBusy(false);
    pushToast(error ? 'Could not save — try again' : 'Name updated');
  };
  const savePw = async () => {
    if (pw.length < 8) return pushToast('Password must be 8+ characters');
    if (pw !== pw2) return pushToast('Passwords do not match');
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) pushToast(error.message); else { setPw(''); setPw2(''); pushToast('Password changed'); }
  };
  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Account information" onBack={pop} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.label}>Full name</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={name} onChangeText={setName} style={[s.input, { flex: 1 }]} />
          <Btn small label="Save" onPress={saveName} disabled={busy} />
        </View>
        <Text style={s.label}>Email</Text>
        <TextInput value={session?.user?.email || ''} editable={false} style={[s.input, { opacity: .6 }]} />
        <Text style={{ color: T.soft, fontWeight: '500', fontSize: 12, marginTop: 6 }}>
          Email changes need re-verification — contact hello@mobiyatri.in.
        </Text>
        <Text style={s.label}>Change password</Text>
        <TextInput value={pw} onChangeText={setPw} secureTextEntry placeholder="New password (8+ characters)"
          placeholderTextColor="#8B8FA5" style={s.input} />
        <TextInput value={pw2} onChangeText={setPw2} secureTextEntry placeholder="Repeat new password"
          placeholderTextColor="#8B8FA5" style={[s.input, { marginTop: 8 }]} />
        <Btn kind="white" small label="Update password" onPress={savePw} disabled={busy} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      </ScrollView>
    </View>
  );
}

function OrdersScreen({ ctx }) {
  const { pop, orders } = ctx;
  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Orders" onBack={pop} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {orders === null && <ActivityIndicator color={T.indigo} />}
        {orders && orders.length === 0 && <Text style={{ color: T.soft, fontWeight: '600' }}>No orders yet.</Text>}
        {(orders || []).map((o, i) => (
          <View key={i} style={[s.card, { marginBottom: 10, flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: T.ink, fontWeight: '700', fontSize: 14.5 }}>{o.country_name} <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5 }}>· {o.package_label}</Text></Text>
              <Text style={{ color: T.soft, fontWeight: '600', fontSize: 11.5, marginTop: 3 }}>{o.order_reference || ''} · {fmtDate(o.created_at)}</Text>
            </View>
            <Chip txt="Delivered" bg={T.mint} fg={T.mintInk} />
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15, marginLeft: 10 }}>₹{o.price_inr}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ReferScreen({ ctx }) {
  const { pop, refCode } = ctx;
  const msg = `Use my code ${refCode} for a discount on your first MobiYatri travel eSIM — mobiyatri.in`;
  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Refer and earn" onBack={pop} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={[s.card, { alignItems: 'center', paddingVertical: 26 }]}>
          <Text style={{ fontSize: 40 }}>🎁</Text>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 20, marginTop: 8, textAlign: 'center' }}>Refer friends. Earn ₹150.</Text>
          <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
            ₹150 YatriCash for every friend who takes their first trip — they get a discount too.
          </Text>
          <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: T.indigo, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 26, marginTop: 16 }}>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 18, letterSpacing: 2 }}>{refCode || '· · · · · ·'}</Text>
          </View>
          {refCode && <Btn label="Share invite" onPress={() => Share.share({ message: msg })} style={{ marginTop: 14, alignSelf: 'stretch' }} />}
        </View>
        {[['1', 'Share your code', 'Send it to friends planning a trip.'],
          ['2', 'They buy their first eSIM', 'They get a first-trip discount.'],
          ['3', 'You earn ₹150', 'Credited as YatriCash after their order.']].map(([n, t, d]) => (
            <View key={n} style={[s.card, { marginTop: 10, flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: T.indigo, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{n}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: T.ink, fontWeight: '700', fontSize: 14 }}>{t}</Text>
                <Text style={{ color: T.soft, fontWeight: '500', fontSize: 12.5 }}>{d}</Text>
              </View>
            </View>
          ))}
        <Text style={{ color: T.soft, fontWeight: '500', fontSize: 11.5, marginTop: 12, textAlign: 'center' }}>
          Rewards are credited as YatriCash after your friend's first completed order.
        </Text>
      </ScrollView>
    </View>
  );
}

function NotifyScreen({ ctx }) {
  const { pop, session } = ctx;
  const [prefs, setPrefs] = useState({ trips: true, offers: true, ...(session?.user?.user_metadata?.notify_prefs || {}) });
  const save = async next => {
    setPrefs(next);
    await sb.auth.updateUser({ data: { notify_prefs: next } });
    pushToast('Preferences saved');
  };
  const ROWS = [
    ['orders', 'Order & delivery updates', 'QR delivery, install reminders. Always on.', true, true],
    ['trips', 'Trip reminders', 'A nudge to install before your flight.', prefs.trips, false],
    ['offers', 'Offers & new destinations', 'Fare-drop alerts and launches. No spam.', prefs.offers, false],
  ];
  return (
    <View style={{ flex: 1 }}>
      <ScreenHead title="Notification preferences" onBack={pop} />
      <View style={{ padding: 20 }}>
        {ROWS.map(([k, t, d, on, locked]) => (
          <View key={k} style={[s.card, { marginBottom: 10, flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: T.ink, fontWeight: '700', fontSize: 14 }}>{t}</Text>
              <Text style={{ color: T.soft, fontWeight: '500', fontSize: 12 }}>{d}</Text>
            </View>
            <Toggle on={on} onChange={v => !locked && save({ ...prefs, [k]: v })} />
          </View>
        ))}
      </View>
    </View>
  );
}

/* ================= auth modal ================= */
function AuthModal({ open, close }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      if (tab === 'signup') {
        const { error } = await sb.auth.signUp({ email, password: pass, options: { data: { full_name: name } } });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
      close(); pushToast('नमस्ते! You are signed in');
    } catch (e) { setErr(e.message || 'Something went wrong'); }
    finally { setBusy(false); }
  };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={s.sheetBack} onPress={close} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.sheet}>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: 'rgba(22,24,42,.15)', marginBottom: 18 }}>
            {[['login', 'Log in'], ['signup', 'Sign up']].map(([k, label]) => (
              <Pressable key={k} onPress={() => { setTab(k); setErr(''); }} style={{ flex: 1, alignItems: 'center', paddingBottom: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 17, color: T.ink, opacity: tab === k ? 1 : .5 }}>{label}</Text>
                {tab === k && <View style={{ position: 'absolute', bottom: -1.5, left: 30, right: 30, height: 3, backgroundColor: T.ink, borderRadius: 2 }} />}
              </Pressable>
            ))}
          </View>
          {tab === 'signup' && <TextInput value={name} onChangeText={setName} placeholder="Full name"
            placeholderTextColor="#8B8FA5" style={[s.input, { marginBottom: 10 }]} />}
          <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address"
            placeholderTextColor="#8B8FA5" style={[s.input, { marginBottom: 10 }]} />
          <TextInput value={pass} onChangeText={setPass} placeholder="Password" secureTextEntry
            placeholderTextColor="#8B8FA5" style={s.input} />
          {err ? <Text style={{ color: T.coralDeep, fontWeight: '600', fontSize: 12.5, marginTop: 10 }}>{err}</Text> : null}
          <Btn label={busy ? 'Please wait…' : tab === 'login' ? 'Log in' : 'Create account'} onPress={submit} disabled={busy} style={{ marginTop: 16 }} />
          <Text style={{ color: T.soft, fontWeight: '500', fontSize: 11.5, textAlign: 'center', marginTop: 12 }}>
            By continuing you agree to our Terms and Privacy Policy (mobiyatri.in).
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ================= compatibility modal ================= */
function CompatModal({ open, close }) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={s.sheetBack} onPress={close} />
      <View style={s.sheet}>
        <Text style={s.sheetTitle}>Is my phone eSIM-ready?</Text>
        <View style={[s.card, { backgroundColor: T.bg, marginTop: 4 }]}>
          <Text style={{ color: T.ink, fontWeight: '700', fontSize: 14.5 }}>The 10-second check</Text>
          <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, lineHeight: 20, marginTop: 6 }}>
            Open your dialler and dial <Text style={{ color: T.coralDeep, fontWeight: '800' }}>*#06#</Text>{'\n'}
            → If you see an EID number, your phone supports eSIM.{'\n'}
            → Also make sure the phone is network-unlocked.
          </Text>
        </View>
        <Accordion icon="🍎" title="iPhone">
          iPhone XS and newer support eSIM. iOS 17.4+ can install straight from our one-tap link.
        </Accordion>
        <Accordion icon="🤖" title="Android">
          Most Samsung Galaxy S20+, Pixel 3+ and recent OnePlus/Nothing flagships support eSIM. Indian variants sometimes differ — the *#06# check is the truth.
        </Accordion>
        <Btn label="Got it" onPress={close} style={{ marginTop: 12 }} />
      </View>
    </Modal>
  );
}

/* ================= chat (Yatri Sahayak) ================= */
const GREETING = { role: 'assistant', content: 'नमस्ते! I\'m Yatri Sahayak — ask me anything about eSIMs, installation, or your orders. English या हिन्दी!' };

function ChatModal({ open, close, session }) {
  const [msgs, setMsgs] = useState([GREETING]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: 'user', content: t }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      const headers = await authHeaders();
      const d = await fetch(API + '/api/assistant', {
        method: 'POST', headers,
        body: JSON.stringify({ messages: next.filter(m => m !== GREETING).slice(-12), context: { app: 'native', platform: Platform.OS } }),
      }).then(r => r.json());
      setMsgs(m => [...m, { role: 'assistant', content: d.reply || d.error || 'Sorry — try again in a moment.' }]);
    } catch { setMsgs(m => [...m, { role: 'assistant', content: 'I seem to be offline — please try again.' }]); }
    finally { setBusy(false); }
  };
  useEffect(() => { setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80); }, [msgs, open]);
  return (
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: T.bg }}>
        <View style={{ backgroundColor: T.indigo, paddingTop: TOPPAD, paddingBottom: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16.5 }}>Yatri Sahayak</Text>
            <Text style={{ color: '#B9BDDD', fontWeight: '600', fontSize: 11.5 }}>AI travel-data expert · 24/7 · English + हिन्दी</Text>
          </View>
          <Pressable onPress={close}><Text style={{ color: '#fff', fontSize: 20 }}>✕</Text></Pressable>
        </View>
        <ScrollView ref={listRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {msgs.map((m, i) => (
            <View key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%',
              backgroundColor: m.role === 'user' ? T.indigo : '#fff', borderRadius: 16,
              paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8,
            }}>
              <Text style={{ color: m.role === 'user' ? '#fff' : T.ink, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>{m.content}</Text>
            </View>
          ))}
          {busy && <Text style={{ color: T.soft, fontWeight: '700', fontSize: 12.5, padding: 6 }}>typing…</Text>}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff' }}>
          <TextInput value={text} onChangeText={setText} placeholder="Ask about eSIMs, plans, installation…"
            placeholderTextColor="#8B8FA5" onSubmitEditing={send}
            style={{ flex: 1, borderWidth: 1.5, borderColor: T.line, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: T.ink }} />
          <Btn small label="Send" onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ================= chrome ================= */
function ScreenHead({ title, onBack }) {
  return (
    <View style={{ paddingTop: TOPPAD, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg }}>
      <Pressable onPress={onBack} style={{ padding: 6, marginRight: 6 }}>
        <Text style={{ color: T.ink, fontSize: 20, fontWeight: '800' }}>‹</Text>
      </Pressable>
      <Text style={{ color: T.ink, fontWeight: '800', fontSize: 18, flex: 1 }} numberOfLines={1}>{title}</Text>
    </View>
  );
}

function YatriCashChip() {
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={{ color: T.soft, fontSize: 11, fontWeight: '700' }}>YatriCash</Text>
      <View style={{ backgroundColor: T.mint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 2 }}>
        <Text style={{ color: T.mintInk, fontWeight: '800', fontSize: 13 }}>₹0</Text>
      </View>
    </View>
  );
}

function TabBar({ tab, setTab }) {
  const TABS = [['store', '🛍️', 'Store'], ['esims', '📶', 'My eSIMs'], ['profile', '👤', 'Profile']];
  return (
    <View style={s.tabBar}>
      {TABS.map(([k, icon, label]) => (
        <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
          <Text style={{ fontSize: 20, opacity: tab === k ? 1 : .45 }}>{icon}</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: T.ink, opacity: tab === k ? 1 : .45, marginTop: 2 }}>{label}</Text>
          {tab === k && <View style={{ width: 22, height: 3, borderRadius: 2, backgroundColor: T.coral, marginTop: 3 }} />}
        </Pressable>
      ))}
    </View>
  );
}

function ChatFab({ onPress }) {
  return (
    <Pressable onPress={onPress} style={s.fab}>
      <Text style={{ fontSize: 22 }}>💬</Text>
    </Pressable>
  );
}

/* ================= styles ================= */
const s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, paddingVertical: 15, paddingHorizontal: 26,
  },
  btnCoral: { backgroundColor: T.coral },
  btnWhite: { backgroundColor: '#fff' },
  btnOutline: { borderWidth: 2, borderColor: T.ink },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 15.5 },
  card: { backgroundColor: T.card, borderRadius: 16, padding: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 9,
  },
  flag: { width: 42, height: 30, borderRadius: 6 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 999, paddingVertical: 14, paddingHorizontal: 18,
  },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D6DDEB', borderRadius: 13,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14.5, color: T.ink, fontWeight: '500',
  },
  label: { color: T.soft, fontWeight: '700', fontSize: 12.5, marginTop: 16, marginBottom: 6 },
  buyBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 12,
    shadowColor: '#000', shadowOpacity: .12, shadowRadius: 14, shadowOffset: { width: 0, height: -4 },
  },
  tabBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff',
    flexDirection: 'row', paddingBottom: Platform.OS === 'ios' ? 20 : 6,
    borderTopWidth: 1, borderTopColor: T.line,
  },
  fab: {
    position: 'absolute', right: 18, bottom: 96, width: 54, height: 54, borderRadius: 27,
    backgroundColor: T.coral, alignItems: 'center', justifyContent: 'center', elevation: 8,
    shadowColor: T.coralDeep, shadowOpacity: .4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
  },
  sheetBack: { flex: 1, backgroundColor: 'rgba(22,24,42,.45)' },
  sheet: {
    backgroundColor: T.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 22, paddingBottom: Platform.OS === 'ios' ? 34 : 22,
  },
  sheetTitle: { color: T.ink, fontWeight: '800', fontSize: 19, textAlign: 'center', marginBottom: 10 },
  accWrap: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 8, overflow: 'hidden' },
  accHead: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  installNote: { color: T.soft, fontWeight: '500', fontSize: 12.5, lineHeight: 18, marginTop: 10, marginBottom: 4 },
});
