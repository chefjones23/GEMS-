import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';

function DraggableRow({ item, index, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isOver, onDelete }) {
  return (
    <tr
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      style={{
        opacity: isDragging ? 0.4 : 1,
        background: isOver ? 'rgba(245,166,35,0.08)' : undefined,
        borderTop: isOver ? '2px solid var(--accent)' : undefined,
        cursor: 'grab', transition: 'background 0.15s, opacity 0.15s',
      }}
    >
      <td style={{ width: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }} title="Drag to reorder">⠿</td>
      <td className="sn-cell">#{index + 1}</td>
      <td style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{item.username}</td>
      <td><span className={`role-badge ${item.role}`}>{item.role}</span></td>
      <td className="date-cell">{item.created_at?.split('T')[0]}</td>
      <td>
        <button className="btn btn-sm btn-danger" onClick={() => onDelete(item)}>🗑 Delete</button>
      </td>
    </tr>
  );
}

export default function UserManagement({ addToast }) {
  const { API } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await API.get('/users');
      setUsers(res.data);
    } catch { addToast('Failed to load users', 'error'); }
    finally { setLoading(false); }
  }, [API, addToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setFormError('All fields required'); return; }
    try {
      await API.post('/users', form);
      addToast('User created successfully', 'success');
      setShowForm(false);
      setForm({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) { setFormError(err.response?.data?.error || 'Failed to create user'); }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/users/${id}`);
      addToast('User deleted', 'success');
      setDeleteConfirm(null); fetchUsers();
    } catch (err) { addToast(err.response?.data?.error || 'Failed to delete user', 'error'); }
  };

  const handleDragStart = (i) => setDragIndex(i);
  const handleDragOver = (i) => setOverIndex(i);
  const handleDragEnd = () => { setDragIndex(null); setOverIndex(null); };

  const handleDrop = async (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) { handleDragEnd(); return; }
    const reordered = [...users];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setUsers(reordered);
    handleDragEnd();
    try {
      await API.patch('/users/reorder', { ids: reordered.map(u => u.id) });
      addToast('Order saved', 'success');
    } catch { addToast('Could not save order', 'error'); fetchUsers(); }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <h2 className="section-title">User Management</h2>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add User</button>
        </div>
      </div>

      {users.length > 1 && (
        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 12, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⠿</span><span>Drag rows to reorder. Serial numbers update automatically.</span>
        </div>
      )}

      <div className="table-container">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>S.No</th>
                <th>Username</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6}><div className="loading-overlay"><div className="spinner" /><span>Loading...</span></div></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-icon">👥</div><div className="empty-text">No users found</div></div></td></tr>
              ) : users.map((u, i) => (
                <DraggableRow key={u.id} item={u} index={i}
                  onDragStart={handleDragStart} onDragOver={handleDragOver}
                  onDrop={handleDrop} onDragEnd={handleDragEnd}
                  isDragging={dragIndex === i} isOver={overIndex === i && dragIndex !== i}
                  onDelete={() => setDeleteConfirm(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div className="modal-title">Add New User<span>Create login credentials</span></div>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                {formError && <div className="error-banner">⚠ {formError}</div>}
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input className="form-input" type="text" placeholder="Enter username" value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input className="form-input" type="password" placeholder="Enter password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role *</label>
                  <select className="form-select" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <div className="modal-body confirm-body">
              <div className="confirm-icon">⚠️</div>
              <h3 className="modal-title" style={{ marginBottom: 12 }}>Delete User?</h3>
              <p className="confirm-msg">Delete <strong>{deleteConfirm.username}</strong>? This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
