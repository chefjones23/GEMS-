const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'gate_entry_secret_key_2024';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// ─── Database Setup ────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'gate_entry.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user'))
  );

  CREATE TABLE IF NOT EXISTS gate_entries (
    serial_number INTEGER PRIMARY KEY AUTOINCREMENT,
    inward_date TEXT NOT NULL,
    inward_time TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    po_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    vehicle_number TEXT NOT NULL,
    material_description TEXT NOT NULL,
    qty REAL NOT NULL
  );
`);

// ─── Seed Default Users ────────────────────────────────────────────────────────
const seedUsers = () => {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count === 0) {
    const hashedAdmin = bcrypt.hashSync('admin123', 10);
    const hashedUser = bcrypt.hashSync('user123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedAdmin, 'admin');
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('gateuser', hashedUser, 'user');
    console.log('✅ Default users seeded: admin / admin123  |  gateuser / user123');
  }
};
seedUsers();

// ─── Auth Middleware ───────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

const requireAuth = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'user')
    return res.status(403).json({ error: 'Authentication required' });
  next();
};

// ─── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, role: user.role, username: user.username, message: 'Login successful' });
});

// ─── Gate Entry Routes ─────────────────────────────────────────────────────────

// GET all entries (accessible by all including guest - no auth needed)
app.get('/api/entries', (req, res) => {
  try {
    const entries = db.prepare('SELECT * FROM gate_entries ORDER BY serial_number DESC').all();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single entry
app.get('/api/entries/:id', (req, res) => {
  try {
    const entry = db.prepare('SELECT * FROM gate_entries WHERE serial_number = ?').get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new entry (user + admin)
app.post('/api/entries', authenticate, requireAuth, (req, res) => {
  try {
    const {
      invoice_number, po_number, invoice_date,
      supplier_name, vehicle_number, material_description, qty
    } = req.body;

    if (!invoice_number || !po_number || !invoice_date || !supplier_name ||
        !vehicle_number || !material_description || qty === undefined) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const now = new Date();
    const inward_date = now.toISOString().split('T')[0];
    const inward_time = now.toTimeString().split(' ')[0];

    const stmt = db.prepare(`
      INSERT INTO gate_entries 
        (inward_date, inward_time, invoice_number, po_number, invoice_date, supplier_name, vehicle_number, material_description, qty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      inward_date, inward_time,
      invoice_number.toUpperCase(),
      po_number,
      invoice_date,
      supplier_name,
      vehicle_number.toUpperCase(),
      material_description,
      parseFloat(qty)
    );

    const newEntry = db.prepare('SELECT * FROM gate_entries WHERE serial_number = ?').get(result.lastInsertRowid);
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update entry (admin only)
app.put('/api/entries/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const {
      invoice_number, po_number, invoice_date,
      supplier_name, vehicle_number, material_description, qty
    } = req.body;

    const existing = db.prepare('SELECT * FROM gate_entries WHERE serial_number = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    db.prepare(`
      UPDATE gate_entries SET
        invoice_number = ?, po_number = ?, invoice_date = ?,
        supplier_name = ?, vehicle_number = ?, material_description = ?, qty = ?
      WHERE serial_number = ?
    `).run(
      (invoice_number || existing.invoice_number).toUpperCase(),
      po_number || existing.po_number,
      invoice_date || existing.invoice_date,
      supplier_name || existing.supplier_name,
      (vehicle_number || existing.vehicle_number).toUpperCase(),
      material_description || existing.material_description,
      parseFloat(qty) || existing.qty,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM gate_entries WHERE serial_number = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE entry (admin only)
app.delete('/api/entries/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM gate_entries WHERE serial_number = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });

    db.prepare('DELETE FROM gate_entries WHERE serial_number = ?').run(req.params.id);
    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Excel Export Route ────────────────────────────────────────────────────────
app.get('/api/entries/export/excel', (req, res) => {
  try {
    const entries = db.prepare('SELECT * FROM gate_entries ORDER BY serial_number ASC').all();

    const worksheetData = [
      ['S.No', 'Inward Date', 'Inward Time', 'Invoice No', 'PO Number', 'Invoice Date', 'Supplier Name', 'Vehicle No', 'Material Description', 'Qty'],
      ...entries.map(e => [
        e.serial_number, e.inward_date, e.inward_time,
        e.invoice_number, e.po_number, e.invoice_date,
        e.supplier_name, e.vehicle_number, e.material_description, e.qty
      ])
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Column widths
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
      { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 30 }, { wch: 8 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Gate Entries');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=gate_entries_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: User Management ────────────────────────────────────────────────────
app.get('/api/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, role FROM users').all();
  res.json(users);
});

app.post('/api/users', authenticate, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !['admin', 'user'].includes(role))
    return res.status(400).json({ error: 'Valid username, password and role required' });

  const hashed = bcrypt.hashSync(password, 10);
  try {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashed, role);
    res.status(201).json({ message: 'User created successfully' });
  } catch {
    res.status(409).json({ error: 'Username already exists' });
  }
});

app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.username === 'admin') return res.status(400).json({ error: 'Cannot delete default admin' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Gate Entry Server running on http://localhost:${PORT}`);
});
