import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../App';

// ─── Drag-to-Reorder Row ──────────────────────────────────────────────────────
function DraggableRow({ item, index, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isOver, onDelete, icon, labelField }) {
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
        cursor: 'grab',
        transition: 'background 0.15s, opacity 0.15s',
      }}
    >
      <td style={{ width: 36, textAlign: 'center', cursor: 'grab', color: 'var(--text-muted)', fontSize: 14 }}
          title="Drag to reorder">⠿</td>
      <td className="sn-cell">#{index + 1}</td>
      <td style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>
        {icon} {item[labelField]}
      </td>
      <td className="date-cell">{item.created_at?.split('T')[0] || item.created_at?.split(' ')[0]}</td>
      <td>
        <button className="btn btn-sm btn-danger" onClick={() => onDelete(item)}>🗑 Delete</button>
      </td>
    </tr>
  );
}

export default function SupplierManagement({ addToast }) {
  const { API } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Drag state
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await API.get('/suppliers');
      setSuppliers(res.data);
    } catch {
      addToast('Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
    }
  }, [API, addToast]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setError('Supplier name is required'); return; }
    setAdding(true); setError('');
    try {
      await API.post('/suppliers', { name: newName.trim() });
      addToast(`"${newName.trim()}" added successfully`, 'success');
      setNewName('');
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add supplier');
    } finally { setAdding(false); }
  };

  const handleDelete = async (id, name) => {
    try {
      await API.delete(`/suppliers/${id}`);
      addToast(`"${name}" deleted`, 'success');
      setDeleteConfirm(null);
      fetchSuppliers();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditSaving(true);
    try {
      await API.patch(`/suppliers/${editItem.id}`, { name: editName.trim() });
      addToast('Supplier updated', 'success');
      setEditItem(null);
      fetchSuppliers();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to update', 'error');
    } finally { setEditSaving(false); }
  };

  // ── Drag handlers ──
  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (index) => setOverIndex(index);
  const handleDragEnd = () => { setDragIndex(null); setOverIndex(null); };

  const handleDrop = async (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) { handleDragEnd(); return; }
    const reordered = [...suppliers];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setSuppliers(reordered);
    handleDragEnd();
    // Persist new order to backend
    try {
      await API.patch('/suppliers/reorder', { ids: reordered.map(s => s.id) });
      addToast('Order saved', 'success');
    } catch {
      addToast('Could not save order', 'error');
      fetchSuppliers();
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <h2 className="section-title">Supplier Management</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-3)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
            {suppliers.length} suppliers
          </span>
        </div>
      </div>

      {/* Add Supplier */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20 }}>
        <p style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14, fontWeight: 700 }}>Add New Supplier</p>
        {error && <div className="error-banner" style={{ marginBottom: 12 }}>⚠ {error}</div>}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
          <input className="form-input" type="text" placeholder="Enter supplier name..." value={newName}
            onChange={e => setNewName(e.target.value)} style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? '⏳ Adding...' : '+ Add Supplier'}
          </button>
        </form>
      </div>

      {/* Reorder hint */}
      {suppliers.length > 1 && (
        <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 12, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⠿</span> <span>Drag rows to reorder. Serial numbers update automatically.</span>
        </div>
      )}

      <div className="table-container">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th style={{ width: 60 }}>S.No</th>
                <th>Supplier Name</th>
                <th style={{ width: 160 }}>Added On</th>
                <th style={{ width: 130 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><div className="loading-overlay"><div className="spinner" /><span>Loading...</span></div></td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">🏭</div><div className="empty-text">No suppliers added yet.</div></div></td></tr>
              ) : suppliers.map((s, i) => (
                <DraggableRow key={s.id} item={s} index={i}
                  onDragStart={handleDragStart} onDragOver={handleDragOver}
                  onDrop={handleDrop} onDragEnd={handleDragEnd}
                  isDragging={dragIndex === i} isOver={overIndex === i && dragIndex !== i}
                  onDelete={() => setDeleteConfirm(s)}
                  icon="🏭" labelField="name"
                />
              ))}
            </tbody>
          </table>
        </div>
        {suppliers.length > 0 && (
          <div className="table-footer">
            <span className="table-info">Total: {suppliers.length} suppliers in dropdown</span>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <div className="modal-body confirm-body">
              <div className="confirm-icon">⚠️</div>
              <h3 className="modal-title" style={{ marginBottom: 12 }}>Delete Supplier?</h3>
              <p className="confirm-msg">Remove <strong>"{deleteConfirm.name}"</strong> from the dropdown?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.name)}>🗑 Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
