import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';

const EMPTY_FORM = {
  invoice_number: '', po_number: '', invoice_date: '',
  supplier_name: '', plant_name: '', vehicle_number: '',
  material_description: '', qty: '', entered_by: '', remark: ''
};

// ─── Reusable Autocomplete Dropdown ───────────────────────────────────────────
function AutocompleteInput({ value, onChange, items, placeholder, emptyMsg, icon }) {
  const [inputVal, setInputVal] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => { setInputVal(value || ''); }, [value]);

  useEffect(() => {
    setFiltered(
      inputVal.trim() === ''
        ? items
        : items.filter(s => s.name.toLowerCase().includes(inputVal.toLowerCase()))
    );
  }, [inputVal, items]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (name) => { setInputVal(name); onChange(name); setShowDropdown(false); };
  const handleInput  = (e) => { setInputVal(e.target.value); onChange(e.target.value); setShowDropdown(true); };
  const handleClear  = () => { setInputVal(''); onChange(''); setShowDropdown(true); };

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          type="text"
          placeholder={placeholder}
          value={inputVal}
          onChange={handleInput}
          onFocus={() => setShowDropdown(true)}
          autoComplete="off"
          style={{ paddingRight: inputVal ? 36 : 14 }}
        />
        {inputVal && (
          <button type="button" onClick={handleClear} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 14, padding: 2
          }}>✕</button>
        )}
      </div>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--bg-3)', border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)', zIndex: 999,
          maxHeight: 200, overflowY: 'auto',
          marginTop: 4, boxShadow: 'var(--shadow-lg)'
        }}>
          {items.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              ⚠ {emptyMsg}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              No match for "<strong style={{ color: 'var(--text-secondary)' }}>{inputVal}</strong>"
            </div>
          ) : filtered.map(s => {
            const idx    = s.name.toLowerCase().indexOf(inputVal.toLowerCase());
            const before = s.name.slice(0, idx);
            const match  = s.name.slice(idx, idx + inputVal.length);
            const after  = s.name.slice(idx + inputVal.length);
            return (
              <div key={s.id}
                onMouseDown={() => handleSelect(s.name)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                  color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-4)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span>
                  {inputVal && idx !== -1 ? (
                    <>{before}<strong style={{ color: 'var(--accent)' }}>{match}</strong>{after}</>
                  ) : s.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Entry Form ───────────────────────────────────────────────────────────────
export default function EntryForm({ editEntry, onSuccess, onClose }) {
  const { API, auth: authData } = useAuth();
  const [form, setForm]         = useState(EMPTY_FORM);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [suppliers, setSuppliers]     = useState([]);
  const [plants, setPlants]           = useState([]);
  const [enteredByNames, setEnteredByNames] = useState([]);  // ← from managed list
  const isEdit = !!editEntry;
  const currentUsername = authData?.user?.username || '';

  // Fetch suppliers, plants, and managed entered-by names
  useEffect(() => {
    API.get('/suppliers').then(res => setSuppliers(res.data)).catch(() => setSuppliers([]));
    API.get('/plants').then(res => setPlants(res.data)).catch(() => setPlants([]));
    API.get('/enteredby').then(res => setEnteredByNames(res.data)).catch(() => setEnteredByNames([]));
  }, [API]);

  useEffect(() => {
    if (editEntry) {
      setForm({
        invoice_number:       editEntry.invoice_number       || '',
        po_number:            editEntry.po_number            || '',
        invoice_date:         editEntry.invoice_date         || '',
        supplier_name:        editEntry.supplier_name        || '',
        plant_name:           editEntry.plant_name           || '',
        vehicle_number:       editEntry.vehicle_number       || '',
        material_description: editEntry.material_description || '',
        qty:                  editEntry.qty !== undefined ? String(editEntry.qty) : '',
        inward_date:          editEntry.inward_date          || '',
        inward_time:          editEntry.inward_time          || '',
        entered_by:           editEntry.entered_by           || editEntry.created_by || '',
        remark:               editEntry.remark               || '',
      });
    } else {
      setForm({ ...EMPTY_FORM, entered_by: currentUsername });
    }
  }, [editEntry, currentUsername]);

  const set = (field) => (e) => {
    let val = e.target.value;
    if (field === 'invoice_number' || field === 'vehicle_number') val = val.toUpperCase();
    setForm(f => ({ ...f, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.invoice_number || !form.invoice_date || !form.supplier_name ||
        !form.vehicle_number || !form.material_description || form.qty === '') {
      setError('Please fill all required fields.');
      return;
    }
    if (isNaN(parseFloat(form.qty)) || parseFloat(form.qty) < 0) {
      setError('Quantity must be a valid positive number.');
      return;
    }
    setLoading(true); setError('');
    try {
      if (isEdit) {
        await API.put(`/entries/${editEntry.serial_number}`, form);
      } else {
        await API.post('/entries', form);
      }
      onSuccess(isEdit ? 'Entry updated successfully!' : 'Entry added successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">
            {isEdit ? '✏️ Edit Entry' : '+ New Gate Entry'}
            <span>{isEdit ? `Updating S.No #${editEntry.serial_number}` : 'Auto-captures date & time on submit'}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-banner">⚠ {error}</div>}

            <div className="form-grid-2">
              {/* Invoice Number */}
              <div className="form-group">
                <label className="form-label">Invoice Number *</label>
                <input className="form-input" type="text" placeholder="INV-001"
                  value={form.invoice_number} onChange={set('invoice_number')} />
              </div>

              {/* PO Number */}
              <div className="form-group">
                <label className="form-label">PO Number</label>
                <input className="form-input" type="text" placeholder="PO-2024-001"
                  value={form.po_number} onChange={set('po_number')} />
              </div>

              {/* Invoice Date */}
              <div className="form-group">
                <label className="form-label">Invoice Date *</label>
                <input className="form-input" type="date"
                  value={form.invoice_date} onChange={set('invoice_date')} />
              </div>

              {/* ── Entered By — dropdown from managed list ── */}
              <div className="form-group">
                <label className="form-label">
                  Entered By
                  <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>
                    (select or type)
                  </span>
                </label>
                <select
                  className="form-input"
                  value={form.entered_by}
                  onChange={set('entered_by')}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">— Select name —</option>
                  {enteredByNames.map(n => (
                    <option key={n.id} value={n.name}>{n.name}</option>
                  ))}
                  {/* Always include current user as fallback option */}
                  {currentUsername && !enteredByNames.find(n => n.name === currentUsername) && (
                    <option value={currentUsername}>{currentUsername} (me)</option>
                  )}
                </select>
              </div>

              {/* Supplier Name — Autocomplete */}
              <div className="form-group">
                <label className="form-label">
                  Supplier Name *
                  <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>
                    (type to search)
                  </span>
                </label>
                <AutocompleteInput
                  value={form.supplier_name}
                  onChange={(val) => setForm(f => ({ ...f, supplier_name: val }))}
                  items={suppliers}
                  placeholder="Search suppliers..."
                  emptyMsg="No suppliers added yet. Admin must add from Suppliers tab."
                  icon="🏭"
                />
              </div>

              {/* Plant Name — Autocomplete */}
              <div className="form-group">
                <label className="form-label">
                  Plant
                  <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>
                    (type to search)
                  </span>
                </label>
                <AutocompleteInput
                  value={form.plant_name}
                  onChange={(val) => setForm(f => ({ ...f, plant_name: val }))}
                  items={plants}
                  placeholder="Search plants..."
                  emptyMsg="No plants added yet. Admin must add from Plants tab."
                  icon="🏗"
                />
              </div>

              {/* Vehicle Number */}
              <div className="form-group">
                <label className="form-label">Vehicle Number *</label>
                <input className="form-input" type="text" placeholder="TN01AB1234"
                  value={form.vehicle_number} onChange={set('vehicle_number')} />
              </div>

              {/* Quantity */}
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" min="0" step="any" placeholder="0"
                  value={form.qty} onChange={set('qty')} />
              </div>

              {/* Material Description */}
              <div className="form-group form-grid-full">
                <label className="form-label">Material Description *</label>
                <textarea className="form-textarea"
                  placeholder="Describe the materials being received..."
                  value={form.material_description} onChange={set('material_description')} rows={3} />
              </div>

              {/* Remark — editable by admin and user */}
              <div className="form-group form-grid-full">
                <label className="form-label">
                  Remark
                  <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>
                    (optional — editable later by all users)
                  </span>
                </label>
                <textarea className="form-textarea"
                  placeholder="Add any remarks or notes about this entry..."
                  value={form.remark} onChange={set('remark')} rows={2}
                  style={{ borderColor: 'var(--blue)', resize: 'vertical' }} />
              </div>

              {/* Edit-only: Inward Date & Time */}
              {isEdit && (
                <>
                  <div className="form-group">
                    <label className="form-label">Inward Date</label>
                    <input className="form-input" type="date"
                      value={form.inward_date} onChange={set('inward_date')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Inward Time</label>
                    <input className="form-input" type="time"
                      value={form.inward_time} onChange={set('inward_time')} />
                  </div>
                </>
              )}
            </div>

            {!isEdit && (
              <div style={{
                marginTop: 12, padding: '10px 14px', background: 'var(--bg-3)',
                borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text-muted)'
              }}>
                📅 Inward date &amp; time will be automatically recorded upon submission
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Saving...' : isEdit ? '✓ Update Entry' : '+ Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
