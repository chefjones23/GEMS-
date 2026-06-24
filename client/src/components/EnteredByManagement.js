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
      <td style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>👤 {item.name}</td>
      <td className="date-cell">{item.created_at?.split('T')[0] || item.created_at?.split(' ')[0]}</td>
      <td><button className="btn btn-sm btn-danger" onClick={() => onDelete(item)}>🗑 Remove</button></td>
    </tr>
  );
}

export default function EnteredByManagement({ addToast }) {
  const { API } = useAuth();
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const fetchNames = useCallback(async () => {
    try {
      const res = await API.get('/enteredby');
      setNames(res.data);
    } catch { addToast('Failed to load Entered-By names', 'error'); }
    finally { setLoading(false); }
  }, [API, addToast]);

  useEffect(() => { fetchNames(); }, [fetchNames]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setError('Name is required'); return; }
    setAdding(true); setError('');
    try {
      await API.post('/enteredby', { name: newName.trim() });
      addToast(`"${newName.trim()}" added successfully`, 'success');
      setNewName(''); fetchNames();
    } catch (err) { setError(err.response?.data?.error || 'Failed to add name'); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id, name) => {
    try {
      await API.delete(`/enteredby/${id}`);
      addToast(`"${name}" removed`, 'success');
      setDeleteConfirm(null); fetchNames();
    } catch (err) { addToast(err.response?.data?.error || 'Failed to delete', 'error'); }
  };

  const handleDragStart = (i) => setDragIndex(i);
  const handleDragOver = (i) => setOverIndex(i);
  const handleDragEnd = () => { setDragIndex(null); setOverIndex(null); };

  const handleDrop = async (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) { handleDragEnd(); return; }
    const reordered = [...names];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setNames(reordered);
    handleDragEnd();
    try {
      await API.patch('/enteredby/reorder', { ids: reordered.map(n => n.id) });
      addToast('Order saved', 'success');
    } catch { addToast('Could not save order', 'error'); fetchNames(); }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <h2 className="section-title">Entered By — Names</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-3)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
            {names.length} names in dropdown
          </span>
        </div>
      </div>

      <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>ℹ️</span>
        <span>Names added here appear in the <strong style={{ color: 'var(--blue)' }}>Entered By</strong> dropdown when creating or editing a gate entry.</span>
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20 }}>
        <p style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14, fontWeight: 700 }}>Add New Name</p>
        {error && <div className="error-banner" style={{ marginBottom: 12 }}>⚠ {error}</div>}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
          <input className="form-input" type="text" placeholder="e.g. Gate Operator, Store Keeper, John Doe..." value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary" disabled={adding}>{adding ? '⏳ Adding...' : '+ Add Name'}</button>
        </form>
      </div>

      {names.length > 1 && (
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
                <th style={{ width: 60 }}>S.No</th>
                <th>Name</th>
                <th style={{ width: 160 }}>Added On</th>
                <th style={{ width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><div className="loading-overlay"><div className="spinner" /><span>Loading...</span></div></td></tr>
              ) : names.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">👤</div><div className="empty-text">No names yet. Add your first name above.</div></div></td></tr>
              ) : names.map((n, i) => (
                <DraggableRow key={n.id} item={n} index={i}
                  onDragStart={handleDragStart} onDragOver={handleDragOver}
                  onDrop={handleDrop} onDragEnd={handleDragEnd}
                  isDragging={dragIndex === i} isOver={overIndex === i && dragIndex !== i}
                  onDelete={() => setDeleteConfirm(n)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {names.length > 0 && (
          <div className="table-footer"><span className="table-info">Total: {names.length} name{names.length !== 1 ? 's' : ''} available</span></div>
        )}
      </div>

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <div className="modal-body confirm-body">
              <div className="confirm-icon">⚠️</div>
              <h3 className="modal-title" style={{ marginBottom: 12 }}>Remove Name?</h3>
              <p className="confirm-msg">Remove <strong>"{deleteConfirm.name}"</strong> from the Entered By dropdown? Existing entries are not affected.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.name)}>🗑 Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
