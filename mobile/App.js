// MobiYatri — native app (Expo / React Native, SDK 57)
// Same backend + Supabase as the web app. Dev API points at the desktop server on LAN;
// switch API to the deployed URL (e.g. https://mobiyatri.onrender.com) for production builds.
import 'react-native-url-polyfill/auto';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, FlatList, Image, KeyboardAvoidingView, Linking, Modal,
  Platform, Pressable, ScrollView, Share, StatusBar, StyleSheet, Text as RNText, TextInput as RNTextInput, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import { useFonts, Alexandria_700Bold, Alexandria_800ExtraBold } from '@expo-google-fonts/alexandria';
import * as Notifications from 'expo-notifications';

/* Trip reminders — scheduled locally on the device, no push service needed.
   Fires: install nudge the evening before, roaming nudge on travel morning. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
});
async function scheduleTripReminders(country, daysFromNow) {
  if (Platform.OS === 'web') return { ok: false, reason: 'web' };
  const perm = await Notifications.getPermissionsAsync();
  let granted = perm.granted;
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return { ok: false, reason: 'denied' };
  const now = Date.now();
  const departure = new Date(now + daysFromNow * 86400000);
  const at = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
  const jobs = [
    { when: at(new Date(departure.getTime() - 86400000), 19, 0), title: 'Install your eSIM tonight ✈️',
      body: `You fly to ${country} tomorrow. Install now on WiFi — it only activates when you land.` },
    { when: at(departure, 7, 30), title: `Landing in ${country} today 🌏`,
      body: 'On arrival: switch data roaming ON for your MobiYatri eSIM, and OFF for your Indian SIM.' },
  ].filter(j => j.when.getTime() > now + 60000);
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const j of jobs) {
    await Notifications.scheduleNotificationAsync({
      content: { title: j.title, body: j.body },
      trigger: { type: 'date', date: j.when },
    });
  }
  return { ok: true, count: jobs.length, first: jobs[0]?.when };
}

WebBrowser.maybeCompleteAuthSession();

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
const ConfettiBG = () => {
  const dots = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    dots.push([308 + c * 14, 500 + r * 14], [22 + c * 14, 96 + r * 14]);
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 375 812" preserveAspectRatio="xMidYMid slice">
        {/* concentric outline rings, top-right */}
        <Circle cx="342" cy="76" r="96" stroke="#DCD1BF" strokeWidth="1.5" fill="none" />
        <Circle cx="342" cy="76" r="64" stroke="#DCD1BF" strokeWidth="1.5" fill="none" opacity=".7" />
        <Circle cx="342" cy="76" r="34" stroke="#F0B5A6" strokeWidth="1.5" fill="none" opacity=".8" />
        {/* ring cluster, bottom-left */}
        <Circle cx="18" cy="726" r="104" stroke="#DCD1BF" strokeWidth="1.5" fill="none" />
        <Circle cx="18" cy="726" r="70" stroke="#F0B5A6" strokeWidth="1.5" fill="none" opacity=".7" />
        {/* thin arcs */}
        <Path d="M-20 330q90-30 96-140" stroke="#E4DACA" strokeWidth="1.6" fill="none" />
        <Path d="M395 470q-100 24-110 150" stroke="#E8D9C4" strokeWidth="1.6" fill="none" />
        {/* diagonal rounded dashes, mid-right and mid-left */}
        <G stroke="#DCD1BF" strokeWidth="5" strokeLinecap="round" opacity=".65">
          <Path d="M336 300l22-22M352 316l22-22" />
          <Path d="M10 470l20-20M-4 452l20-20" />
        </G>
        {/* fine dot grids */}
        {dots.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r="1.7" fill="#C4B8A4" opacity=".55" />)}
        {/* single coral accent ring */}
        <Circle cx="196" cy="788" r="8" stroke="#FF6B57" strokeWidth="2" fill="none" opacity=".55" />
      </Svg>
    </View>
  );
};

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
        <Path d="M112 44q26-14 44 2-8 20-30 18-22-2-14-20z" fill="#DCD1BF" />
        <Path d="M186 96q22-6 32 10-6 22-28 20-18-4-4-30z" fill="#DCD1BF" />
        <Path d="M128 130q18-8 30 4-4 18-22 16-16-2-8-20z" fill="#DCD1BF" />
        <Rect x="198" y="116" width="46" height="80" rx="12" fill="#E9E0D0" />
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
    <Path d="M55 82q18-10 30 4-4 16-22 14-14-4-8-18z" fill="#DCD1BF" />
    <Path d="M150 102q16-8 28 2-2 14-18 14-14-2-10-16z" fill="#DCD1BF" />
    <Path d="M100 122q12-6 20 2-2 10-14 10-10-2-6-12z" fill="#DCD1BF" />
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
// Dev (Expo Go): desktop server on LAN. Production builds automatically use the live URL.
const API = __DEV__ ? 'http://192.168.1.122:4000' : 'https://mobiyatri.onrender.com';
const SUPABASE_URL = 'https://acvjjepiyoxzwleggqvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjdmpqZXBpeW94endsZWdncXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2MjE3NDIsImV4cCI6MjEwMTE5Nzc0Mn0.wBsCo6aX1arPpKR8Z9Qqj4Ful_VAsKex1903qmz1xcg';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
});

/* native Google sign-in via Supabase OAuth + in-app browser (PKCE) */
async function googleSignIn() {
  const redirectTo = ExpoLinking.createURL('');
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success' || !res.url) throw new Error('Sign-in was cancelled');
  const code = new URL(res.url).searchParams.get('code');
  if (!code) throw new Error('No auth code returned — check Supabase redirect URLs');
  const { error: exErr } = await sb.auth.exchangeCodeForSession(code);
  if (exErr) throw exErr;
}

/* ---------------- theme ---------------- */
const T = {
  bg: '#F7F2E9',        // warm ivory base
  bgTop: '#EFE7D9',     // deeper ivory band
  bgDeep: '#EFE7D9',
  card: '#FFFFFF',
  ink: '#16182A',       // near-black
  soft: '#6A6478',      // warm grey text
  line: '#E9E0D0',      // warm hairline
  coral: '#FF6B57', coralDeep: '#E85340',
  indigo: '#33386E', indigoDark: '#20234A', night: '#151834',
  mint: '#DCEDDC', mintInk: '#1F5B33',
  tint: '#EDE4F2',
  powder: '#A5C8D8', sage: '#8FC09B', peach: '#F3C08F', gold: '#F4B63F',
};
const TOPPAD = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 54;

/* Type pairing (same as the website): Alexandria for display headings, Satoshi for body/UI.
   Headings = bold weights at 17px+; everything else gets Satoshi for readability. */
const SATOSHI = { '400': 'Satoshi-Regular', '500': 'Satoshi-Medium', '600': 'Satoshi-Medium', '700': 'Satoshi-Bold', '800': 'Satoshi-Black', '900': 'Satoshi-Black', normal: 'Satoshi-Regular', bold: 'Satoshi-Bold' };
const ALEXANDRIA = { '700': 'Alexandria_700Bold', '800': 'Alexandria_800ExtraBold', '900': 'Alexandria_800ExtraBold' };
const brandFont = style => {
  const st = StyleSheet.flatten(style) || {};
  const w = String(st.fontWeight ?? '400');
  const size = st.fontSize ?? 14;
  const isDisplay = size >= 17 && (w === '700' || w === '800' || w === '900' || w === 'bold');
  return { fontFamily: (isDisplay ? ALEXANDRIA[w === 'bold' ? '700' : w] : SATOSHI[w]) || 'Satoshi-Regular' };
};
const Text = ({ style, ...p }) => <RNText {...p} style={[brandFont(style), style]} />;
const TextInput = ({ style, ...p }) => <RNTextInput {...p} style={[brandFont(style), style]} />;

/* ---------------- fallback data (until catalogue loads) ---------------- */
const FALLBACK = [
  { iso: 'th', n: 'Thailand', op: 'AIS', from: 329, pop: 1 },
  { iso: 'ae', n: 'UAE (Dubai)', op: 'Etisalat', from: 399, pop: 1 },
  { iso: 'sg', n: 'Singapore', op: 'StarHub', from: 349, pop: 1 },
  { iso: 'id', n: 'Indonesia (Bali)', op: 'Telkomsel', from: 379, pop: 1 },
];

const flagUrl = iso => `https://flagcdn.com/w160/${iso}.png`;

/* Share on native; fall back to clipboard on web (navigator.share is absent on desktop browsers) */
async function shareOrCopy(message, okMsg) {
  try {
    const res = await Share.share({ message });
    if (Platform.OS !== 'web' || (res && res.action !== 'dismissedAction')) return true;
  } catch (e) { /* fall through to clipboard */ }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(message);
      Alert.alert('Copied', okMsg || 'Copied to your clipboard.');
      return true;
    }
  } catch (e) { /* fall through */ }
  Alert.alert('Copy this', message);
  return false;
}

/* ================= root ================= */
export default function App() {
  const [fontsLoaded] = useFonts({
    Alexandria_700Bold, Alexandria_800ExtraBold,
    'Satoshi-Regular': require('./assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Medium': require('./assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Bold': require('./assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-Black': require('./assets/fonts/Satoshi-Black.ttf'),
  });
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
      const total = pkg.price + (insOn && insQuote ? insQuote.premiumINR : 0);
      const payload = { bundle: pkg.bundle, country: sel.n, package: pkg.label + ' · ' + pkg.days, price: pkg.price };

      // Razorpay: pay first, provision after the signature is verified server-side
      const cfg = await fetch(API + '/api/payments/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: total, country: sel.n, package: payload.package }),
      }).then(r => r.json()).catch(() => ({ configured: false }));
      if (cfg.configured && cfg.checkoutUrl) {
        const returnUrl = API + '/api/payments/return';
        const res = await WebBrowser.openAuthSessionAsync(API + cfg.checkoutUrl, returnUrl);
        if (res.type !== 'success' || !res.url) { setPaying(false); return; }   // user cancelled
        const q = Object.fromEntries(new URL(res.url).searchParams);
        if (q.cancelled || !q.razorpay_payment_id) { setPaying(false); return; }
        payload.razorpay_order_id = q.razorpay_order_id;
        payload.razorpay_payment_id = q.razorpay_payment_id;
        payload.razorpay_signature = q.razorpay_signature;
      }

      const o = await fetch(API + '/api/orders', {
        method: 'POST', headers, body: JSON.stringify(payload),
      }).then(r => r.json());
      if (o.error) throw new Error(o.error === 'payment required' ? 'Payment could not be verified — you have not been charged.' : o.error);
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
        <Profile session={session} countries={countries} onAuth={() => setAuthOpen(true)}
          onLogout={async () => {
            await sb.auth.signOut();
            setMyEsims([]); setOrder(null); setSel(null); setPkg(null);
            setTab('store'); setScreen('welcome');   // back to the initial screen
          }}
          onChat={() => setChatOpen(true)} />
      )}
      {screen === 'country' && sel && (
        <Country c={sel} pkg={pkg} setPkg={setPkg} session={session} onAuth={() => setAuthOpen(true)} onBack={() => setScreen('main')} onBuy={buyNow} />
      )}
      {screen === 'checkout' && (
        <Checkout price={pkg ? pkg.price : 0} insQuote={insQuote} insOn={insOn} setInsOn={setInsOn}
          onBack={() => setScreen('country')} onPay={payNow} paying={paying} />
      )}
      {screen === 'ordercomplete' && (
        <OrderComplete order={order} policy={policy} country={sel ? sel.n : ''} iso={sel ? sel.iso : null} session={session}
          onDone={() => { setScreen('main'); setTab('esims'); }}
          onInstall={() => { setInstallEsim({ lpa_string: order && order.esim && order.esim.lpa, iccid: order && order.esim && order.esim.iccid }); setInstallOpen(true); }} />
      )}

      {screen === 'main' && (
        <View style={s.tabbar}>
          {[['store', 'Store'], ['esims', 'My eSIMs'], ['profile', 'Profile']].map(([k, label]) => (
            <Pressable key={k} style={s.tabbtn} onPress={() => setTab(k)}>
              <TabIcon name={k} active={tab === k} />
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
/* splash art: vehicles riding around the globe — slowly orbits (original) */
function GlobeRideScene({ width = 230 }) {
  const orbit = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 26000, useNativeDriver: true })).start();
  }, []);
  return (
    <Animated.View style={{
      width, height: width,
      transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
    }}>
      <Svg width={width} height={width} viewBox="0 0 240 240">
        {/* globe */}
        <Circle cx="120" cy="120" r="76" fill="#E3B93C" />
        <Path d="M70 84q34-22 74-14 22 4 30 18-16 12-44 10l-12 12-20-4-8 10-16-6z" fill="#F7F2E9" />
        <Path d="M84 132q16-8 26 2l-4 26-14 8-10-16z" fill="#F7F2E9" />
        <Path d="M150 158q14-6 24 2l-8 14-16-2z" fill="#F7F2E9" />
        <Path d="M56 118q10-4 16 2l-6 12-12-2z" fill="#F7F2E9" />
        {/* bike — top */}
        <G transform="translate(120 32)">
          <Circle cx="-24" cy="0" r="11" stroke="#16182A" strokeWidth="3" fill="none" />
          <Circle cx="18" cy="2" r="11" stroke="#16182A" strokeWidth="3" fill="none" />
          <Path d="M-24 0l12-16 20 0 10 18M-12 -16l8 16h-20M-14 -20l8 0M16 -18l8 4" stroke="#E85340" strokeWidth="3" fill="none" strokeLinejoin="round" />
        </G>
        {/* boat — left */}
        <G transform="translate(42 104) rotate(-42)">
          <Path d="M-28 4h56l-12 18h-34z" fill="#E85340" />
          <Rect x="-20" y="-12" width="40" height="16" rx="6" fill="#D9CBF2" />
          <Path d="M-14 -8h8M-2 -8h8M10 -8h6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </G>
        {/* car — right */}
        <G transform="translate(204 120) rotate(90)">
          <Path d="M-26 6q2-16 14-16h24q12 0 14 16z" fill="#3D7CC0" />
          <Rect x="-30" y="4" width="60" height="14" rx="7" fill="#5C9CDF" />
          <Rect x="-8" y="-6" width="16" height="9" rx="3" fill="#DDEEF8" />
          <Circle cx="-16" cy="18" r="6" fill="#16182A" /><Circle cx="-16" cy="18" r="2" fill="#fff" />
          <Circle cx="16" cy="18" r="6" fill="#16182A" /><Circle cx="16" cy="18" r="2" fill="#fff" />
        </G>
        {/* plane — bottom */}
        <G transform="translate(118 212) rotate(180)">
          <Path d="M-26 0q26-8 52 0-6 8-26 8t-26-8z" fill="#3D7CC0" transform="rotate(180 0 2)" />
          <Path d="M-24 -2h48q6 2 0 6h-48q-6-4 0-6z" fill="#5C9CDF" />
          <Path d="M-2 -2l-12-14h8l12 14zM2 4l-10 12h8l10-12z" fill="#3D7CC0" />
          <Path d="M-18 0h6M-8 0h6M2 0h6M12 0h6" stroke="#DDEEF8" strokeWidth="2.6" strokeLinecap="round" />
        </G>
      </Svg>
    </Animated.View>
  );
}

function Splash() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 6000, useNativeDriver: true })).start();
  }, []);
  return (
    <View style={[s.fill, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }]}>
      <StatusBar barStyle="dark-content" />
      <ConfettiBG />
      <GlobeRideScene width={225} />
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
  const player = useVideoPlayer(require('./assets/welcome.mp4'), p => {
    p.loop = true; p.muted = true;
  });
  useEffect(() => {
    player.play();
    const t = setInterval(() => { if (!player.playing) player.play(); }, 1200); // nudge until it actually starts
    return () => clearInterval(t);
  }, [player]);
  return (
    <View style={[s.fill, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="dark-content" />
      <ConfettiBG />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <VideoView player={player} nativeControls={false} contentFit="cover"
          style={{ width: 260, height: 214, borderRadius: 22 }} />
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

/* slide 1: booking phone with route, ticket lines, barcode; plane flies the arc */
function BookingPhoneScene({ width = 165 }) {
  const fly = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(fly, { toValue: 1, duration: 3200, useNativeDriver: true })).start();
  }, []);
  const h = width * 1.02;
  return (
    <View style={{ width, height: h }}>
      <Svg width={width} height={h} viewBox="0 0 170 174">
        <Rect x="35" y="4" width="100" height="166" rx="16" fill="#fff" stroke="#23253A" strokeWidth="4" />
        <Rect x="70" y="10" width="30" height="7" rx="3.5" fill="#23253A" />
        <Rect x="48" y="30" width="12" height="26" rx="2" fill="#8A93B8" />
        <Rect x="110" y="28" width="12" height="28" rx="2" fill="#8A93B8" transform="rotate(6 116 42)" />
        <Path d="M60 46q25-18 50 0" stroke="#23253A" strokeWidth="1.6" strokeDasharray="3 4" fill="none" />
        <Circle cx="60" cy="46" r="4" fill="#5C9CDF" /><Circle cx="110" cy="46" r="4" fill="#5C9CDF" />
        <Rect x="46" y="64" width="78" height="34" rx="5" fill="none" stroke="#23253A" strokeWidth="2" />
        <Rect x="52" y="70" width="28" height="7" rx="3.5" fill="none" stroke="#23253A" strokeWidth="1.6" />
        <Rect x="88" y="70" width="30" height="7" rx="3.5" fill="#5C9CDF" />
        <Path d="M52 84h30M52 90h26M88 84h30M88 90h24" stroke="#9AA3BF" strokeWidth="1.6" />
        <Rect x="46" y="104" width="40" height="7" rx="3.5" fill="#5C9CDF" />
        <Path d="M46 118h16M66 118h16M86 118h16M106 118h16" stroke="#23253A" strokeWidth="5" strokeLinecap="round" opacity=".8" />
        <Rect x="46" y="128" width="78" height="22" rx="3" fill="none" stroke="#23253A" strokeWidth="2" />
        {[50, 54, 57, 62, 66, 69, 74, 78, 81, 86, 90, 93, 98, 102, 105, 110, 114, 118].map(x => (
          <Rect key={x} x={x} y="132" width={x % 3 === 0 ? 2.5 : 1.4} height="14" fill="#23253A" />
        ))}
        <Rect x="52" y="156" width="66" height="10" rx="5" fill="#FF6B57" />
      </Svg>
      <Animated.View style={{
        position: 'absolute', left: 0, top: width * 0.14, opacity: fly.interpolate({ inputRange: [0, .08, .9, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [width * .32, width * .6] }) }],
      }}><Text style={{ fontSize: 14 }}>✈️</Text></Animated.View>
    </View>
  );
}

/* slide 2: person tossing a paper plane (referral) */
function PlaneTossScene({ width = 150 }) {
  const toss = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(toss, { toValue: 1, duration: 1600, useNativeDriver: true }),
      Animated.timing(toss, { toValue: 0, duration: 1600, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={{ width, height: width }}>
      <Svg width={width} height={width} viewBox="0 0 150 150">
        <Rect x="18" y="34" width="114" height="96" rx="16" fill="#5C9CDF" />
        <Path d="M45 130q4-44 30-44 26 0 30 44z" fill="#F7F2E9" />
        <Path d="M92 84q16-18 18-34" stroke="#B4744C" strokeWidth="9" strokeLinecap="round" fill="none" />
        <Circle cx="75" cy="66" r="19" fill="#2E1F14" />
        <Circle cx="75" cy="46" r="8" fill="#2E1F14" />
        <Circle cx="60" cy="70" r="2.5" fill="#F5C043" />
      </Svg>
      <Animated.View style={{
        position: 'absolute', right: 6, top: 0,
        transform: [
          { translateY: toss.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) },
          { rotate: toss.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '8deg'] }) },
        ],
      }}>
        <Svg width={44} height={44} viewBox="0 0 32 32">
          <Path d="M29 4L3 14.5l8.2 3.4L26 7.5 14.2 19.8l1 8.2 4.3-5.6 6 2.6z" fill="#5C9CDF" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/* slide 3: suitcase + passport + tickets, floating */
function PassportScene({ width = 158 }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 2600, useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 2600, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>
      <Svg width={width} height={width} viewBox="0 0 160 160">
        <Circle cx="95" cy="85" r="60" fill="#FBEEDB" />
        <Path d="M95 30q28 6 38 30-20 8-38 0-10-18 0-30z" fill="#A9D5EA" />
        <Rect x="98" y="72" width="52" height="22" rx="6" fill="#fff" stroke="#3A2A55" strokeWidth="3" transform="rotate(24 124 83)" />
        <Rect x="104" y="94" width="52" height="22" rx="6" fill="#F08A5C" stroke="#3A2A55" strokeWidth="3" transform="rotate(24 130 105)" />
        <Rect x="46" y="26" width="16" height="14" rx="3" fill="none" stroke="#3A2A55" strokeWidth="4" />
        <Rect x="26" y="38" width="56" height="96" rx="14" fill="#F5C043" stroke="#3A2A55" strokeWidth="3.5" />
        <Path d="M40 50v72M54 50v72M68 50v72" stroke="#F9DFA0" strokeWidth="6" strokeLinecap="round" />
        <Circle cx="40" cy="138" r="5" fill="#3A2A55" />
        <Rect x="62" y="70" width="66" height="84" rx="10" fill="#5F55C9" stroke="#3A2A55" strokeWidth="3.5" />
        <Circle cx="95" cy="102" r="16" fill="none" stroke="#fff" strokeWidth="2.5" />
        <Path d="M79 102h32M95 86c5 5 5 27 0 32-5-5-5-27 0-32zM82 94q13 6 26 0M82 110q13-6 26 0" stroke="#fff" strokeWidth="2" fill="none" />
        <Rect x="80" y="132" width="30" height="8" rx="3" fill="#F7F2E9" />
      </Svg>
    </Animated.View>
  );
}

function PromoCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x => (x + 1) % PROMO_SLIDES.length), 6000); return () => clearInterval(t); }, []);
  const p = PROMO_SLIDES[i];
  const art = [<BookingPhoneScene key="a" />, <PlaneTossScene key="b" />, <PassportScene key="c" />][i];
  return (
    <View>
      <View style={{
        backgroundColor: '#fff', borderRadius: 24, padding: 20, paddingTop: 18, minHeight: 300,
        shadowColor: '#2A2C4A', shadowOpacity: .09, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
      }}>
        <Pressable onPress={() => Alert.alert(p.t, p.d)} style={{
          position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 17,
          backgroundColor: T.mint, alignItems: 'center', justifyContent: 'center', zIndex: 2,
        }}><Text style={{ fontStyle: 'italic', fontWeight: '800', color: T.mintInk, fontSize: 15 }}>i</Text></Pressable>
        <Pressable onPress={() => setI(x => (x + 1) % PROMO_SLIDES.length)} style={{ alignItems: 'center' }}>
          <View style={{ height: 170, justifyContent: 'center' }}>{art}</View>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 19, textAlign: 'center', marginTop: 8 }}>{p.t}</Text>
          <Text style={{ color: T.soft, fontWeight: '600', fontSize: 13.5, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{p.d}</Text>
        </Pressable>
      </View>
      <View style={{
        backgroundColor: '#fff', borderRadius: 999, padding: 8, flexDirection: 'row', gap: 8, marginTop: 12,
        shadowColor: '#2A2C4A', shadowOpacity: .08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
      }}>
        {PROMO_SLIDES.map((_, x) => (
          <Pressable key={x} onPress={() => setI(x)}
            style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: x === i ? T.ink : '#E0D5C3' }} />
        ))}
      </View>
    </View>
  );
}

function Store({ userName, query, setQuery, cat, setCat, list, mode, onCountry, onChat }) {
  const [compact, setCompact] = useState(false);
  return (
    <View style={s.fill}>
      {compact && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, backgroundColor: T.bg,
          paddingTop: TOPPAD, paddingBottom: 10, paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: T.line,
        }}>
          <View style={{ width: 74 }} />
          <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: T.ink }}>नमस्ते, {userName}</Text>
          <View style={{ backgroundColor: T.mint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ color: T.mintInk, fontWeight: '800', fontSize: 13 }}>₹0.00</Text>
          </View>
        </View>
      )}
      <FlatList
        data={list}
        keyExtractor={(item, i) => (item.iso || item.n) + i}
        showsVerticalScrollIndicator={false}
        onScroll={e => setCompact(e.nativeEvent.contentOffset.y > 100)}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{
              marginHorizontal: -16, backgroundColor: T.bgDeep, paddingTop: TOPPAD, paddingHorizontal: 16,
              paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, marginBottom: 18,
              shadowColor: '#2A2C4A', shadowOpacity: .09, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
            }}>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: T.soft, fontWeight: '700' }}>Cashback</Text>
              <View style={{ backgroundColor: T.mint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ color: T.mintInk, fontWeight: '800', fontSize: 13 }}>₹0.00</Text>
              </View>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: T.ink, marginBottom: 12 }}>नमस्ते, {userName}</Text>
            <TextInput style={s.search} placeholder="Where are you travelling to?" placeholderTextColor={T.soft}
              value={query} onChangeText={setQuery} />
            </View>
            <PromoCarousel />
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
              : <RegionBadge kind={regionKind(item)} size={48} />}
            <Text style={{ flex: 1, fontWeight: '700', fontSize: 15, color: T.ink }}>{item.n}</Text>
            <Text style={{ fontWeight: '800', fontSize: 15, color: T.ink }}>₹{item.from} <Text style={{ color: T.soft, fontSize: 11 }}>INR</Text></Text>
          </Pressable>
        )}
      />
      <Pressable style={s.fab} onPress={onChat}><Text style={{ fontSize: 22 }}>💬</Text></Pressable>
    </View>
  );
}

/* Travel toolkit — real tools: live FX, visa info, live weather, trip essentials */
const CCY = { th: 'THB', ae: 'AED', sg: 'SGD', id: 'IDR', my: 'MYR', vn: 'VND', us: 'USD', gb: 'GBP', lk: 'LKR', np: 'NPR', jp: 'JPY', kr: 'KRW', cn: 'CNY', hk: 'HKD', tw: 'TWD', ph: 'PHP', kh: 'KHR', au: 'AUD', nz: 'NZD', ca: 'CAD', ch: 'CHF', tr: 'TRY', eg: 'EGP', za: 'ZAR', ke: 'KES', mv: 'MVR', bh: 'BHD', qa: 'QAR', sa: 'SAR', om: 'OMR', kw: 'KWD', fr: 'EUR', de: 'EUR', it: 'EUR', es: 'EUR', nl: 'EUR', pt: 'EUR', gr: 'EUR', at: 'EUR', be: 'EUR', ie: 'EUR', fi: 'EUR' };
const VISA_DB = {
  th: 'Visa-free for Indian passports (tourism, up to 60 days).', id: 'Visa on arrival for Indians (~IDR 500k, 30 days, extendable).',
  my: 'Visa-free entry for Indians (30 days) under current scheme.', lk: 'Free ETA online before travel for Indians.',
  np: 'No visa needed for Indian citizens.', mv: 'Free visa on arrival (30 days) for Indians.',
  ae: 'eVisa required for most Indians; pre-approved visa-on-arrival if you hold a valid US visa/green card.',
  sg: 'Visa required for Indian passports — apply via authorised agents.', vn: 'eVisa required (~USD 25, apply online).',
  kh: 'Visa on arrival or eVisa for Indians.', qa: 'Visa on arrival for Indians (conditions apply).',
  us: 'B1/B2 visa required — interview at US consulate.', gb: 'UK visitor visa required.',
  jp: 'eVisa available for Indian tourists.', kr: 'K-ETA / visa required for Indians.',
  fr: 'Schengen visa required.', de: 'Schengen visa required.', it: 'Schengen visa required.', es: 'Schengen visa required.',
  au: 'Visitor visa (subclass 600) required — apply online.', nz: 'Visitor visa required.',
};
const PLUG_DB = { th: 'A/B/C · 230V', ae: 'G · 230V', sg: 'G · 230V', id: 'C/F · 230V', my: 'G · 240V', vn: 'A/C · 220V', us: 'A/B · 120V', gb: 'G · 230V', jp: 'A/B · 100V', fr: 'C/E · 230V', de: 'C/F · 230V', au: 'I · 230V', lk: 'D/G · 230V', np: 'C/D · 230V', mv: 'D/G · 230V', kr: 'C/F · 220V' };

/* trip reminder card — schedules real device notifications for the trip */
function TripReminderCard({ country }) {
  const [set, setSet] = useState(null);
  const [busy, setBusy] = useState(false);
  const CHOICES = [['Today', 0], ['Tomorrow', 1], ['In 3 days', 3], ['In a week', 7]];
  const pick = async (label, days) => {
    setBusy(true);
    const r = await scheduleTripReminders(country || 'your destination', days);
    setBusy(false);
    if (r.ok && r.count) setSet(`Reminders set — we'll nudge you to install before you fly and to switch on roaming when you land.`);
    else if (r.reason === 'web') setSet('Reminders work on the phone app — open MobiYatri on your phone to set them.');
    else if (r.reason === 'denied') setSet('Notifications are off for MobiYatri. Enable them in your phone settings to get trip reminders.');
    else setSet('That date has passed — pick a later one.');
  };
  return (
    <View style={[s.card, { marginTop: 16 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ToolIcon kind="holidays" size={34} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>Remind me before I fly</Text>
          <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12 }}>When are you travelling?</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {CHOICES.map(([label, days]) => (
          <Pressable key={label} disabled={busy} onPress={() => pick(label, days)}
            style={{ borderWidth: 1.5, borderColor: T.line, backgroundColor: T.bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15 }}>
            <Text style={{ color: T.ink, fontWeight: '700', fontSize: 13 }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {set ? <Text style={{ color: T.mintInk, fontWeight: '700', fontSize: 12.5, marginTop: 10 }}>{set}</Text> : null}
    </View>
  );
}

/* toolkit icons — tinted rounded tile + line mark, one visual family */
const TOOL_TINT = {
  money: ['#EAF3EC', '#2E7D5B'], visa: ['#EAF0FA', '#3E6FB0'], weather: ['#E9F2FA', '#4A8FC0'],
  basics: ['#FBF0DE', '#B07A22'], plan: ['#F3EDFB', '#7A5AB8'], holidays: ['#FDEDE9', '#C4553F'],
};
function ToolIcon({ kind, size = 38 }) {
  const [bg, fg] = TOOL_TINT[kind] || TOOL_TINT.money;
  const p = { fill: 'none', stroke: fg, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <View style={{ width: size, height: size, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24">
        {kind === 'money' && (<>
          <Circle cx="12" cy="12" r="8.6" {...p} />
          <Path d="M9.6 8.4h4.8M9.6 11h4.8M9.6 8.4c2.6 0 4 .9 4 2.6s-1.4 2.6-4 2.6l4.8 4.4" {...p} />
        </>)}
        {kind === 'visa' && (<>
          <Rect x="4.6" y="3.4" width="14.8" height="17.2" rx="2.6" {...p} />
          <Circle cx="12" cy="10" r="2.9" {...p} />
          <Path d="M8.6 16.6h6.8" {...p} />
        </>)}
        {kind === 'weather' && (<>
          <Circle cx="8.8" cy="8.6" r="3.1" {...p} />
          <Path d="M9.4 18.2h8.2a3.4 3.4 0 0 0 .3-6.8 4.6 4.6 0 0 0-8.7-.9 3.9 3.9 0 0 0 .2 7.7z" {...p} />
        </>)}
        {kind === 'basics' && (<>
          <Path d="M9 3.4v5.2M15 3.4v5.2" {...p} />
          <Path d="M6.6 8.6h10.8v3.2a5.4 5.4 0 0 1-5.4 5.4 5.4 5.4 0 0 1-5.4-5.4z" {...p} />
          <Path d="M12 17.2v3.4" {...p} />
        </>)}
        {kind === 'plan' && (<>
          <Path d="M12 3.2l1.9 4.6 4.9.4-3.7 3.2 1.1 4.8L12 13.7 7.8 16.2l1.1-4.8L5.2 8.2l4.9-.4z" {...p} />
        </>)}
        {kind === 'holidays' && (<>
          <Rect x="3.8" y="5.2" width="16.4" height="15" rx="2.6" {...p} />
          <Path d="M3.8 9.6h16.4M8.4 3.4v3.6M15.6 3.4v3.6" {...p} />
          <Circle cx="12" cy="14.4" r="1.5" fill={fg} stroke="none" />
        </>)}
      </Svg>
    </View>
  );
}

function TravelToolkit({ name, iso, session, onAuth }) {
  const [tool, setTool] = useState(null);
  const [data, setData] = useState(null);
  const place = /\(([^)]+)\)/.exec(name || '')?.[1] || (name || '').split(' (')[0];
  const openTool = async t => {
    setTool(t); setData(null);
    try {
      if (t === 'money') {
        const r = await fetch('https://open.er-api.com/v6/latest/INR').then(x => x.json());
        const code = CCY[iso] || 'USD';
        setData({ code, rate: r.rates?.[code] });
      } else if (t === 'weather' || t === 'basics') {
        const g = (await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(place) + '&count=1').then(x => x.json())).results?.[0];
        if (!g) return setData({ err: true });
        if (t === 'basics') return setData({ tz: g.timezone, city: g.name });
        const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`).then(x => x.json());
        setData({ city: g.name, days: w.daily });
      } else if (t === 'plan') {
        const d = await fetch(API + '/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: 'Compact ' + name + ' trip plan for an Indian traveller: top 5 sights, 3 local foods to try, and budget tips in INR. Under 180 words, plain text.' }], context: {} }) }).then(x => x.json());
        setData({ plan: d.reply || 'Yatri Sahayak is busy — try again in a moment.' });
      } else if (t === 'holidays') {
        const y = new Date().getFullYear();
        const h = await fetch('https://date.nager.at/api/v3/PublicHolidays/' + y + '/' + (iso || '').toUpperCase()).then(x => x.ok ? x.json() : null);
        setData({ hols: (h || []).filter(x => x.date >= new Date().toISOString().slice(0, 10)).slice(0, 6) });
      } else setData({});
    } catch (e) { setData({ err: true }); }
  };
  const CARDS = [
    ['Money', 'Live ₹ exchange rate', 'money'],
    ['Visa info', 'Rules for Indian passports', 'visa'],
    ['Weather', '3-day forecast there', 'weather'],
    ['Trip basics', 'Local time · plugs · emergency', 'basics'],
    ['Trip plan', 'AI itinerary by Yatri Sahayak', 'plan'],
    ['Holidays', 'Public holidays there', 'holidays'],
  ];
  const locked = !session;
  return (
    <View style={{ marginTop: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ flex: 1, color: T.ink, fontWeight: '800', fontSize: 15.5 }}>Travel toolkit</Text>
        {locked && (
          <View style={{ backgroundColor: T.mint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: T.mintInk, fontWeight: '800', fontSize: 11 }}>FREE WITH ACCOUNT</Text>
          </View>
        )}
      </View>
      {locked && (
        <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5, marginBottom: 8 }}>
          Sign in to unlock live rates, visa rules, weather and an AI trip plan for {name}.
        </Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CARDS.map(([t, d, k]) => (
          <Pressable key={t} onPress={() => (locked ? onAuth && onAuth() : openTool(k))}
            style={{ width: '48%', backgroundColor: '#fff', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: T.line, opacity: locked ? .72 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ToolIcon kind={k} />
              {locked && <Text style={{ marginLeft: 'auto', fontSize: 12, color: T.soft }}>🔒</Text>}
            </View>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 13.5, marginTop: 6 }}>{t}</Text>
            <Text style={{ color: T.soft, fontWeight: '600', fontSize: 11.5, marginTop: 2 }} numberOfLines={2}>{d}</Text>
          </Pressable>
        ))}
      </View>
      {tool && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setTool(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(20,22,40,.45)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ flex: 1, fontSize: 19, fontWeight: '800', color: T.ink }}>
                  {tool === 'money' ? `₹ to ${name}` : tool === 'visa' ? `Visa: ${name}` : tool === 'weather' ? `Weather in ${place}` : `${name} basics`}
                </Text>
                <Pressable onPress={() => setTool(null)}><Text style={{ fontSize: 18, color: T.ink }}>✕</Text></Pressable>
              </View>
              {!data && <ActivityIndicator color={T.indigo} style={{ marginVertical: 20 }} />}
              {data?.err && <Text style={{ color: T.soft, fontWeight: '600' }}>Couldn't fetch live data right now — try again in a moment.</Text>}
              {tool === 'money' && data?.rate && (
                <View>
                  <Text style={{ color: T.ink, fontWeight: '800', fontSize: 22 }}>₹1 = {data.rate.toFixed(data.rate < 1 ? 4 : 2)} {data.code}</Text>
                  {[1000, 5000, 10000].map(a => (
                    <View key={a} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: T.line }}>
                      <Text style={{ color: T.soft, fontWeight: '700' }}>₹{a.toLocaleString('en-IN')}</Text>
                      <Text style={{ color: T.ink, fontWeight: '800' }}>{(a * data.rate).toLocaleString('en-US', { maximumFractionDigits: 0 })} {data.code}</Text>
                    </View>
                  ))}
                  <Text style={{ color: T.soft, fontWeight: '500', fontSize: 11.5, marginTop: 10 }}>Live mid-market rate — cards and counters add a margin.</Text>
                </View>
              )}
              {tool === 'visa' && data && (
                <View>
                  <Text style={{ color: T.ink, fontWeight: '600', fontSize: 15, lineHeight: 23 }}>
                    {VISA_DB[iso] || 'Rules vary — check the official embassy or government eVisa portal for Indian passport holders.'}
                  </Text>
                  <Text style={{ color: T.soft, fontWeight: '500', fontSize: 11.5, marginTop: 12 }}>
                    Visa rules change often — always confirm on the official government portal before booking.
                  </Text>
                </View>
              )}
              {tool === 'weather' && data?.days && (
                <View>
                  {data.days.time.map((d, i) => (
                    <View key={d} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderColor: T.line }}>
                      <Text style={{ color: T.ink, fontWeight: '700' }}>{new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                      <Text style={{ color: T.soft, fontWeight: '700' }}>☔ {data.days.precipitation_probability_max[i]}%</Text>
                      <Text style={{ color: T.ink, fontWeight: '800' }}>{Math.round(data.days.temperature_2m_min[i])}–{Math.round(data.days.temperature_2m_max[i])}°C</Text>
                    </View>
                  ))}
                  <Text style={{ color: T.soft, fontWeight: '500', fontSize: 11.5, marginTop: 10 }}>Live forecast for {data.city} · Open-Meteo</Text>
                </View>
              )}
              {tool === 'plan' && data?.plan && (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  <Text style={{ color: T.ink, fontWeight: '500', fontSize: 14, lineHeight: 22 }}>{data.plan}</Text>
                  <Text style={{ color: T.soft, fontWeight: '500', fontSize: 11.5, marginTop: 10 }}>Generated by Yatri Sahayak — verify timings locally.</Text>
                </ScrollView>
              )}
              {tool === 'holidays' && data?.hols && (
                <View>
                  {data.hols.length === 0 && <Text style={{ color: T.soft, fontWeight: '600' }}>No upcoming public holidays found for this destination.</Text>}
                  {data.hols.map(h => (
                    <View key={h.date} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: T.line }}>
                      <Text style={{ color: T.ink, fontWeight: '700', flex: 1 }} numberOfLines={1}>{h.localName || h.name}</Text>
                      <Text style={{ color: T.soft, fontWeight: '700' }}>{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                  ))}
                  <Text style={{ color: T.soft, fontWeight: '500', fontSize: 11.5, marginTop: 10 }}>Shops and sights may close on public holidays.</Text>
                </View>
              )}
              {tool === 'basics' && data?.tz && (
                <View>
                  {[['🕐 Local time now', new Date().toLocaleTimeString('en-IN', { timeZone: data.tz, hour: '2-digit', minute: '2-digit' }) + ` (${data.tz})`],
                    ['🔌 Plugs', PLUG_DB[iso] || 'Carry a universal adapter'],
                    ['🚨 Emergency', '112 works in most countries'],
                    ['📶 Your data', 'MobiYatri eSIM — roaming ON for it, OFF for your Indian SIM']].map(([k, v]) => (
                      <View key={k} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: T.line }}>
                        <Text style={{ color: T.soft, fontWeight: '700', fontSize: 12.5 }}>{k}</Text>
                        <Text style={{ color: T.ink, fontWeight: '700', fontSize: 14.5, marginTop: 2 }}>{v}</Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

/* tab-bar icons — line style, filled accent when active */
function TabIcon({ name, active, size = 24 }) {
  const stroke = active ? T.ink : '#A79C8C';
  const fill = active ? T.coral : 'none';
  const sw = 1.9;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'store' && (
        <>
          <Path d="M4.5 8.5h15l-1.1 10a2.2 2.2 0 0 1-2.2 2H7.8a2.2 2.2 0 0 1-2.2-2z"
            fill={active ? 'rgba(255,107,87,.18)' : 'none'} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <Path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          {active && <Circle cx="12" cy="13.5" r="1.6" fill={T.coral} />}
        </>
      )}
      {name === 'esims' && (
        <>
          <Path d="M6 3.5h7.6L18 7.9V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5z"
            fill={active ? 'rgba(255,107,87,.18)' : 'none'} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <Rect x="8" y="11" width="7" height="6" rx="1.4" fill={active ? T.coral : 'none'} stroke={stroke} strokeWidth="1.6" />
          <Path d="M8 14h7M11.5 11v6" stroke={active ? '#fff' : stroke} strokeWidth="1.3" />
        </>
      )}
      {name === 'profile' && (
        <>
          <Circle cx="12" cy="8.6" r="3.8" fill={active ? 'rgba(255,107,87,.18)' : 'none'} stroke={stroke} strokeWidth={sw} />
          <Path d="M4.8 20.2c0-3.8 3.2-6.2 7.2-6.2s7.2 2.4 7.2 6.2" fill={active ? 'rgba(255,107,87,.18)' : 'none'}
            stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

/* premium region badges — gradient tile + crafted mark per region (replaces emoji) */
const REGION_ART = {
  asia:   { c1: '#F4B63F', c2: '#E8934B' },
  gulf:   { c1: '#E8B04B', c2: '#C98A2E' },
  europe: { c1: '#7C9BE0', c2: '#5C74C4' },
  africa: { c1: '#E2915C', c2: '#C9713F' },
  na:     { c1: '#5FA8C9', c2: '#3E7FA6' },
  americas: { c1: '#5FA8C9', c2: '#3E7FA6' },
  global: { c1: '#4E9E8C', c2: '#2E7D6B' },
};
function RegionBadge({ kind = 'global', size = 40 }) {
  const { c1, c2 } = REGION_ART[kind] || REGION_ART.global;
  const r = size / 2;
  return (
    <Svg width={size} height={size * 0.74} viewBox="0 0 40 30">
      <Defs>
        <LinearGradient id={'rg' + kind} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c1} /><Stop offset="1" stopColor={c2} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="40" height="30" rx="7" fill={`url(#rg${kind})`} />
      {kind === 'global' ? (
        <>
          <Circle cx="20" cy="15" r="9.5" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".95" />
          <Path d="M10.5 15h19M20 5.5c3 3 4.4 6 4.4 9.5S23 21.5 20 24.5c-3-3-4.4-6-4.4-9.5S17 8.5 20 5.5z" stroke="#fff" strokeWidth="1.4" fill="none" opacity=".9" />
        </>
      ) : kind === 'europe' ? (
        <>
          <Circle cx="20" cy="15" r="8.5" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".9" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const a = (i / 8) * Math.PI * 2;
            return <Circle key={i} cx={20 + Math.cos(a) * 5.6} cy={15 + Math.sin(a) * 5.6} r="1.15" fill="#fff" />;
          })}
        </>
      ) : kind === 'gulf' ? (
        <>
          <Path d="M14 21V13l5-4 5 4v8z" fill="#fff" opacity=".95" />
          <Path d="M19 9c0-2 0-2.6 0-3.4" stroke="#fff" strokeWidth="1.2" />
          <Circle cx="19" cy="5" r="1.3" fill="#fff" />
          <Path d="M11 21h17" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : kind === 'asia' ? (
        <>
          <Path d="M11 20c3-6 7-9 12-9M11 20h18" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <Circle cx="26" cy="10" r="3.4" fill="#fff" opacity=".95" />
          <Path d="M14 20v-3.5M18 20v-5.5M22 20v-4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".85" />
        </>
      ) : kind === 'africa' ? (
        <>
          <Path d="M17 7c4-1 7 1 6 5-1 3-4 4-4 7 0 2-1 4-3 4-3 0-4-4-4-8s2-7 5-8z" fill="#fff" opacity=".95" />
          <Circle cx="26" cy="19" r="2.6" fill="#fff" opacity=".8" />
        </>
      ) : (
        <>
          <Path d="M20 6l2.6 5.6 6 .7-4.4 4.2 1.2 6-5.4-3-5.4 3 1.2-6L11.4 12.3l6-.7z" fill="#fff" opacity=".95" />
        </>
      )}
    </Svg>
  );
}
const regionKind = item => (item.icon || (/(global)/i.test(item.n || '') ? 'global' : 'global'));

function Country({ c, pkg, setPkg, session, onAuth, onBack, onBuy }) {
  const groups = (c.packages && [...(c.packages.std || []), ...((c.packages.unl || []).map(g => ({ ...g, unl: true })))]) || [];
  return (
    <View style={s.fill}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: TOPPAD, paddingBottom: 140 }}>
        <Pressable onPress={onBack}><Text style={{ fontSize: 22, color: T.ink, fontWeight: '700' }}>‹ Back</Text></Pressable>
        <Text style={{ fontSize: 26, fontWeight: '800', color: T.ink, marginVertical: 10 }}>{c.n}</Text>
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {c.iso ? <Image source={{ uri: flagUrl(c.iso) }} style={s.flag} /> : <RegionBadge kind={regionKind(c||{})} size={46} />}
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
        <TravelToolkit name={c.n} iso={c.iso} session={session} onAuth={onAuth} />
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: TOPPAD, paddingBottom: 150 }}>
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

function OrderComplete({ order, policy, country, iso, session, onDone, onInstall }) {
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
      <TripReminderCard country={country} />
      <TravelToolkit name={country} iso={iso} session={session} />
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
  const [detail, setDetail] = useState(null);
  return (
    <View style={s.fill}>
    <ScrollView style={s.fill} contentContainerStyle={{ padding: 16, paddingTop: TOPPAD, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
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
      {session && esims.length > 0 && (
        <View style={[s.card, { marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Text style={{ fontSize: 22 }}>🪙</Text>
          <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 14 }}>Get ₹150 cashback for each friend's first trip</Text>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 16 }}>›</Text>
        </View>
      )}
      {esims.map((e, i) => {
        const o = e.orders || {};
        const c = countries.find(x => x.n === o.country_name);
        const parts = (o.package_label || '— · —').split(' · ');
        return (
          <View key={(e.iccid || '') + i} style={[s.card, { marginBottom: 14, padding: 18 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: T.line, paddingBottom: 12 }}>
              {c && c.iso ? <Image source={{ uri: flagUrl(c.iso) }} style={s.flag} /> : <RegionBadge kind={regionKind(c||{})} size={44} />}
              <Text style={{ fontWeight: '800', fontSize: 18, color: T.ink }}>{o.country_name || 'eSIM'}</Text>
            </View>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 14.5, marginTop: 12, marginBottom: 8 }}>Package</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={s.stat}><Text style={s.statK}>⇅ Data</Text><Text style={s.statV}>{parts[0]}</Text></View>
              <View style={s.stat}><Text style={s.statK}>📅 Validity</Text><Text style={s.statV}>{parts[1]}</Text></View>
            </View>
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: T.line, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 14 }}>🔁 Renewals</Text>
              <View style={{ backgroundColor: T.bgDeep, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ color: T.soft, fontWeight: '800', fontSize: 12.5 }}>● Off</Text>
              </View>
            </View>
            <Pressable style={[s.btnOutlineLight, { marginTop: 12 }]} onPress={() => setDetail(e)}>
              <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15.5 }}>View details</Text>
            </Pressable>
            <Pressable style={[s.btnPrimary, { marginTop: 10 }]} onPress={() => onInstall(e)}>
              <Text style={s.btnPrimaryTxt}>Install or share</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
    <EsimDetailModal esim={detail} countries={countries} onClose={() => setDetail(null)} onInstall={e => { setDetail(null); onInstall(e); }} />
    </View>
  );
}

/* accordion row used by the detail screen */
function DetailAcc({ icon, title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
      <Pressable onPress={() => setOpen(o => !o)} style={{ flexDirection: 'row', alignItems: 'center', padding: 15 }}>
        {icon ? <Text style={{ fontSize: 15, marginRight: 9 }}>{icon}</Text> : null}
        <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 14.5 }}>{title}</Text>
        <Text style={{ color: T.ink, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>⌄</Text>
      </Pressable>
      {open && <View style={{ paddingHorizontal: 15, paddingBottom: 13 }}>
        <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13, lineHeight: 19 }}>{children}</Text>
      </View>}
    </View>
  );
}

/* full eSIM detail screen (modal) — ICCID copy, package, renewals, install, history, troubleshooting */
const gb = b => (b / 1073741824).toFixed(2).replace(/\.00$/, '') + ' GB';
const STATUS_LABEL = { GOT_RESOURCE: 'Ready to install', RELEASED: 'Ready to install', ENABLED: 'Installed', IN_USE: 'Active', USED_UP: 'Used up', UNAVAILABLE: 'Expired' };

function EsimDetailModal({ esim, countries, onClose, onInstall }) {
  const [banner, setBanner] = useState(null);
  const [live, setLive] = useState(null);
  const [renewOn, setRenewOn] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const flash = (t, m) => { setBanner({ t, m }); setTimeout(() => setBanner(null), 3400); };
  useEffect(() => {
    setLive(null);
    if (!esim?.iccid) return;
    fetch(API + '/api/esim-status?iccid=' + esim.iccid)
      .then(r => r.json()).then(setLive).catch(() => setLive({ live: false }));
    sb.auth.getSession().then(({ data: { session } }) =>
      setRenewOn(!!(session?.user?.user_metadata?.renewals || {})[esim.iccid]));
  }, [esim && esim.iccid]);

  const toggleRenew = async () => {
    const next = !renewOn;
    setRenewOn(next);
    const { data: { session } } = await sb.auth.getSession();
    const cur = (session?.user?.user_metadata?.renewals) || {};
    await sb.auth.updateUser({ data: { renewals: { ...cur, [esim.iccid]: next } } }).catch(() => {});
    flash(next ? 'ⓘ Renewals are on' : 'ⓘ Renewals are off',
      next ? 'Your package will renew when you run out of data — we prompt you here with one tap (payments launch makes it automatic).'
        : 'This eSIM will not be renewed.');
  };

  const findBundle = () => {
    const o = esim.orders || {};
    const c = countries.find(x => x.n === o.country_name);
    const parts = (o.package_label || '').split(' · ');
    for (const seg of ['std', 'unl']) {
      for (const g of (c?.packages?.[seg] || [])) {
        if (g.d === parts[1]) {
          const p = g.list.find(x => x.label === parts[0]);
          if (p) return { bundle: p.bundle, price: p.price };
        }
      }
    }
    return null;
  };

  const renewNow = async () => {
    const found = findBundle();
    const o = esim.orders || {};
    if (!found?.bundle) return flash('ⓘ Renewal', 'This pack is no longer in the live catalogue — pick a fresh one from the store.');
    setRenewing(true);
    try {
      const { data: { session } } = await sb.auth.getSession();
      const headers = { 'Content-Type': 'application/json' };
      if (session) headers.Authorization = 'Bearer ' + session.access_token;
      const r = await fetch(API + '/api/orders', {
        method: 'POST', headers,
        body: JSON.stringify({ bundle: found.bundle, country: o.country_name, package: o.package_label, price: found.price }),
      }).then(x => x.json());
      if (r.error) throw new Error(r.error);
      flash('ⓘ Renewed', `Order ${r.orderReference || 'confirmed'} — the new eSIM is in your list${r.emailSent ? ' and its QR was emailed to you' : ''}.`);
    } catch (e) { flash('ⓘ Renewal failed', e.message || 'Please try again.'); }
    setRenewing(false);
  };
  if (!esim) return null;
  const o = esim.orders || {};
  const c = countries.find(x => x.n === o.country_name);
  const parts = (o.package_label || '— · —').split(' · ');
  const copyIccid = () => {
    shareOrCopy(esim.iccid || '', 'ICCID copied.');
    flash('ⓘ ICCID copied', 'You can now paste the ICCID where it\'s needed.');
  };
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[s.fill]}>
        <View style={{ paddingTop: TOPPAD, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: T.bgDeep }}>
          <Pressable onPress={onClose} style={{ padding: 6 }}><Text style={{ fontSize: 20, fontWeight: '800', color: T.ink }}>‹</Text></Pressable>
          <Text style={{ flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 17, color: T.ink }}>{o.country_name || 'eSIM'}</Text>
          <View style={{ width: 30 }} />
        </View>
        {banner && (
          <View style={{ backgroundColor: '#5FB98A', padding: 14 }}>
            <Text style={{ color: '#0F3D26', fontWeight: '800', fontSize: 14 }}>{banner.t}</Text>
            <Text style={{ color: '#0F3D26', fontWeight: '600', fontSize: 12.5, marginTop: 2 }}>{banner.m}</Text>
          </View>
        )}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <View style={[s.card, { padding: 18 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: T.line, paddingBottom: 12, marginBottom: 12 }}>
              {c && c.iso ? <Image source={{ uri: flagUrl(c.iso) }} style={s.flag} /> : <RegionBadge kind={regionKind(c||{})} size={46} />}
              <Text style={{ fontWeight: '800', fontSize: 19, color: T.ink }}>{o.country_name || 'eSIM'}</Text>
            </View>
            <Text style={{ color: T.ink, fontWeight: '700', fontSize: 13.5, marginBottom: 8 }}>📡 {(c && c.op) || 'Partner network'}  <Text style={{ color: T.soft, fontSize: 11.5 }}>5G</Text></Text>
            <Pressable onPress={copyIccid} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: T.ink, fontWeight: '800', fontSize: 14 }}>ICCID</Text>
                <Text style={{ color: T.soft, fontWeight: '600', fontSize: 13 }}>{esim.iccid}</Text>
              </View>
              <Text style={{ fontSize: 17 }}>📋</Text>
            </Pressable>
          </View>

          {/* live status + usage from eSIM Access */}
          <View style={[s.card, { marginTop: 12 }]}>
            {live === null && <Text style={{ color: T.soft, fontWeight: '600', fontSize: 13 }}>Checking live status…</Text>}
            {live && !live.live && <Text style={{ color: T.soft, fontWeight: '600', fontSize: 13 }}>Live status unavailable right now.</Text>}
            {live && live.live && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, color: T.ink, fontWeight: '800', fontSize: 15 }}>Live status</Text>
                  <View style={{ backgroundColor: live.esimStatus === 'IN_USE' ? T.mint : T.bgDeep, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                    <Text style={{ color: live.esimStatus === 'IN_USE' ? T.mintInk : T.soft, fontWeight: '800', fontSize: 12.5 }}>
                      {STATUS_LABEL[live.esimStatus] || STATUS_LABEL[live.smdpStatus] || live.esimStatus || '—'}
                    </Text>
                  </View>
                </View>
                {live.totalBytes ? (
                  <View style={{ marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: T.soft, fontWeight: '700', fontSize: 12.5 }}>
                        {gb(live.usedBytes || 0)} used of {gb(live.totalBytes)}
                      </Text>
                      <Text style={{ color: T.ink, fontWeight: '800', fontSize: 12.5 }}>
                        {gb(Math.max(0, live.totalBytes - (live.usedBytes || 0)))} left
                      </Text>
                    </View>
                    <View style={{ height: 9, backgroundColor: T.bgDeep, borderRadius: 5, marginTop: 7, overflow: 'hidden' }}>
                      <View style={{
                        height: '100%', borderRadius: 5, backgroundColor: T.coral,
                        width: Math.min(100, Math.round(((live.usedBytes || 0) / live.totalBytes) * 100)) + '%',
                      }} />
                    </View>
                  </View>
                ) : null}
                {live.expiredTime ? (
                  <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5, marginTop: 10 }}>📅 Expires {live.expiredTime}</Text>
                ) : null}
              </>
            )}
          </View>

          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15, marginTop: 18, marginBottom: 8 }}>Package</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={s.stat}><Text style={s.statK}>⇅ Data</Text><Text style={s.statV}>{parts[0]}</Text></View>
            <View style={s.stat}><Text style={s.statK}>📅 Validity</Text><Text style={s.statV}>{parts[1]}</Text></View>
          </View>
          {o.price_inr ? <View style={[s.stat, { marginTop: 10 }]}><Text style={s.statK}>₹ Paid</Text><Text style={s.statV}>₹{o.price_inr}</Text></View> : null}

          <View style={[s.card, { marginTop: 18, backgroundColor: renewOn ? '#DDF0E2' : T.card }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, color: T.ink, fontWeight: '800', fontSize: 15.5 }}>Renewals</Text>
              <Pressable onPress={toggleRenew} style={{
                width: 48, height: 28, borderRadius: 999, padding: 3,
                backgroundColor: renewOn ? '#3E9B63' : '#DCD1BF',
                alignItems: renewOn ? 'flex-end' : 'flex-start', justifyContent: 'center',
              }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} />
              </Pressable>
            </View>
            <Text style={{ color: renewOn ? '#1F5B33' : T.soft, fontWeight: '500', fontSize: 13, marginTop: 6, lineHeight: 19 }}>
              {renewOn
                ? `Your package renews${findBundle() ? ` for ₹${findBundle().price}` : ''} when your eSIM runs out of data — one tap here when it's time (automatic charging arrives with payments).`
                : 'Turn on to renew your package when your eSIM runs low on data.'}
            </Text>
            {renewOn && live?.live && ((live.totalBytes && (live.usedBytes || 0) / live.totalBytes >= 0.9) || ['USED_UP', 'UNAVAILABLE'].includes(live.esimStatus)) && (
              <Pressable style={[s.btnPrimary, { marginTop: 12, opacity: renewing ? .6 : 1 }]} disabled={renewing} onPress={renewNow}>
                {renewing ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryTxt}>Renew now{findBundle() ? ` — ₹${findBundle().price}` : ''}</Text>}
              </Pressable>
            )}
          </View>

          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15, marginTop: 18, marginBottom: 8 }}>Ready to use your eSIM?</Text>
          <View style={s.card}>
            <Text style={{ color: T.ink, fontWeight: '700', fontSize: 14.5 }}>📲 Install your eSIM</Text>
            <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13, marginTop: 4 }}>Installation takes a few minutes — you only need to do this once.</Text>
            <Pressable style={[s.btnOutlineLight, { marginTop: 12 }]} onPress={() => onInstall(esim)}>
              <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>Install or share</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 18 }}>
            <DetailAcc icon="🧾" title="Package history">
              {`${o.package_label || ''} · ₹${o.price_inr || '—'}\nPurchased ${esim.created_at ? new Date(esim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} · status ${esim.status || 'assigned'}`}
            </DetailAcc>
            <DetailAcc icon="📋" title="Package details">
              Validity starts when the eSIM first connects at your destination. Data-only — keep your Indian SIM in for OTPs and WhatsApp. Hotspot allowed. One code installs on one device, once.
            </DetailAcc>
          </View>

          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15, marginTop: 10, marginBottom: 8 }}>Troubleshooting and FAQs</Text>
          <DetailAcc title="When should I install my eSIM?">
            Any time before you fly — home WiFi is easiest. It activates only when it first connects at your destination.
          </DetailAcc>
          <DetailAcc title="Where can I see that my eSIM is installed?">
            iPhone: Settings → Mobile Data — a second plan appears. Android: Settings → Connections / Network → SIM manager.
          </DetailAcc>
          <DetailAcc title="Why is my eSIM not working?">
            Turn data roaming ON for this eSIM (OFF for your Indian SIM), toggle aeroplane mode, or pick the partner network manually. Yatri Sahayak can walk you through it 24/7.
          </DetailAcc>
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 16, backgroundColor: T.bg }}>
          <Pressable style={s.btnPrimary} onPress={() => onInstall(esim)}>
            <Text style={s.btnPrimaryTxt}>Install or share</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* cross-platform confirm dialog (Alert.alert buttons are a no-op on web) */
function ConfirmDialog({ open, title, body, cancel = 'No', confirm = 'Yes', onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,22,40,.45)', alignItems: 'center', justifyContent: 'center', padding: 26 }}>
        <View style={{ backgroundColor: T.bg, borderRadius: 22, padding: 24, width: '100%', maxWidth: 380 }}>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 19, lineHeight: 26 }}>{title}</Text>
          {body ? <Text style={{ color: T.soft, fontWeight: '500', fontSize: 14, marginTop: 8, lineHeight: 20 }}>{body}</Text> : null}
          <Pressable style={[s.btnOutlineLight, { marginTop: 18 }]} onPress={onCancel}>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15.5 }}>{cancel}</Text>
          </Pressable>
          <Pressable style={[s.btnPrimary, { marginTop: 10 }]} onPress={onConfirm}>
            <Text style={s.btnPrimaryTxt}>{confirm}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* shared chrome for profile sub-screens */
function SubScreen({ title, onClose, banner, children }) {
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={s.fill}>
        <View style={{ paddingTop: TOPPAD, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={onClose} style={{ padding: 6 }}><Text style={{ fontSize: 20, fontWeight: '800', color: T.ink }}>‹</Text></Pressable>
          <Text style={{ fontWeight: '800', fontSize: 22, color: T.ink, marginLeft: 4 }}>{title}</Text>
        </View>
        {banner && (
          <View style={{ backgroundColor: '#5FB98A', padding: 14 }}>
            <Text style={{ color: '#0F3D26', fontWeight: '700', fontSize: 13.5 }}>{banner}</Text>
          </View>
        )}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const pinput = { backgroundColor: '#fff', borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 14, marginBottom: 10 };

/* Account information: edit name, change password, data request, delete account */
function AccountModal({ session, onClose }) {
  const meta = session?.user?.user_metadata || {};
  const full = (meta.full_name || '').split(' ');
  const [first, setFirst] = useState(full[0] || '');
  const [last, setLast] = useState(full.slice(1).join(' '));
  const [banner, setBanner] = useState(null);
  const [phone, setPhone] = useState(meta.phone || '');
  const [waOptin, setWaOptin] = useState(!!meta.wa_optin);
  const [pwOpen, setPwOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const flash = m => { setBanner(m); setTimeout(() => setBanner(null), 3400); };
  const saveName = async () => {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits && digits.length < 10) return flash('Enter a full mobile number with country code, e.g. 91 98765 43210.');
    const { error } = await sb.auth.updateUser({ data: { full_name: (first + ' ' + last).trim(), phone: digits, wa_optin: waOptin && !!digits } });
    flash(error ? error.message : 'Your details have been updated.');
  };
  return (
    <SubScreen title="Account information" onClose={onClose} banner={banner}>
      <View style={pinput}><Text style={s.statK}>First name</Text>
        <TextInput value={first} onChangeText={setFirst} style={{ color: T.ink, fontWeight: '700', fontSize: 15.5, padding: 0, marginTop: 2 }} /></View>
      <View style={pinput}><Text style={s.statK}>Last name (Optional)</Text>
        <TextInput value={last} onChangeText={setLast} style={{ color: T.ink, fontWeight: '700', fontSize: 15.5, padding: 0, marginTop: 2 }} /></View>
      <View style={[pinput, { opacity: .65 }]}><Text style={s.statK}>Email  🔒</Text>
        <Text style={{ color: T.ink, fontWeight: '700', fontSize: 15.5, marginTop: 2 }}>{session?.user?.email}</Text></View>
      <View style={pinput}><Text style={s.statK}>WhatsApp number (with country code)</Text>
        <TextInput value={phone} onChangeText={setPhone} keyboardType='phone-pad' placeholder='91 98765 43210' placeholderTextColor={T.soft}
          style={{ color: T.ink, fontWeight: '700', fontSize: 15.5, padding: 0, marginTop: 2 }} /></View>
      <Pressable onPress={() => setWaOptin(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: waOptin ? T.indigo : '#D8CDBB', backgroundColor: waOptin ? T.indigo : '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          {waOptin ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>✓</Text> : null}</View>
        <Text style={{ flex: 1, color: T.soft, fontWeight: '600', fontSize: 12.5 }}>Send my eSIM QR and trip updates on WhatsApp</Text>
      </Pressable>
      <Pressable style={s.btnOutlineLight} onPress={saveName}><Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>Save changes</Text></Pressable>
      <Pressable style={[s.btnOutlineLight, { marginTop: 10 }]} onPress={() => setPwOpen(true)}>
        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>Change password</Text></Pressable>

      <Text style={{ color: T.ink, fontWeight: '800', fontSize: 17, marginTop: 26 }}>Download your data</Text>
      <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, lineHeight: 20, marginTop: 6 }}>
        At your request we will prepare all the data we store about you (account, orders, eSIMs) and email it to you.
      </Text>
      <Pressable style={[s.btnOutlineLight, { marginTop: 12 }]}
        onPress={() => Linking.openURL('mailto:hello@mobiyatri.in?subject=Data%20export%20request&body=Please%20send%20me%20all%20data%20stored%20for%20' + (session?.user?.email || ''))}>
        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>Request my data</Text></Pressable>

      <Text style={{ color: T.ink, fontWeight: '800', fontSize: 17, marginTop: 26 }}>Delete your account</Text>
      <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, lineHeight: 20, marginTop: 6 }}>
        You can delete your account permanently — the process takes up to 7 days and can't be undone after completion. Logging back in cancels the request.
      </Text>
      <Pressable style={[s.btnOutlineLight, { marginTop: 12, borderColor: '#D94B3B' }]} onPress={() => setDelOpen(true)}>
        <Text style={{ color: '#D94B3B', fontWeight: '800', fontSize: 15 }}>Delete account</Text></Pressable>

      {pwOpen && <ChangePasswordSheet session={session} onClose={() => setPwOpen(false)}
        onDone={() => { setPwOpen(false); flash('Password has been successfully updated.'); }} />}
      {delOpen && <DeleteAccountSheet session={session} onClose={() => setDelOpen(false)}
        onDone={() => { setDelOpen(false); flash('Your deletion request was recorded — you\'ll get an email when processed. Logging in again cancels it.'); }} />}
    </SubScreen>
  );
}

function ChangePasswordSheet({ session, onClose, onDone }) {
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [re, setRe] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = PASS_RULES.every(([, fn]) => fn(nw)) && nw === re && cur;
  const save = async () => {
    setBusy(true);
    try {
      const { error: badCur } = await sb.auth.signInWithPassword({ email: session.user.email, password: cur });
      if (badCur) throw new Error('Current password is incorrect');
      const { error } = await sb.auth.updateUser({ password: nw });
      if (error) throw error;
      onDone();
    } catch (e) { Alert.alert('Change password', e.message); }
    setBusy(false);
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,22,40,.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: T.ink }}>Change password</Text>
            <Pressable onPress={onClose}><Text style={{ fontSize: 18, color: T.ink }}>✕</Text></Pressable>
          </View>
          <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, marginBottom: 12 }}>
            Please enter your current password and choose a new password.
          </Text>
          <TextInput value={cur} onChangeText={setCur} secureTextEntry placeholder="Current password" placeholderTextColor={T.soft} style={s.field} />
          <TextInput value={nw} onChangeText={setNw} secureTextEntry placeholder="New password" placeholderTextColor={T.soft} style={s.field} />
          {nw.length > 0 && PASS_RULES.map(([label, fn]) => (
            <Text key={label} style={{ color: fn(nw) ? '#1F7A40' : T.soft, fontWeight: '600', fontSize: 12.5, marginVertical: 1 }}>
              {fn(nw) ? '✓' : '—'}  {label}
            </Text>
          ))}
          <TextInput value={re} onChangeText={setRe} secureTextEntry placeholder="Retype new password" placeholderTextColor={T.soft} style={[s.field, { marginTop: 8 }]} />
          <Pressable style={[s.btnPrimary, { marginTop: 12, opacity: ok && !busy ? 1 : .5 }]} disabled={!ok || busy} onPress={save}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryTxt}>Save password</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const DEL_REASONS = ['Incompatible device', 'Digital footprint', 'No longer in need (not traveling soon)', 'Poor customer service', 'Bad user experience', 'Other'];

function DeleteAccountSheet({ session, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const submit = async () => {
    await sb.auth.updateUser({ data: { delete_request: { reason, note, at: new Date().toISOString() } } }).catch(() => {});
    Linking.openURL('mailto:hello@mobiyatri.in?subject=Account%20deletion%20request&body=' +
      encodeURIComponent(`Please delete my account (${session?.user?.email}). Reason: ${reason}. ${note}`)).catch(() => {});
    onDone();
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(20,22,40,.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, maxHeight: '88%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: T.ink }}>Delete your account</Text>
            <Pressable onPress={onClose}><Text style={{ fontSize: 18, color: T.ink }}>✕</Text></Pressable>
          </View>
          {step === 1 ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, marginBottom: 12 }}>
                You can delete your account permanently — the process is not immediate and can't be undone after completion.
              </Text>
              {DEL_REASONS.map(r => (
                <Pressable key={r} onPress={() => setReason(r)} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 7 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: reason === r ? 7 : 2, borderColor: reason === r ? T.coral : '#D8CDBB', marginRight: 12 }} />
                  <Text style={{ color: T.ink, fontWeight: '600', fontSize: 14.5, flex: 1 }}>{r}</Text>
                </Pressable>
              ))}
              <TextInput value={note} onChangeText={setNote} placeholder="Additional comments…" placeholderTextColor={T.soft}
                multiline style={[s.field, { height: 110, textAlignVertical: 'top', marginTop: 10 }]} />
              <Pressable style={[s.btnPrimary, { marginTop: 12, opacity: reason ? 1 : .5 }]} disabled={!reason} onPress={() => setStep(2)}>
                <Text style={s.btnPrimaryTxt}>Continue</Text>
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: T.ink, fontWeight: '600', fontSize: 14, lineHeight: 22 }}>
                Before starting, please make sure you understand:{'\n\n'}
                · Your deletion request takes up to 7 days to process{'\n'}
                · Logging back in cancels the deletion{'\n'}
                · Any YatriCash you earned will be lost{'\n'}
                · Your eSIMs and remaining data will be disabled{'\n'}
                · Personal data is removed except what the Privacy Policy requires us to keep{'\n'}
                · Once processed, the account cannot be recovered
              </Text>
              <Pressable style={[s.btnPrimary, { marginTop: 18 }]} onPress={submit}>
                <Text style={s.btnPrimaryTxt}>Delete account</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* Inbox with filter chips + empty states */
const INBOX_TABS = ['All', 'Promotions', 'New features', 'Service updates'];
function InboxModal({ onClose }) {
  const [tab, setTab] = useState('All');
  const [welcome, setWelcome] = useState(true);
  const EMPTY = {
    All: ['📬', "Looks like you're all caught up", 'When you receive messages you\'ll see them here — look out for promotions, new features and service updates.'],
    Promotions: ['🛒', 'Promotions delivered right to you', 'When we have special offers for you, they\'ll appear right here.'],
    'New features': ['✨', 'Fresh features land here first', 'We\'ll tell you when something new arrives in MobiYatri.'],
    'Service updates': ['🛠️', 'No service updates', 'Network or service notices for your eSIMs will appear here.'],
  };
  const [ic, h, sub] = EMPTY[tab];
  return (
    <SubScreen title="Inbox" onClose={onClose}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {INBOX_TABS.map(x => (
          <Pressable key={x} onPress={() => setTab(x)} style={{
            borderWidth: 1.5, borderColor: tab === x ? T.coral : '#DCD1BF', backgroundColor: tab === x ? '#fff' : 'transparent',
            borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18, marginRight: 8,
          }}><Text style={{ color: T.ink, fontWeight: '700', fontSize: 13.5 }}>{x}</Text></Pressable>
        ))}
      </ScrollView>
      {welcome && tab === 'All' ? (
        <View style={[s.card, { alignItems: 'center', padding: 26 }]}>
          <Text style={{ fontSize: 44 }}>💌</Text>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 19, marginTop: 10 }}>Welcome to your inbox</Text>
          <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, textAlign: 'center', marginTop: 6 }}>
            You'll find info on promotions, new features and service updates.
          </Text>
          <Pressable style={[s.btnPrimary, { alignSelf: 'stretch', marginTop: 14 }]} onPress={() => setWelcome(false)}>
            <Text style={s.btnPrimaryTxt}>OK, I got it</Text></Pressable>
        </View>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 44 }}>{ic}</Text>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 18, marginTop: 12, textAlign: 'center' }}>{h}</Text>
          <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, textAlign: 'center', marginTop: 6, paddingHorizontal: 12 }}>{sub}</Text>
        </View>
      )}
    </SubScreen>
  );
}

/* Notification preferences: per-category cards + push/email sheet */
const NOTIF_CATS = [
  ['offers', 'Promotions and offers', "Don't miss out on sales and discounts"],
  ['loyalty', 'Loyalty and rewards', 'Keep track of YatriCash and referrals'],
  ['product', 'Product improvements', 'Stay up-to-date and give feedback'],
  ['travel', 'Travel inspiration', 'Get tips to plan your next trip'],
];
function NotifyModal({ session, onClose }) {
  const [prefs, setPrefs] = useState(() => (session?.user?.user_metadata?.notify_channels) || {});
  const [sheet, setSheet] = useState(null);
  const isOn = k => prefs[k]?.push !== false || prefs[k]?.email !== false;
  const save = async next => {
    setPrefs(next);
    await sb.auth.updateUser({ data: { notify_channels: next } }).catch(() => {});
  };
  return (
    <SubScreen title="Notification preferences" onClose={onClose}>
      {NOTIF_CATS.map(([k, title, sub]) => (
        <Pressable key={k} onPress={() => setSheet(k)} style={[s.card, { marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row' }}>
            <Text style={{ flex: 1, color: T.ink, fontWeight: '800', fontSize: 16.5 }}>{title}</Text>
            <Text style={{ color: T.soft }}>ⓘ</Text>
          </View>
          <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, marginTop: 4, borderBottomWidth: 1, borderColor: T.line, paddingBottom: 12 }}>{sub}</Text>
          <View style={{ alignSelf: 'flex-start', backgroundColor: isOn(k) ? T.mint : T.bgDeep, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 }}>
            <Text style={{ color: isOn(k) ? T.mintInk : T.soft, fontWeight: '800', fontSize: 13 }}>● {isOn(k) ? 'On' : 'Off'}</Text>
          </View>
        </Pressable>
      ))}
      {sheet && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSheet(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(20,22,40,.45)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ flex: 1, fontSize: 19, fontWeight: '800', color: T.ink }}>{NOTIF_CATS.find(c => c[0] === sheet)[1]}</Text>
                <Pressable onPress={() => setSheet(null)}><Text style={{ fontSize: 18, color: T.ink }}>✕</Text></Pressable>
              </View>
              <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, marginBottom: 14 }}>{NOTIF_CATS.find(c => c[0] === sheet)[2]}.</Text>
              {[['push', 'Push notifications'], ['email', 'Email']].map(([ch, label]) => {
                const on = prefs[sheet]?.[ch] !== false;
                return (
                  <View key={ch} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 15, marginBottom: 8 }}>
                    <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 15 }}>{label}</Text>
                    <Pressable onPress={() => save({ ...prefs, [sheet]: { ...prefs[sheet], [ch]: !on } })} style={{
                      width: 48, height: 28, borderRadius: 999, padding: 3, backgroundColor: on ? T.coral : '#DCD1BF',
                      alignItems: on ? 'flex-end' : 'flex-start', justifyContent: 'center',
                    }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' }} /></Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        </Modal>
      )}
    </SubScreen>
  );
}

/* Trusted devices + Loyalty + Orders */
function DevicesModal({ session, onClose }) {
  return (
    <SubScreen title="Trusted devices" onClose={onClose}>
      <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, lineHeight: 20, marginBottom: 14 }}>
        The following devices are signed in to your account. If you don't recognise one, change your password to secure your account.
      </Text>
      <View style={s.card}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: '#CBE6F2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10 }}>
          <Text style={{ color: '#1B5A78', fontWeight: '800', fontSize: 12.5 }}>ⓘ Current device</Text>
        </View>
        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 16 }}>📱 This {Platform.OS === 'ios' ? 'iPhone' : 'Android'} ({Platform.OS} {Platform.Version})</Text>
        <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5, marginTop: 4 }}>
          Signed in since {session ? new Date(session.user.last_sign_in_at || session.user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </Text>
      </View>
    </SubScreen>
  );
}

function LoyaltyModal({ ordersCount, onClose }) {
  return (
    <SubScreen title="Loyalty and YatriCash" onClose={onClose}>
      <View style={[s.card, { backgroundColor: T.indigoDark }]}>
        <Text style={{ color: '#A9ACC9', fontWeight: '700', fontSize: 12.5 }}>YATRICASH BALANCE · PREVIEW</Text>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 36, marginTop: 4 }}>₹0</Text>
        <Text style={{ color: '#A9ACC9', fontWeight: '500', fontSize: 12.5, marginTop: 6 }}>
          Earn ₹150 per referral and trip cashback — redeemable when payments launch.
        </Text>
      </View>
      <View style={[s.card, { marginTop: 12 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 14.5 }}>Yatri tier</Text>
          <Text style={{ color: T.soft, fontWeight: '700', fontSize: 13 }}>{ordersCount}/3 trips to Musafir</Text>
        </View>
        <View style={{ height: 9, backgroundColor: T.bgDeep, borderRadius: 5, marginTop: 10, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: Math.min(100, ordersCount / 3 * 100) + '%', backgroundColor: T.coral, borderRadius: 5 }} />
        </View>
        <Text style={{ color: T.soft, fontWeight: '500', fontSize: 12.5, marginTop: 10 }}>
          Musafir unlocks priority support and launch-day cashback boosts. Program preview — details may change.
        </Text>
      </View>
    </SubScreen>
  );
}

function OrdersModal({ orders, countries, onClose }) {
  const [sel, setSel] = useState(null);
  return (
    <SubScreen title="Orders" onClose={onClose}>
      {orders === null && <ActivityIndicator color={T.indigo} />}
      {orders && orders.length === 0 && (
        <Text style={{ color: T.soft, fontWeight: '600' }}>After your first purchase, your orders will show up here — explore the store to get started.</Text>
      )}
      {(orders || []).map((o, i) => {
        const c = countries.find(x => x.n === o.country_name);
        return (
          <Pressable key={i} onPress={() => setSel(o)} style={[s.card, { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            {c?.iso ? <Image source={{ uri: flagUrl(c.iso) }} style={s.flag} /> : <RegionBadge kind={regionKind(c||{})} size={44} />}
            <View style={{ flex: 1 }}>
              <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>{o.country_name} / eSIM</Text>
              <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5, marginTop: 2 }}>{o.package_label}</Text>
              <Text style={{ color: T.soft, fontWeight: '600', fontSize: 11.5, marginTop: 2 }}>{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              <Text style={{ color: T.ink, fontWeight: '800', fontSize: 14.5, marginTop: 4 }}>₹{o.price_inr}</Text>
            </View>
            <Text style={{ color: '#B8AE9C', fontSize: 18 }}>›</Text>
          </Pressable>
        );
      })}
      {sel && <OrderDetailsModal order={sel} countries={countries} onClose={() => setSel(null)} />}
    </SubScreen>
  );
}

/* Saved cards — honest empty state until payments launch */
function SavedCardsModal({ onClose }) {
  return (
    <SubScreen title="Saved cards" onClose={onClose}>
      <Text style={{ color: T.ink, fontWeight: '600', fontSize: 15, lineHeight: 22 }}>
        When you add a new card, you'll see your saved card details here.
      </Text>
      <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13, lineHeight: 19, marginTop: 10 }}>
        Card saving arrives with the Razorpay payments launch. MobiYatri never stores card numbers itself — they stay with the PCI-certified payment provider.
      </Text>
      <Pressable style={[s.btnPrimary, { marginTop: 20, opacity: .55 }]}
        onPress={() => Alert.alert('Add new card', 'Available once payments launch with Razorpay.')}>
        <Text style={s.btnPrimaryTxt}>Add new card</Text>
      </Pressable>
    </SubScreen>
  );
}

/* Currency — INR-first list, other currencies arrive with payments */
const CURRENCIES = [['INR', 'Indian rupee (INR) ₹'], ['USD', 'United States dollar (USD) $'], ['AED', 'UAE dirham (AED)'],
  ['GBP', 'Pound sterling (GBP) £'], ['EUR', 'Euro (EUR) €'], ['SGD', 'Singapore dollar (SGD) S$'],
  ['AUD', 'Australian dollar (AUD) $'], ['JPY', 'Japanese yen (JPY) ¥']];
function CurrencyModal({ onClose }) {
  const [q, setQ] = useState('');
  const list = CURRENCIES.filter(([, l]) => l.toLowerCase().includes(q.toLowerCase()));
  return (
    <SubScreen title="Currency" onClose={onClose}>
      <TextInput value={q} onChangeText={setQ} placeholder="Search by currency" placeholderTextColor={T.soft} style={s.field} />
      {list.map(([code, label]) => (
        <Pressable key={code} onPress={() => code !== 'INR' &&
          Alert.alert(`Change to ${label}?`, 'Prices are shown in Indian rupees during the beta — more display currencies arrive with the payments launch.')}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderColor: T.line }}>
          <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 15.5 }}>{label}</Text>
          {code === 'INR' && <Text style={{ color: T.ink, fontWeight: '800' }}>✓</Text>}
        </Pressable>
      ))}
    </SubScreen>
  );
}

/* Order details + refund request flow */
const REFUND_REASONS = [
  ['🛍️', 'Wrong purchase', 'I wanted a different destination or package.'],
  ['📅', 'Plans changed', "I don't need the eSIM or package anymore."],
  ['📱', 'Installation issues', 'I had trouble adding the eSIM to my device.'],
  ['⇅', 'eSIM not working', 'I had trouble using my data.'],
];
function OrderDetailsModal({ order, countries, onClose }) {
  const [refund, setRefund] = useState(null);   // reason row
  const [sent, setSent] = useState(false);
  const [banner, setBanner] = useState(null);
  const c = countries.find(x => x.n === order.country_name);
  const parts = (order.package_label || '— · —').split(' · ');
  const tile = (k, v) => (
    <View style={[s.stat, { marginBottom: 8 }]}><Text style={s.statK}>{k}</Text><Text style={s.statV}>{v}</Text></View>
  );
  const submitRefund = async () => {
    await sb.auth.updateUser({ data: { refund_request: { order: order.order_reference, reason: refund[1], at: new Date().toISOString() } } }).catch(() => {});
    Linking.openURL('mailto:hello@mobiyatri.in?subject=' + encodeURIComponent('Refund request ' + (order.order_reference || '')) +
      '&body=' + encodeURIComponent(`Order: ${order.order_reference}\nReason: ${refund[1]} — ${refund[2]}`)).catch(() => {});
    setSent(true);
  };
  return (
    <SubScreen title="Order details" onClose={onClose} banner={banner}>
      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 17, marginBottom: 10 }}>Order information</Text>
        {tile('Order ID', '#' + (order.order_reference || '—'))}
        {tile('Order date', new Date(order.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}
        <View style={{ alignSelf: 'flex-start', backgroundColor: T.mint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
          <Text style={{ color: T.mintInk, fontWeight: '800', fontSize: 13 }}>✓ Completed</Text>
        </View>
        <Pressable style={[s.btnOutlineLight, { marginTop: 12 }]}
          onPress={() => setBanner('Your receipt was emailed with the QR at purchase — need another copy? Ask Yatri Sahayak.') || setTimeout(() => setBanner(null), 3400)}>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>View receipt</Text>
        </Pressable>
      </View>
      <View style={[s.card, { marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: T.line, paddingBottom: 10, marginBottom: 10 }}>
          {c?.iso ? <Image source={{ uri: flagUrl(c.iso) }} style={s.flag} /> : <RegionBadge kind={regionKind(c||{})} size={44} />}
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 17 }}>{order.country_name}</Text>
        </View>
        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 14.5, marginBottom: 8 }}>Package</Text>
        {tile('📍 Coverage', order.country_name)}
        {tile('⇅ Data', parts[0])}
        {tile('📅 Validity', parts[1] || '—')}
      </View>
      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 17 }}>Payment details</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <Text style={{ color: T.soft, fontWeight: '700' }}>Payment method</Text>
          <Text style={{ color: T.ink, fontWeight: '700' }}>Beta — no charge</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderColor: T.line, paddingTop: 8 }}>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 16 }}>Total</Text>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 16 }}>₹{order.price_inr}</Text>
        </View>
      </View>
      <Pressable onPress={() => setRefund(REFUND_REASONS[0])} style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <Text style={{ fontSize: 22 }}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15.5 }}>Request refund</Text>
          <Text style={{ color: T.soft, fontWeight: '600', fontSize: 12.5 }}>Get help for your order.</Text>
        </View>
        <Text style={{ color: '#B8AE9C', fontSize: 18 }}>›</Text>
      </Pressable>

      {refund && (
        <Modal visible transparent animationType="slide" onRequestClose={() => { setRefund(null); setSent(false); }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(20,22,40,.45)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: T.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, maxHeight: '88%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: T.ink }}>{sent ? 'Request sent' : 'Request refund'}</Text>
                <Pressable onPress={() => { setRefund(null); setSent(false); }}><Text style={{ fontSize: 18, color: T.ink }}>✕</Text></Pressable>
              </View>
              {sent ? (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: T.mint, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 32 }}>✓</Text>
                  </View>
                  <Text style={{ color: T.ink, fontWeight: '800', fontSize: 19, marginTop: 12, textAlign: 'center' }}>Your refund request was submitted</Text>
                  <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                    Support reviews it within a few hours — refunds are credited as YatriCash or a replacement eSIM. You can also chat with Yatri Sahayak any time.
                  </Text>
                  <Pressable style={[s.btnPrimary, { alignSelf: 'stretch', marginTop: 16 }]} onPress={() => { setRefund(null); setSent(false); }}>
                    <Text style={s.btnPrimaryTxt}>OK, I got it</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, marginBottom: 10 }}>
                    Choose a reason — we may be able to refund your order or offer a replacement.
                  </Text>
                  {REFUND_REASONS.map(r => (
                    <Pressable key={r[1]} onPress={() => setRefund(r)}
                      style={[s.card, { marginBottom: 10, flexDirection: 'row', gap: 12, borderWidth: 2, borderColor: refund[1] === r[1] ? T.indigo : 'transparent' }]}>
                      <Text style={{ fontSize: 20 }}>{r[0]}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>{r[1]}</Text>
                        <Text style={{ color: T.soft, fontWeight: '500', fontSize: 12.5 }}>{r[2]}</Text>
                      </View>
                    </Pressable>
                  ))}
                  <View style={{ backgroundColor: '#FFF3D9', borderWidth: 1.5, borderColor: '#E8B04B', borderRadius: 14, padding: 13, marginTop: 4 }}>
                    <Text style={{ color: '#7A4B00', fontWeight: '700', fontSize: 13.5 }}>
                      🪙 Refund amount (as YatriCash): ₹{order.price_inr}
                    </Text>
                  </View>
                  <Pressable style={[s.btnPrimary, { marginTop: 14 }]} onPress={submitRefund}>
                    <Text style={s.btnPrimaryTxt}>Apply refund</Text>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SubScreen>
  );
}

function Profile({ session, countries = [], onAuth, onLogout, onChat }) {
  const name = session ? ((session.user.user_metadata && session.user.user_metadata.full_name) || session.user.email) : 'Guest';
  const [modal, setModal] = useState(null);
  const [orders, setOrders] = useState(null);
  const [refCode, setRefCode] = useState(null);
  useEffect(() => {
    if (!session) return;
    sb.from('orders').select('order_reference,country_name,package_label,price_inr,created_at')
      .order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []));
    sb.from('profiles').select('referral_code').eq('id', session.user.id).single()
      .then(({ data }) => setRefCode(data?.referral_code || null));
  }, [session]);
  const need = fn => (session ? fn : onAuth);
  const MENU1 = [
    ['Account information', need(() => setModal('account'))],
    ['Inbox', need(() => setModal('inbox'))],
    ['Loyalty and YatriCash', need(() => setModal('loyalty'))],
    ['Notification preferences', need(() => setModal('notify'))],
    ['Trusted devices', need(() => setModal('devices'))],
    ['Saved cards', need(() => setModal('cards'))],
    ['Refer and earn', need(() => refCode && shareOrCopy(`Use my code ${refCode} for a discount on your first MobiYatri travel eSIM — mobiyatri.in`, 'Invite copied — paste it to your friends.'))],
    ['Orders', need(() => setModal('orders'))],
    ['MobiYatri for Business', () => Linking.openURL('mailto:hello@mobiyatri.in?subject=MobiYatri%20for%20Business')],
  ];
  const MENU2 = [
    ['Languages', () => Alert.alert('Languages', 'English + हिन्दी support everywhere. Full app translation is on the roadmap.')],
    ['Currency: Indian rupee (INR) ₹', () => setModal('currency')],
    ['Help center', onChat],
    ['More info', () => Linking.openURL('https://mobiyatri.in')],
  ];
  const Row = ({ label, fn, last }) => (
    <Pressable onPress={fn || undefined} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: last ? 0 : 1, borderColor: T.line }}>
      <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 15.5 }}>{label}</Text>
      {fn ? <Text style={{ color: '#B8AE9C', fontSize: 18 }}>›</Text> : null}
    </Pressable>
  );
  return (
    <View style={s.fill}>
      <ScrollView style={s.fill} contentContainerStyle={{ padding: 16, paddingTop: TOPPAD, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 24, fontWeight: '800', color: T.ink }}>Profile</Text>
          <View style={{ backgroundColor: T.mint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ color: T.mintInk, fontWeight: '800', fontSize: 13 }}>₹0.00</Text>
          </View>
        </View>
        {session && (
          <Pressable onPress={() => refCode && shareOrCopy(`Use my code ${refCode} for a discount on your first MobiYatri travel eSIM — mobiyatri.in`, 'Invite copied — paste it to your friends.')}
            style={[s.card, { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            <Text style={{ fontSize: 20 }}>🪙</Text>
            <Text style={{ flex: 1, color: T.ink, fontWeight: '700', fontSize: 14 }}>Get ₹150 YatriCash for each referral</Text>
            <Text style={{ color: T.ink, fontWeight: '800' }}>›</Text>
          </Pressable>
        )}
        <View style={[s.card, { marginTop: 14, padding: 18 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <View style={s.avatar}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{(name[0] || 'G').toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: 19, color: T.ink }}>{name}</Text>
              {session
                ? <Text style={{ color: T.soft, fontWeight: '600', fontSize: 13 }}>Yatri · member since {new Date(session.user.created_at).getFullYear()}</Text>
                : <Pressable onPress={onAuth}><Text style={{ color: T.coral, fontWeight: '700', fontSize: 13.5 }}>Sign in / create account</Text></Pressable>}
            </View>
          </View>
          {MENU1.map(([lb, fn], i) => <Row key={lb} label={lb} fn={fn} last={i === MENU1.length - 1} />)}
        </View>
        <View style={[s.card, { marginTop: 14, padding: 18, paddingVertical: 4 }]}>
          {MENU2.map(([lb, fn], i) => <Row key={lb} label={lb} fn={fn} last={i === MENU2.length - 1} />)}
        </View>
        {session ? (
          <Pressable style={[s.btnOutlineLight, { marginTop: 18 }]} onPress={() => setModal('logout')}>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15.5 }}>Log out</Text>
          </Pressable>
        ) : null}
        <Text style={{ textAlign: 'center', color: T.soft, fontSize: 11.5, fontWeight: '600', marginTop: 18 }}>
          MobiYatri v1.2 · Made in India with ❤️ · शुभ यात्रा
        </Text>
      </ScrollView>
      <ConfirmDialog open={modal === 'logout'} title="Are you sure you want to log out?"
        onCancel={() => setModal(null)} onConfirm={() => { setModal(null); onLogout(); }} />
      {modal === 'account' && <AccountModal session={session} onClose={() => setModal(null)} />}
      {modal === 'inbox' && <InboxModal onClose={() => setModal(null)} />}
      {modal === 'loyalty' && <LoyaltyModal ordersCount={(orders || []).length} onClose={() => setModal(null)} />}
      {modal === 'notify' && <NotifyModal session={session} onClose={() => setModal(null)} />}
      {modal === 'devices' && <DevicesModal session={session} onClose={() => setModal(null)} />}
      {modal === 'orders' && <OrdersModal orders={orders} countries={countries} onClose={() => setModal(null)} />}
      {modal === 'cards' && <SavedCardsModal onClose={() => setModal(null)} />}
      {modal === 'currency' && <CurrencyModal onClose={() => setModal(null)} />}
    </View>
  );
}

/* ================= modals ================= */
const PASS_RULES = [
  ['Minimum 8 characters', p => p.length >= 8],
  ['Uppercase', p => /[A-Z]/.test(p)],
  ['Lowercase', p => /[a-z]/.test(p)],
  ['Numbers 1234567890', p => /\d/.test(p)],
  ['A symbol +-*/=?:!%$#', p => /[^A-Za-z0-9]/.test(p)],
];

function AuthModal({ open, onClose, onDone }) {
  const [mode, setMode] = useState('signup');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [promos, setPromos] = useState(false);
  const [busy, setBusy] = useState(false);
  const rulesOk = PASS_RULES.every(([, fn]) => fn(pass));
  const canGo = mode === 'login' ? (email && pass) : (first && email && rulesOk);

  const [stage, setStage] = useState('form');   // form | verify
  const [code, setCode] = useState('');
  const codeRef = useRef(null);

  const go = async () => {
    if (!canGo) return;
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email, password: pass,
          options: { data: { full_name: (first + ' ' + last).trim(), referred_by: refCode || null, notify_prefs: { offers: promos } } },
        });
        if (error) throw error;
        if (!data.session) { setCode(''); setStage('verify'); setBusy(false); return; } // confirm-email ON → code sent
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) {
          if (/confirm/i.test(error.message)) {
            sb.auth.resend({ type: 'signup', email }).catch(() => {});
            setCode(''); setStage('verify'); setBusy(false); return;
          }
          throw error;
        }
      }
      onDone();
    } catch (e) { Alert.alert('Account', e.message || 'Something went wrong'); }
    setBusy(false);
  };

  const verifyCode = async () => {
    setBusy(true);
    try {
      const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: 'signup' });
      if (error) throw error;
      onDone();
    } catch (e) { Alert.alert('Verification', e.message || 'Wrong or expired code'); }
    setBusy(false);
  };

  const resendCode = async () => {
    const { error } = await sb.auth.resend({ type: 'signup', email });
    Alert.alert('Verification', error ? error.message : 'Code re-sent — check your email.');
  };

  const forgot = async () => {
    if (!email) return Alert.alert('Forgot password', 'Type your email above first, then tap again.');
    const { error } = await sb.auth.resetPasswordForEmail(email);
    Alert.alert('Forgot password', error ? error.message : 'Reset link sent — check your email.');
  };

  const eye = (
    <Pressable onPress={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 14, top: 15 }}>
      <Text style={{ fontSize: 16, opacity: .6 }}>{showPass ? '🙈' : '👁'}</Text>
    </Pressable>
  );

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.fill, { paddingTop: TOPPAD }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onClose} style={{
            alignSelf: 'flex-end', width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff',
            alignItems: 'center', justifyContent: 'center', elevation: 2,
          }}><Text style={{ fontSize: 16, color: T.ink }}>✕</Text></Pressable>

          {stage === 'verify' ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ alignSelf: 'flex-start', fontSize: 19, fontWeight: '800', color: T.ink, marginBottom: 16 }}>Enter verification code</Text>
              <PhoneTravellerScene width={150} />
              <Text style={{ color: T.soft, fontWeight: '600', fontSize: 13.5, textAlign: 'center', marginTop: 16, lineHeight: 20 }}>
                Your verification code was sent to <Text style={{ color: T.ink, fontWeight: '800' }}>{email}</Text> — enter the 6-digit code to complete verification.
              </Text>
              <Pressable onPress={() => codeRef.current && codeRef.current.focus()} style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <View key={i} style={{
                    width: 44, height: 52, borderRadius: 10, borderWidth: 1.5, backgroundColor: '#fff',
                    borderColor: code.length === i ? T.coral : '#E0D5C3', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: T.ink }}>{code[i] || ''}</Text>
                  </View>
                ))}
              </Pressable>
              <TextInput ref={codeRef} value={code} autoFocus keyboardType="number-pad"
                onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
                style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }} />
              <Pressable onPress={resendCode} style={{ borderWidth: 1.5, borderColor: '#E0D5C3', backgroundColor: '#fff', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 26, marginTop: 18 }}>
                <Text style={{ fontWeight: '800', fontSize: 13.5, color: T.ink }}>Resend code</Text>
              </Pressable>
              <Pressable style={[s.btnPrimary, { alignSelf: 'stretch', marginTop: 22, opacity: code.length === 6 ? 1 : .5 }]}
                disabled={busy || code.length !== 6} onPress={verifyCode}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryTxt}>Enter code</Text>}
              </Pressable>
              <Pressable onPress={() => setStage('form')} style={{ marginTop: 14 }}>
                <Text style={{ color: T.soft, fontWeight: '700', fontSize: 13 }}>← Back</Text>
              </Pressable>
            </View>
          ) : (<>
          {/* tabs */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1.5, borderColor: T.line, marginBottom: 18 }}>
            {[['login', 'Log in'], ['signup', 'Sign up']].map(([k, lb]) => (
              <Pressable key={k} onPress={() => setMode(k)} style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2.5, borderColor: mode === k ? T.ink : 'transparent' }}>
                <Text style={{ fontWeight: '800', fontSize: 15.5, color: mode === k ? T.ink : T.soft }}>{lb}</Text>
              </Pressable>
            ))}
          </View>

          {/* social row — Apple / Google / Facebook (wired with the store build; email works today) */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[
              ['Apple', <Svg key="a" width={22} height={22} viewBox="0 0 24 24">
                <Path d="M16.7 12.9c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.85-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.4 1.2-.05 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.77 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.03-.01-2.5-1-2.5-3.9zM14.4 5.6c.7-.8 1.1-1.9 1-3-1 .04-2.1.65-2.8 1.4-.6.7-1.2 1.9-1 3 1.1.1 2.2-.55 2.8-1.4z" fill="#111" />
              </Svg>],
              ['Google', <Svg key="g" width={22} height={22} viewBox="0 0 48 48">
                <Path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <Path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 42.6 44 38 44 24c0-1.3-.1-2.6-.4-3.9z" />
              </Svg>],
              ['Facebook', <Svg key="f" width={22} height={22} viewBox="0 0 24 24">
                <Circle cx="12" cy="12" r="10" fill="#1877F2" />
                <Path d="M13.3 21v-8h2.6l.4-3h-3V8.1c0-.9.3-1.5 1.6-1.5H16V3.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.2v3h2.6v8z" fill="#fff" />
              </Svg>],
            ].map(([name, icon]) => (
              <Pressable key={name}
                onPress={async () => {
                  if (name !== 'Google') {
                    return Alert.alert(name + ' sign-in', 'Coming with the app-store build — please use email for now.');
                  }
                  try { setBusy(true); await googleSignIn(); onDone(); }
                  catch (e) { Alert.alert('Google sign-in', e.message || 'Could not sign in'); }
                  finally { setBusy(false); }
                }}
                style={{
                  flex: 1, borderWidth: 1.5, borderColor: '#E0D5C3', backgroundColor: '#fff',
                  borderRadius: 999, paddingVertical: 13, alignItems: 'center',
                }}>
                {icon}
              </Pressable>
            ))}
          </View>

          {mode === 'signup' && (
            <>
              <TextInput style={s.field} placeholder="First name" placeholderTextColor={T.soft} value={first} onChangeText={setFirst} />
              <TextInput style={s.field} placeholder="Last name (Optional)" placeholderTextColor={T.soft} value={last} onChangeText={setLast} />
            </>
          )}
          <TextInput style={s.field} placeholder="Email" placeholderTextColor={T.soft} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <View>
            <TextInput style={s.field} placeholder="Password" placeholderTextColor={T.soft} secureTextEntry={!showPass} value={pass} onChangeText={setPass} />
            {eye}
          </View>

          {mode === 'login' ? (
            <Pressable onPress={forgot}><Text style={{ fontWeight: '800', fontSize: 13.5, color: T.ink, marginBottom: 14 }}>Forgot password</Text></Pressable>
          ) : (
            <>
              <View style={{ marginBottom: 12 }}>
                {PASS_RULES.map(([label, fn]) => {
                  const ok = fn(pass);
                  return (
                    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                      <Text style={{ width: 20, color: ok ? '#1F7A40' : T.soft, fontWeight: '800', fontSize: 12.5 }}>{ok ? '✓' : '—'}</Text>
                      <Text style={{ color: ok ? '#1F7A40' : T.soft, fontWeight: '600', fontSize: 12.5 }}>{label}</Text>
                    </View>
                  );
                })}
              </View>
              <TextInput style={s.field} placeholder="Referral or voucher code" placeholderTextColor={T.soft} autoCapitalize="none" value={refCode} onChangeText={setRefCode} />
              <Pressable onPress={() => setPromos(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: promos ? T.indigo : '#D8CDBB',
                  backgroundColor: promos ? T.indigo : '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10,
                }}>{promos ? <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text> : null}</View>
                <Text style={{ flex: 1, color: T.soft, fontWeight: '600', fontSize: 12.5 }}>Send me promotions, product updates and new destination alerts</Text>
              </Pressable>
            </>
          )}

          <Pressable style={[s.btnPrimary, { opacity: canGo ? 1 : .5 }]} onPress={go} disabled={busy || !canGo}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryTxt}>{mode === 'signup' ? 'Agree and sign up' : 'Log in'}</Text>}
          </Pressable>
          <Text style={{ color: T.soft, fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: 14 }}>
            By continuing you agree to the Terms and Privacy Policy (mobiyatri.in).
          </Text>
          </>)}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InstallModal({ open, esim, onClose }) {
  const [done, setDone] = useState(false);
  const [verified, setVerified] = useState(false);
  useEffect(() => { if (open) { setDone(false); setVerified(false); } }, [open]);
  // after handoff to the system installer, poll the SM-DP+ status until the
  // network confirms the profile is actually on the phone
  useEffect(() => {
    if (!open || !done || verified || !esim?.iccid) return;
    const t = setInterval(() => {
      fetch(API + '/api/esim-status?iccid=' + esim.iccid).then(r => r.json()).then(d => {
        if (d.live && (d.smdpStatus === 'ENABLED' || d.esimStatus === 'IN_USE')) setVerified(true);
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [open, done, verified, esim && esim.iccid]);
  const lpa = esim && (esim.lpa_string || esim.lpa);
  const qr = lpa ? 'https://api.qrserver.com/v1/create-qr-code/?size=520x520&data=' + encodeURIComponent(lpa) : null;
  const oneTap = lpa ? 'https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=' + encodeURIComponent(lpa) : null;
  const start = async () => {
    if (Platform.OS === 'ios' && oneTap) {
      // iOS 17.4+: opens the native eSIM install sheet directly
      Linking.openURL(oneTap); setDone(true); return;
    }
    if (Platform.OS === 'android' && lpa) {
      // Android 9+: launch the system eSIM installer with the activation code pre-filled
      try {
        await Linking.sendIntent('android.telephony.euicc.action.START_EUICC_ACTIVATION', [
          { key: 'android.telephony.euicc.extra.ACTIVATION_CODE', value: lpa },
        ]);
        setDone(true); return;
      } catch (e) {
        try { await shareOrCopy(lpa, 'Activation code copied.'); } catch (_) {}
        setDone(true); return;
      }
    }
    if (lpa) shareOrCopy(lpa, 'Activation code copied.');
    setDone(true);
  };
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={s.fill} contentContainerStyle={{ padding: 22, paddingTop: TOPPAD, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ flex: 1, fontSize: 21, fontWeight: '800', color: T.ink }}>Install your eSIM</Text>
          <Pressable onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, color: T.ink }}>✕</Text>
          </Pressable>
        </View>

        {done ? (
          <View style={[s.card, { alignItems: 'center', padding: 26 }]}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: T.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 36 }}>✓</Text>
            </View>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 20, marginTop: 14 }}>
              {verified ? 'Your eSIM is installed' : 'Finishing installation…'}
            </Text>
            <Text style={{ color: T.soft, fontWeight: '500', fontSize: 13.5, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              {verified
                ? 'The network confirmed your eSIM is on this phone. Follow the tip below to connect.'
                : 'Complete the steps in your phone\'s installer — this card updates the moment the network confirms the install.'}
            </Text>
            {!verified && <ActivityIndicator color={T.coral} style={{ marginTop: 10 }} />}
            <View style={{ backgroundColor: T.bg, borderWidth: 1, borderColor: T.line, borderRadius: 14, padding: 13, marginTop: 14 }}>
              <Text style={{ color: T.ink, fontWeight: '600', fontSize: 13, lineHeight: 19 }}>
                💡 You can connect once you're in the eSIM's coverage area — switch on its data roaming when you land.
              </Text>
            </View>
            <Pressable style={[s.btnPrimary, { alignSelf: 'stretch', marginTop: 16 }]} onPress={onClose}>
              <Text style={s.btnPrimaryTxt}>OK, I got it</Text>
            </Pressable>
            <Pressable style={[s.btnOutlineLight, { alignSelf: 'stretch', marginTop: 10 }]} onPress={() => setDone(false)}>
              <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>How to connect</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {qr ? <Image source={{ uri: qr }} style={{ width: 200, height: 200, alignSelf: 'center', borderRadius: 14, backgroundColor: '#fff' }} /> : null}
            {esim && esim.iccid ? <Text style={{ textAlign: 'center', color: T.soft, fontWeight: '600', fontSize: 12, marginTop: 10 }}>ICCID {esim.iccid}</Text> : null}
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15.5, marginTop: 18 }}>
              You can install the eSIM directly on this device — it usually takes a few minutes.
            </Text>
            <Text style={{ color: T.ink, fontWeight: '800', fontSize: 14.5, marginTop: 14, marginBottom: 6 }}>To avoid installation and setup issues…</Text>
            {[['📶', 'Stay connected to the internet'], ['🚫', "Don't exit or interrupt the installation"],
              ['✏️', 'Give your new eSIM a unique label'], ['⇅', 'Choose the new eSIM for mobile data'],
              ['🇮🇳', 'Keep data roaming OFF on your Indian SIM']].map(([ic, t]) => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                  <Text style={{ width: 30, fontSize: 15 }}>{ic}</Text>
                  <Text style={{ flex: 1, color: T.ink, fontWeight: '600', fontSize: 14.5 }}>{t}</Text>
                </View>
              ))}
            {Platform.OS === 'android' && lpa ? (
              <View style={[s.card, { marginTop: 12 }]}>
                <Text style={{ fontWeight: '700', color: T.ink, fontSize: 13 }}>
                  Tapping Start opens your phone's own eSIM installer with the code pre-filled. Fallback: scan the QR or paste this code in Settings → SIM manager:
                </Text>
                <Text selectable style={{ fontFamily: 'monospace', fontSize: 11.5, color: T.ink, marginTop: 8 }}>{lpa}</Text>
              </View>
            ) : null}
            <Pressable style={[s.btnPrimary, { marginTop: 18 }]} onPress={start}>
              <Text style={s.btnPrimaryTxt}>Start installation</Text>
            </Pressable>
            <Pressable style={[s.btnOutlineLight, { marginTop: 10 }]} onPress={() => lpa && shareOrCopy(lpa, 'Activation code copied.')}>
              <Text style={{ color: T.ink, fontWeight: '800', fontSize: 15 }}>Share and more</Text>
            </Pressable>
          </>
        )}
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
          showsVerticalScrollIndicator={false}
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
  card: { backgroundColor: T.card, borderRadius: 20, padding: 16, shadowColor: '#5A4A32', shadowOpacity: 0.10, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  search: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, fontWeight: '600', color: T.ink, marginBottom: 14, elevation: 2, shadowColor: '#2A2C4A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  promo: { backgroundColor: T.indigoDark, borderRadius: 20, padding: 18, marginBottom: 14 },
  svcgrid: { backgroundColor: '#fff', borderRadius: 20, flexDirection: 'row', paddingVertical: 14, marginBottom: 14, elevation: 2, shadowColor: '#2A2C4A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  svc: { flex: 1, alignItems: 'center', gap: 6 },
  svcIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: T.tint, alignItems: 'center', justifyContent: 'center' },
  svcLbl: { fontSize: 11.5, fontWeight: '700', color: T.ink },
  crow: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 15, elevation: 2, shadowColor: '#2A2C4A', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2, shadowColor: '#5A4A32', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 } },
  flag: { width: 48, height: 34, borderRadius: 7, backgroundColor: '#EFE7D9' },
  fab: { position: 'absolute', right: 16, bottom: 100, width: 54, height: 54, borderRadius: 27, backgroundColor: T.coral, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: T.coral, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  tabbar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.98)', borderTopWidth: 1, borderColor: T.line, paddingTop: 8, paddingBottom: 24, shadowColor: '#5A4A32', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
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
  btnOutlineLight: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0D5C3', borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
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
