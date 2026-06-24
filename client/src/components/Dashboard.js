import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../App';
import { useTheme } from '../App';
import EntryForm from './EntryForm';
import UserManagement from './UserManagement';
import SupplierManagement from './SupplierManagement';
import PlantManagement from './PlantManagement';
import EnteredByManagement from './EnteredByManagement';
import Settings from './Settings';

/* ─── Toast ──────────────────────────────────────────────────────────────────── */
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && '✓'}{t.type === 'error' && '✕'}{t.type === 'info' && 'ℹ'} {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ─── Remark Cell ────────────────────────────────────────────────────────────── */
function RemarkCell({ entry, role, onSaved }) {
  const { API }               = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue]     = useState(entry.remark || '');
  const [saving, setSaving]   = useState(false);
  const [hovered, setHovered] = useState(false);
  const textareaRef           = useRef(null);
  const canEdit               = role === 'admin' || role === 'user';

  useEffect(() => { if (!editing) setValue(entry.remark || ''); }, [entry.remark, editing]);

  const openEdit = () => {
    if (!canEdit) return;
    setValue(entry.remark || '');
    setEditing(true);
    setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.select(); }, 0);
  };

  const save = async () => {
    setSaving(true);
    try {
      await API.patch(`/entries/${entry.serial_number}/remark`, { remark: value });
      setEditing(false);
      onSaved(entry.serial_number, value);
    } catch { }
    finally { setSaving(false); }
  };

  const cancel = () => { setValue(entry.remark || ''); setEditing(false); };
  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
    if (e.key === 'Escape') cancel();
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
        <textarea ref={textareaRef} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey} rows={2}
          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '2px solid var(--accent)', background: 'var(--bg-3)', color: 'var(--text-primary)', fontSize: 12, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.4 }}
          placeholder="Enter remark… Enter to save, Esc to cancel" />
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={save} disabled={saving}
            style={{ flex: 1, padding: '4px 0', borderRadius: 4, border: 'none', background: saving ? 'var(--bg-3)' : 'var(--accent)', color: saving ? 'var(--text-muted)' : '#fff', fontSize: 11, cursor: saving ? 'default' : 'pointer', fontWeight: 700 }}>
            {saving ? '…' : '✓ Save'}
          </button>
          <button onClick={cancel}
            style={{ flex: 1, padding: '4px 0', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
            ✕ Cancel
          </button>
        </div>
      </div>
    );
  }

  const hasText = value && value.trim().length > 0;
  if (!canEdit) {
    return <span style={{ fontSize: 12, color: hasText ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: hasText ? 'normal' : 'italic' }}>{hasText ? value : '—'}</span>;
  }

  return (
    <div onClick={openEdit} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} title="Click to edit remark"
      style={{ cursor: 'pointer', minWidth: 160, minHeight: 32, padding: '5px 8px', borderRadius: 6,
        border: `1.5px ${hovered ? 'solid' : 'dashed'} ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        background: hovered ? 'rgba(99,102,241,0.06)' : 'transparent', transition: 'all 0.15s ease',
        display: 'flex', alignItems: 'flex-start', gap: 6 }}>
      <span style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: hasText ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: hasText ? 'normal' : 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {hasText ? value : '＋ Add remark'}
      </span>
      <span style={{ fontSize: 11, color: hovered ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, marginTop: 1, transition: 'color 0.15s' }}>✏️</span>
    </div>
  );
}

/* ─── Data Table ─────────────────────────────────────────────────────────────── */
function DataTable({ entries, role, onEdit, onDelete, onRemarkSaved, loading, total, page, totalPages, onPageChange }) {
  const colCount = 12 + (role === 'admin' ? 1 : 0);
  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 55 }}>S.No</th>
              <th style={{ minWidth: 95 }}>Date</th>
              <th style={{ minWidth: 130 }}>Invoice No</th>
              <th style={{ minWidth: 110 }}>PO No</th>
              <th style={{ minWidth: 95 }}>Inv. Date</th>
              <th style={{ minWidth: 150 }}>Supplier</th>
              <th style={{ minWidth: 100 }}>Plant</th>
              <th style={{ minWidth: 110 }}>Vehicle No</th>
              <th style={{ minWidth: 190 }}>Material</th>
              <th style={{ minWidth: 58 }}>Qty</th>
              <th style={{ minWidth: 130, background: 'rgba(59,130,246,0.10)', borderLeft: '2px solid rgba(59,130,246,0.25)' }}>Entered By</th>
              <th style={{ minWidth: 220, background: 'rgba(139,92,246,0.10)', borderLeft: '2px solid rgba(139,92,246,0.25)' }}>
                Remark
                {(role === 'admin' || role === 'user') && (
                  <span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 5 }}>click to edit</span>
                )}
              </th>
              {role === 'admin' && <th style={{ minWidth: 90 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colCount}><div className="loading-overlay"><div className="spinner" /><span>Loading entries...</span></div></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={colCount}><div className="empty-state"><div className="empty-icon">📋</div><div className="empty-text">No entries found</div></div></td></tr>
            ) : entries.map(e => (
              <tr key={e.serial_number}>
                <td className="sn-cell">#{e.serial_number}</td>
                <td className="date-cell">{e.inward_date}</td>
                <td className="invoice-cell">{e.invoice_number}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{e.po_number || '—'}</td>
                <td className="date-cell">{e.invoice_date}</td>
                <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.supplier_name}>{e.supplier_name}</td>
                <td style={{ color: 'var(--green)', fontSize: 12 }}>{e.plant_name || '—'}</td>
                <td className="vehicle-cell">{e.vehicle_number}</td>
                <td style={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }} title={e.material_description}>{e.material_description}</td>
                <td className="qty-cell">{e.qty}</td>
                <td style={{ background: 'rgba(59,130,246,0.04)', borderLeft: '2px solid rgba(59,130,246,0.15)', verticalAlign: 'middle' }}>
                  {e.entered_by ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, padding: '3px 10px', fontSize: 11, color: 'var(--blue)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {e.entered_by}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>—</span>
                  )}
                </td>
                <td style={{ background: 'rgba(139,92,246,0.04)', borderLeft: '2px solid rgba(139,92,246,0.15)', verticalAlign: 'top', paddingTop: 6, paddingBottom: 6 }}>
                  <RemarkCell entry={e} role={role} onSaved={onRemarkSaved} />
                </td>
                {role === 'admin' && (
                  <td>
                    <div className="action-cell">
                      <button className="btn btn-sm btn-ghost" onClick={() => onEdit(e)} title="Edit">✏️</button>
                      <button className="btn btn-sm btn-danger" onClick={() => onDelete(e)} title="Delete">🗑</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span className="table-info">{total > 0 ? `Showing ${entries.length} of ${total} entries` : 'No entries'}</span>
        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Prev</button>
            <span style={{ padding: '0 10px', fontSize: 12, color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
            <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Delete Confirm ─────────────────────────────────────────────────────────── */
function DeleteConfirm({ entry, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal confirm-modal">
        <div className="modal-body confirm-body">
          <div className="confirm-icon">🗑️</div>
          <h3 className="modal-title" style={{ marginBottom: 12 }}>Delete Entry?</h3>
          <p className="confirm-msg">Delete entry <strong>#{entry.serial_number}</strong> (<strong>{entry.invoice_number}</strong>)? Entries above it will be renumbered. This cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>🗑 Delete &amp; Renumber</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sidebar Nav ────────────────────────────────────────────────────────────── */
function SideNav({ tabs, activeTab, setActiveTab, open, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 200, backdropFilter: 'blur(2px)',
            animation: 'fadeIn 0.18s ease',
          }}
        />
      )}

      {/* Drawer */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 260,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        zIndex: 201,
        display: 'flex',
        flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: open ? '4px 0 32px rgba(0,0,0,0.35)' : 'none',
      }}>
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: 60,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, background: 'var(--accent)', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: '#0a0c0f',
            }}>GE</div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              Main Menu
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 6px',
            borderRadius: 4, transition: 'var(--transition)',
          }}>✕</button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {tabs.map((t, idx) => {
            const isActive = activeTab === t.id;
            // Divider before Settings
            const showDivider = idx > 0 && t.id === 'settings';
            return (
              <React.Fragment key={t.id}>
                {showDivider && (
                  <div style={{ height: 1, background: 'var(--border)', margin: '10px 8px' }} />
                )}
                <button
                  onClick={() => { setActiveTab(t.id); onClose(); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '11px 16px', borderRadius: 8, border: 'none',
                    background: isActive ? 'var(--accent-dim)' : 'none',
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)',
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'left', marginBottom: 2,
                    transition: 'var(--transition)',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                >
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{t.icon}</span>
                  <span>{t.label}</span>
                  {isActive && (
                    <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Drawer footer */}
        <div style={{
          padding: '14px 18px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
        }}>
          Gate Entry System &nbsp;·&nbsp; v1.0
        </div>
      </nav>
    </>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { auth, role, logout, API } = useAuth();
  const { theme, setTheme }         = useTheme();
  const [entries, setEntries]       = useState([]);
  const [stats, setStats]           = useState({ total: 0, today: 0 });
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [activeTab, setActiveTab]   = useState('entries');
  const [showForm, setShowForm]     = useState(false);
  const [editEntry, setEditEntry]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toasts, setToasts]         = useState([]);
  const [navOpen, setNavOpen]       = useState(false);
  const searchTimer                 = useRef(null);

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const fetchEntries = useCallback(async (q = search, p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (q) params.search = q;
      const res = await API.get('/entries', { params });
      setEntries(res.data.entries);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      const todayStr   = new Date().toISOString().split('T')[0];
      const todayCount = res.data.entries.filter(e => e.inward_date === todayStr).length;
      setStats({ total: res.data.total, today: todayCount });
    } catch { addToast('Failed to load entries', 'error'); }
    finally { setLoading(false); }
  }, [API, addToast, search, page]);

  useEffect(() => { fetchEntries(); }, [page]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); fetchEntries(search, 1); }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const handleRemarkSaved = useCallback((sn, newRemark) => {
    setEntries(prev => prev.map(e => e.serial_number === sn ? { ...e, remark: newRemark } : e));
    addToast('Remark updated', 'success');
  }, [addToast]);

  const handleExport = () => {
    const url = `/api/entries/export/excel${search ? `?search=${encodeURIComponent(search)}` : ''}`;
    const a = document.createElement('a');
    a.href = `http://localhost:5000${url}`; a.download = ''; a.click();
    addToast('Downloading Excel file...', 'info');
  };

  const handleEdit   = (entry) => { setEditEntry(entry); setShowForm(true); };
  const handleDelete = (entry) => setDeleteTarget(entry);

  const confirmDelete = async () => {
    try {
      await API.delete(`/entries/${deleteTarget.serial_number}`);
      addToast(`Entry #${deleteTarget.serial_number} deleted — entries renumbered`, 'success');
      setDeleteTarget(null);
      fetchEntries(search, page);
    } catch (err) { addToast(err.response?.data?.error || 'Delete failed', 'error'); }
  };

  const handleFormSuccess = (msg) => {
    addToast(msg, 'success');
    setShowForm(false); setEditEntry(null);
    fetchEntries(search, 1); setPage(1);
  };

  const username = auth?.user?.username || 'Guest';
  const isAdmin  = role === 'admin';

  const tabs = [
    { id: 'entries',   icon: '📋', label: 'Entries',    show: true },
    { id: 'users',     icon: '👥', label: 'Users',      show: isAdmin },
    { id: 'suppliers', icon: '🏭', label: 'Suppliers',  show: isAdmin },
    { id: 'plants',    icon: '🏗',  label: 'Plants',     show: isAdmin },
    { id: 'enteredby', icon: '👤', label: 'Entered By', show: isAdmin },
    { id: 'settings',  icon: '⚙️', label: 'Settings',   show: !!auth },
  ].filter(t => t.show);

  const activeTabObj = tabs.find(t => t.id === activeTab);

  return (
    <div className="dashboard">
      <ToastContainer toasts={toasts} />

      {/* ── Side Nav Drawer ── */}
      <SideNav
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      {/* ── Top Bar ── */}
      <header className="topbar">
        <div className="topbar-brand">
          {/* Hamburger */}
          <button
            className="hamburger-btn"
            onClick={() => setNavOpen(v => !v)}
            title="Main menu"
            aria-label="Open navigation menu"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <div className="topbar-logo">GE</div>
          <div>
            <div className="topbar-name">Gate Entry System</div>
            <div className="topbar-sub">Welcome, {username}</div>
          </div>
        </div>

        {/* Active section breadcrumb */}
        {activeTabObj && (
          <div className="topbar-section-crumb">
            <span style={{ opacity: 0.5, marginRight: 6 }}>{activeTabObj.icon}</span>
            {activeTabObj.label}
          </div>
        )}

        <div className="topbar-right">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="theme-toggle-btn"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="topbar-user">
            <span className="topbar-username">{username}</span>
            <span className="topbar-role">{role}</span>
          </div>
          <span className={`role-badge ${role}`}>{role}</span>
          <button className="btn btn-secondary btn-sm" onClick={logout}>⎋ Logout</button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Entries</span>
            <span className="stat-value">{total}</span>
            <span className="stat-icon">📋</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Today's Entries</span>
            <span className="stat-value">{stats.today}</span>
            <span className="stat-icon">📅</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Access Level</span>
            <span className="stat-value" style={{ fontSize: 20, textTransform: 'capitalize', color: role === 'admin' ? 'var(--accent)' : role === 'user' ? 'var(--blue)' : 'var(--green)' }}>{role}</span>
            <span className="stat-icon">🔐</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Current Date</span>
            <span className="stat-value" style={{ fontSize: 16, marginTop: 4 }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className="stat-icon">🕐</span>
          </div>
        </div>

        {/* ── Page Content ── */}
        {activeTab === 'settings' ? (
          <Settings addToast={addToast} theme={theme} setTheme={setTheme} />
        ) : activeTab === 'users' && isAdmin ? (
          <UserManagement addToast={addToast} />
        ) : activeTab === 'suppliers' && isAdmin ? (
          <SupplierManagement addToast={addToast} />
        ) : activeTab === 'plants' && isAdmin ? (
          <PlantManagement addToast={addToast} />
        ) : activeTab === 'enteredby' && isAdmin ? (
          <EnteredByManagement addToast={addToast} />
        ) : (
          <>
            <div className="toolbar">
              <div className="toolbar-left">
                <h2 className="section-title">Gate Entries</h2>
                <div className="search-wrapper">
                  <span className="search-icon">🔍</span>
                  <input className="search-input" type="text"
                    placeholder="Search invoice, supplier, vehicle, remark..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <div className="toolbar-right">
                <button className="btn btn-success btn-sm" onClick={handleExport}>⬇ Export Excel</button>
                {(role === 'admin' || role === 'user') && (
                  <button className="btn btn-primary" onClick={() => { setEditEntry(null); setShowForm(true); }}>+ New Entry</button>
                )}
              </div>
            </div>

            {(role === 'user' || role === 'admin') && (
              <div style={{ marginBottom: 10, padding: '8px 14px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderLeft: '3px solid rgba(139,92,246,0.6)', borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📝</span>
                <span><strong style={{ color: 'var(--text-secondary)' }}>Remark</strong> — click any Remark cell to add or edit.</span>
              </div>
            )}

            <DataTable entries={entries} role={role} onEdit={handleEdit} onDelete={handleDelete}
              onRemarkSaved={handleRemarkSaved} loading={loading} total={total}
              page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </main>

      {showForm && <EntryForm editEntry={editEntry} onSuccess={handleFormSuccess} onClose={() => { setShowForm(false); setEditEntry(null); }} />}
      {deleteTarget && <DeleteConfirm entry={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
