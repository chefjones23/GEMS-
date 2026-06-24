import React, { useState } from 'react';
import { useAuth } from '../App';

export default function Settings({ addToast, theme, setTheme }) {
  const { auth, API } = useAuth();
  const [activeSection, setActiveSection] = useState('appearance');

  // ── Change Credentials State ──────────────────────────────────
  const [credForm, setCredForm] = useState({ currentPassword: '', newUsername: '', newPassword: '', confirmPassword: '' });
  const [credLoading, setCredLoading] = useState(false);
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');

  const handleCredChange = async (e) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    if (!credForm.currentPassword) { setCredError('Current password is required'); return; }
    if (!credForm.newUsername && !credForm.newPassword) { setCredError('Provide a new username or password to update'); return; }
    if (credForm.newPassword && credForm.newPassword !== credForm.confirmPassword) { setCredError('New passwords do not match'); return; }
    if (credForm.newPassword && credForm.newPassword.length < 4) { setCredError('New password must be at least 4 characters'); return; }

    setCredLoading(true);
    try {
      const payload = { currentPassword: credForm.currentPassword };
      if (credForm.newUsername.trim()) payload.newUsername = credForm.newUsername.trim();
      if (credForm.newPassword) payload.newPassword = credForm.newPassword;

      await API.patch('/auth/change-credentials', payload);

      setCredSuccess('Credentials updated successfully! Please log in again.');
      addToast('Credentials updated — please log in again', 'success');
      setCredForm({ currentPassword: '', newUsername: '', newPassword: '', confirmPassword: '' });

      // Auto logout after 2s so user re-authenticates with new creds
      setTimeout(() => {
        localStorage.clear();
        window.location.reload();
      }, 2000);
    } catch (err) {
      setCredError(err.response?.data?.error || 'Failed to update credentials');
    } finally {
      setCredLoading(false);
    }
  };

  const sections = [
    { id: 'appearance', icon: '🎨', label: 'Appearance' },
    { id: 'credentials', icon: '🔐', label: 'Change Credentials' },
  ];

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <h2 className="section-title">⚙️ Settings</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        {/* ── Sidebar ── */}
        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 8, height: 'fit-content'
        }}>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 'var(--radius)', border: 'none',
                background: activeSection === s.id ? 'var(--accent)' : 'none',
                color: activeSection === s.id ? '#0a0c0f' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                fontFamily: 'var(--font-mono)', textAlign: 'left',
                marginBottom: 2, transition: 'var(--transition)'
              }}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>

        {/* ── Main Panel ── */}
        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: 28
        }}>

          {/* ══ Appearance ══ */}
          {activeSection === 'appearance' && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Appearance
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
                Customize the visual appearance of the Gate Entry System.
              </p>

              <div style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 700 }}>
                  Theme
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  {/* Dark Mode Card */}
                  <div
                    onClick={() => setTheme('dark')}
                    style={{
                      flex: 1, cursor: 'pointer', borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${theme === 'dark' ? 'var(--accent)' : 'var(--border)'}`,
                      overflow: 'hidden', transition: 'var(--transition)',
                      background: theme === 'dark' ? 'var(--accent-dim)' : 'var(--bg-3)'
                    }}
                  >
                    {/* Preview */}
                    <div style={{ background: '#0a0c0f', padding: 14, height: 80, position: 'relative' }}>
                      <div style={{ background: '#111318', borderRadius: 4, height: 12, width: '60%', marginBottom: 8 }} />
                      <div style={{ background: '#1a1d24', borderRadius: 4, height: 8, width: '80%', marginBottom: 6 }} />
                      <div style={{ background: '#22262f', borderRadius: 4, height: 8, width: '45%' }} />
                      <div style={{
                        position: 'absolute', bottom: 10, right: 10,
                        background: '#f5a623', borderRadius: 3, width: 24, height: 8
                      }} />
                    </div>
                    <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>🌙 Dark Mode</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Industrial dark theme</div>
                      </div>
                      {theme === 'dark' && <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>}
                    </div>
                  </div>

                  {/* Light Mode Card */}
                  <div
                    onClick={() => setTheme('light')}
                    style={{
                      flex: 1, cursor: 'pointer', borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${theme === 'light' ? 'var(--accent)' : 'var(--border)'}`,
                      overflow: 'hidden', transition: 'var(--transition)',
                      background: theme === 'light' ? 'var(--accent-dim)' : 'var(--bg-3)'
                    }}
                  >
                    {/* Preview */}
                    <div style={{ background: '#f5f6fa', padding: 14, height: 80, position: 'relative' }}>
                      <div style={{ background: '#e8eaf0', borderRadius: 4, height: 12, width: '60%', marginBottom: 8 }} />
                      <div style={{ background: '#d0d3de', borderRadius: 4, height: 8, width: '80%', marginBottom: 6 }} />
                      <div style={{ background: '#c4c7d4', borderRadius: 4, height: 8, width: '45%' }} />
                      <div style={{
                        position: 'absolute', bottom: 10, right: 10,
                        background: '#f5a623', borderRadius: 3, width: 24, height: 8
                      }} />
                    </div>
                    <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>☀️ Light Mode</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Clean light theme</div>
                      </div>
                      {theme === 'light' && <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '12px 16px',
                fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span>💡</span>
                <span>Theme preference is saved locally and persists across sessions.</span>
              </div>
            </div>
          )}

          {/* ══ Change Credentials ══ */}
          {activeSection === 'credentials' && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                Change Credentials
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28 }}>
                Update your username or password. You'll be logged out after a successful change.
              </p>

              <div style={{
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 24,
                fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span>👤</span>
                <span>Logged in as: <strong style={{ color: 'var(--text-primary)' }}>{auth?.user?.username}</strong>
                &nbsp;·&nbsp; Role: <strong style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{auth?.user?.role}</strong></span>
              </div>

              {credError && <div className="error-banner" style={{ marginBottom: 16 }}>⚠ {credError}</div>}
              {credSuccess && (
                <div style={{
                  background: 'var(--green-dim)', border: '1px solid var(--green)',
                  borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 12, color: 'var(--green)', marginBottom: 16
                }}>
                  ✓ {credSuccess}
                </div>
              )}

              <form onSubmit={handleCredChange}>
                <div className="form-group">
                  <label className="form-label">Current Password *</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Enter your current password"
                    value={credForm.currentPassword}
                    onChange={e => setCredForm(f => ({ ...f, currentPassword: e.target.value }))}
                  />
                </div>

                <hr className="divider" />

                <p style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, fontWeight: 700 }}>
                  New Credentials (leave blank to keep unchanged)
                </p>

                <div className="form-group">
                  <label className="form-label">New Username</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder={`Current: ${auth?.user?.username || ''}`}
                    value={credForm.newUsername}
                    onChange={e => setCredForm(f => ({ ...f, newUsername: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Enter new password"
                    value={credForm.newPassword}
                    onChange={e => setCredForm(f => ({ ...f, newPassword: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Repeat new password"
                    value={credForm.confirmPassword}
                    onChange={e => setCredForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={credLoading} style={{ marginTop: 8 }}>
                  {credLoading ? '⏳ Updating...' : '🔐 Update Credentials'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
