import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

// ─── Theme Context ─────────────────────────────────────────────────────────────
export const ThemeContext = createContext({ theme: 'dark', setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Idle Timeout Config ──────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS  = 15 * 60 * 1000;
const WARN_BEFORE_MS   = 2  * 60 * 1000;

function IdleWarning({ secondsLeft, onStay, onLogout }) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = mins > 0 ? `${mins}m ${String(secs).padStart(2,'0')}s` : `${secs}s`;
  const urgent = secondsLeft <= 30;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'var(--bg-2)', border: `2px solid ${urgent ? 'var(--red)' : 'var(--accent)'}`, borderRadius: 'var(--radius-lg)', padding: '32px 36px', maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏱️</div>
        <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: 18 }}>Session Expiring Soon</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>You've been inactive. Auto-logout in:</p>
        <div style={{ fontSize: 36, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: urgent ? 'var(--red)' : 'var(--accent)', marginBottom: 24, letterSpacing: 2 }}>{display}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={onLogout} style={{ padding: '10px 22px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>Logout Now</button>
          <button onClick={onStay} style={{ padding: '10px 24px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✓ Stay Logged In</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('user');
    if (token && user) return { token, user: JSON.parse(user) };
    return null;
  });
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('isGuest') === 'true');

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'dark');

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
  };

  // Apply theme CSS vars to :root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.style.setProperty('--bg', '#f5f6fa');
      root.style.setProperty('--bg-2', '#ffffff');
      root.style.setProperty('--bg-3', '#eef0f5');
      root.style.setProperty('--bg-4', '#e2e5ee');
      root.style.setProperty('--border', '#d0d3de');
      root.style.setProperty('--border-2', '#b8bccb');
      root.style.setProperty('--text-primary', '#1a1d28');
      root.style.setProperty('--text-secondary', '#4a5068');
      root.style.setProperty('--text-muted', '#8890a4');
      root.style.setProperty('--shadow', '0 4px 24px rgba(0,0,0,0.10)');
      root.style.setProperty('--shadow-lg', '0 8px 48px rgba(0,0,0,0.15)');
    } else {
      root.style.setProperty('--bg', '#0a0c0f');
      root.style.setProperty('--bg-2', '#111318');
      root.style.setProperty('--bg-3', '#1a1d24');
      root.style.setProperty('--bg-4', '#22262f');
      root.style.setProperty('--border', '#2a2e38');
      root.style.setProperty('--border-2', '#363b48');
      root.style.setProperty('--text-primary', '#e8eaf0');
      root.style.setProperty('--text-secondary', '#8890a4');
      root.style.setProperty('--text-muted', '#555d72');
      root.style.setProperty('--shadow', '0 4px 24px rgba(0,0,0,0.4)');
      root.style.setProperty('--shadow-lg', '0 8px 48px rgba(0,0,0,0.6)');
    }
  }, [theme]);

  // ── Idle timeout ──────────────────────────────────────────────────────────
  const [idleWarning, setIdleWarning]   = useState(false);
  const [countdown, setCountdown]       = useState(0);
  const idleTimerRef    = useRef(null);
  const warnTimerRef    = useRef(null);
  const countdownRef    = useRef(null);

  const isLoggedIn = !!auth || isGuest;

  const doLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('isGuest');
    setAuth(null);
    setIsGuest(false);
    setIdleWarning(false);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (!isLoggedIn) return;
    clearTimeout(idleTimerRef.current);
    clearTimeout(warnTimerRef.current);
    clearInterval(countdownRef.current);
    setIdleWarning(false);

    warnTimerRef.current = setTimeout(() => {
      setIdleWarning(true);
      setCountdown(Math.floor(WARN_BEFORE_MS / 1000));
      countdownRef.current = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(countdownRef.current); return 0; } return prev - 1; });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);

    idleTimerRef.current = setTimeout(() => {
      clearInterval(countdownRef.current);
      doLogout();
    }, IDLE_TIMEOUT_MS);
  }, [isLoggedIn, doLogout]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    EVENTS.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimerRef.current);
      clearTimeout(warnTimerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [isLoggedIn, resetIdleTimer]);

  const login = async (username, password) => {
    const res = await API.post('/auth/login', { username, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('isGuest');
    setIsGuest(false);
    setAuth({ token, user });
    return user;
  };

  const loginAsGuest = () => {
    localStorage.setItem('isGuest', 'true');
    setIsGuest(true);
    setAuth(null);
  };

  const logout = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warnTimerRef.current);
    clearInterval(countdownRef.current);
    doLogout();
  }, [doLogout]);

  const stayLoggedIn = () => { resetIdleTimer(); setIdleWarning(false); };

  const role = auth?.user?.role || (isGuest ? 'guest' : null);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <AuthContext.Provider value={{ auth, isGuest, role, login, loginAsGuest, logout, API }}>
        <div className="app">
          {!isLoggedIn ? <Login /> : <Dashboard />}
          {idleWarning && auth && (
            <IdleWarning secondsLeft={countdown} onStay={stayLoggedIn} onLogout={logout} />
          )}
        </div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
