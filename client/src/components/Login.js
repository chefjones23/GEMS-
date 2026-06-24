import React, { useState } from 'react';
import { useAuth } from '../App';

export default function Login() {
  const { login, loginAsGuest } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(form.username.trim(), form.password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Hero Panel ── */}
      <div className="login-hero">
        <div className="hero-tag">Gate Entry Management System</div>
        <h1 className="hero-title">
          WEG<br />Gate<br /><span>Entry</span><br />Control
        </h1>
          <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-num">3</span>
            <span className="hero-stat-label">Access Levels</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">∞</span>
            <span className="hero-stat-label">Entries</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">XLS</span>
            <span className="hero-stat-label">Export</span>
          </div>
        </div>
      </div>

      {/* ── Login Panel ── */}
      <div className="login-panel">
        <div className="login-form-container">
          <h2 className="login-form-title">Sign In</h2>
          <p className="login-form-sub">Enter credentials to access the system</p>

          {error && <div className="error-banner">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? '⏳ Signing in...' : '→ Sign In'}
            </button>

            <button
              type="button"
              className="btn btn-guest btn-full btn-lg"
              onClick={loginAsGuest}
              style={{ marginTop: 12 }}
            >
              👁 Continue as Guest
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
