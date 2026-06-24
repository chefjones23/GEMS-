import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';

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
        cursor: 'grab', transition: 'background 0.15s, opacity 0.15s',
      }}
    >
      <td style={{ width: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }} title="Drag to reorder">⠿</td>
      <td className="sn-cell">#{index + 1}</td>
      <td style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{icon} {item[labelField]}</td>
      <td className="date-cell">{item.created_at?.split('T')[0] || item.created_at?.split(' ')[0]}</td>
      <td><button className="btn btn-sm btn-danger" onClick={() => onDelete(item)}>🗑 Delete</button></td>
    </tr>
  );
}

export default function PlantManagement({ addToast }) {
  const { API } = useAuth();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const fetchPlants = useCallback(async () => {
    try {
      const res = await API.get('/plants');
      setPlants(res.data);
    } catch { addToast('Failed to load plants', 'error'); }
    finally { setLoading(false); }
  }, [API, addToast]);

  useEffect(() => { fetchPlants(); }, [fetchPlants]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setError('Plant name is required'); return; }
    setAdding(true); setError('');
    try {
      await API.post('/plants', { name: newName.trim() });
      addToast(`"${newName.trim()}" added successfully`, 'success');
      setNewName(''); fetchPlants();
    } catch (err) { setError(err.response?.data?.error || 'Failed to add plant'); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id, name) => {
    try {
      await API.delete(`/plants/${id}`);
      addToast(`"${name}" deleted`, 'success');
      setDeleteConfirm(null); fetchPlants();
    } catch (err) { addToast(err.response?.data?.error || 'Failed to delete', 'error'); }
  };

  const handleDragStart = (i) => setDragIndex(i);
  const handleDragOver = (i) => setOverIndex(i);
  const handleDragEnd = () => { setDragIndex(null); setOverIndex(null); };

  const handleDrop = async (dropIndex) => {
    if (dragIndex === null || dragIndex === dropIndex) { handleDragEnd(); return; }
    const reordered = [...plants];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setPlants(reordered);
    handleDragEnd();
    try {
      await API.patch('/plants/reorder', { ids: reordered.map(p => p.id) });
      addToast('Order saved', 'success');
    } catch { addToast('Could not save order', 'error'); fetchPlants(); }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="toolbar-left">
          <h2 className="section-title">Plant Management</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-3)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>
            {plants.length} plants
          </span>
        </div>
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 20 }}>
        <p style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14, fontWeight: 700 }}>Add New Plant</p>
        {error && <div className="error-banner" style={{ marginBottom: 12 }}>⚠ {error}</div>}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
          <input className="form-input" type="text" placeholder="Enter plant name..." value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary" disabled={adding}>{adding ? '⏳ Adding...' : '+ Add Plant'}</button>
        </form>
      </div>

      {plants.length > 1 && (
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
                <th>Plant Name</th>
                <th style={{ width: 160 }}>Added On</th>
                <th style={{ width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><div className="loading-overlay"><div className="spinner" /><span>Loading...</span></div></td></tr>
              ) : plants.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">🏗</div><div className="empty-text">No plants added yet.</div></div></td></tr>
              ) : plants.map((p, i) => (
                <DraggableRow key={p.id} item={p} index={i}
                  onDragStart={handleDragStart} onDragOver={handleDragOver}
                  onDrop={handleDrop} onDragEnd={handleDragEnd}
                  isDragging={dragIndex === i} isOver={overIndex === i && dragIndex !== i}
                  onDelete={() => setDeleteConfirm(p)} icon="🏗" labelField="name"
                />
              ))}
            </tbody>
          </table>
        </div>
        {plants.length > 0 && (
          <div className="table-footer"><span className="table-info">Total: {plants.length} plants in dropdown</span></div>
        )}
      </div>

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <div className="modal-body confirm-body">
              <div className="confirm-icon">⚠️</div>
              <h3 className="modal-title" style={{ marginBottom: 12 }}>Delete Plant?</h3>
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
