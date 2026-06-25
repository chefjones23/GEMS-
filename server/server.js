const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'gate_entry_super_secret_key_2024';
const DB_PATH = path.join(__dirname, 'gate_entry.db');

app.use(cors({ 
  origin: ['http://localhost:3000', 'https://gems-ten.vercel.app'],
  credentials: true 
}));
app.use(express.json());

let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log('📂 Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new database');
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','user')),
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── Entered-By Names list (managed like suppliers) ────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS enteredby_names (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS gate_entries (
    serial_number INTEGER PRIMARY KEY AUTOINCREMENT,
    inward_date TEXT NOT NULL,
    inward_time TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    po_number TEXT,
    invoice_date TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    plant_name TEXT,
    vehicle_number TEXT NOT NULL,
    material_description TEXT NOT NULL,
    qty REAL NOT NULL,
    entered_by TEXT,
    remark TEXT DEFAULT '',
    created_by TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Migrations for existing databases
  try { db.run(`ALTER TABLE gate_entries ADD COLUMN plant_name TEXT`);        saveDb(); } catch(e) {}
  try { db.run(`ALTER TABLE gate_entries ADD COLUMN entered_by TEXT`);        saveDb(); } catch(e) {}
  try { db.run(`ALTER TABLE gate_entries ADD COLUMN remark TEXT DEFAULT ''`); saveDb(); } catch(e) {}

  // sort_order columns for drag-to-reorder (safe every startup — throws silently if already exists)
  try { db.run(`ALTER TABLE suppliers       ADD COLUMN sort_order INTEGER DEFAULT 0`); saveDb(); } catch(e) {}
  try { db.run(`ALTER TABLE plants          ADD COLUMN sort_order INTEGER DEFAULT 0`); saveDb(); } catch(e) {}
  try { db.run(`ALTER TABLE enteredby_names ADD COLUMN sort_order INTEGER DEFAULT 0`); saveDb(); } catch(e) {}
  try { db.run(`ALTER TABLE users           ADD COLUMN sort_order INTEGER DEFAULT 0`); saveDb(); } catch(e) {}

  // Back-fill entered_by from created_by for old rows
  try { db.run(`UPDATE gate_entries SET entered_by = created_by WHERE entered_by IS NULL OR entered_by = ''`); saveDb(); } catch(e) {}

  const cnt = db.exec("SELECT COUNT(*) FROM users")[0]?.values[0][0] || 0;
  if (cnt === 0) {
    db.run('INSERT INTO users (username,password,role) VALUES (?,?,?)', ['admin', bcrypt.hashSync('admin123',10), 'admin']);
    db.run('INSERT INTO users (username,password,role) VALUES (?,?,?)', ['gateuser', bcrypt.hashSync('user123',10), 'user']);
    saveDb();
    console.log('✅ Seeded: admin/admin123, gateuser/user123');
  }

  // Seed a few default entered-by names if none exist
  const ebCnt = db.exec("SELECT COUNT(*) FROM enteredby_names")[0]?.values[0][0] || 0;
  if (ebCnt === 0) {
    ['Gate Operator', 'Store Keeper', 'Security Guard'].forEach(n =>
      db.run('INSERT OR IGNORE INTO enteredby_names (name) VALUES (?)', [n])
    );
    saveDb();
    console.log('✅ Seeded default Entered-By names');
  }
}

function qAll(sql, p=[]) { const s=db.prepare(sql); s.bind(p); const r=[]; while(s.step()) r.push(s.getAsObject()); s.free(); return r; }
function qOne(sql, p=[]) { return qAll(sql,p)[0]||null; }
function run(sql, p=[])  { db.run(sql,p); const id=db.exec('SELECT last_insert_rowid()')[0]?.values[0][0]; saveDb(); return {lastInsertRowid:id}; }

const auth      = (req,res,next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({error:'Token required'});
  try { req.user = jwt.verify(token, JWT_SECRET); next(); } catch { res.status(403).json({error:'Invalid token'}); }
};
const adminOnly = (req,res,next) => req.user.role==='admin' ? next() : res.status(403).json({error:'Admin only'});

// ─── Auth ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req,res) => {
  const {username,password} = req.body;
  const user = qOne('SELECT * FROM users WHERE username=?',[username]);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({error:'Invalid credentials'});
  const token = jwt.sign({id:user.id, username:user.username, role:user.role}, JWT_SECRET, {expiresIn:'8h'});
  res.json({token, user:{id:user.id, username:user.username, role:user.role}});
});

// ─── Gate Entries ──────────────────────────────────────────────────────────────
app.get('/api/entries', (req,res) => {
  try {
    const {search, page=1, limit=20} = req.query;
    const offset = (parseInt(page)-1)*parseInt(limit);
    let where='', params=[];
    if (search) {
      where=` WHERE invoice_number LIKE ? OR supplier_name LIKE ? OR vehicle_number LIKE ? OR po_number LIKE ? OR material_description LIKE ? OR plant_name LIKE ? OR entered_by LIKE ? OR remark LIKE ?`;
      const s=`%${search}%`; params=[s,s,s,s,s,s,s,s];
    }
    const total   = qOne(`SELECT COUNT(*) as t FROM gate_entries${where}`, params)?.t || 0;
    const entries = qAll(`SELECT * FROM gate_entries${where} ORDER BY serial_number DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
    res.json({entries, total, page:parseInt(page), totalPages:Math.ceil(total/parseInt(limit))});
  } catch(err) { res.status(500).json({error:err.message}); }
});

app.post('/api/entries', auth, (req,res) => {
  try {
    const {invoice_number,po_number,invoice_date,supplier_name,plant_name,vehicle_number,material_description,qty,entered_by,remark} = req.body;
    if (!invoice_number||!invoice_date||!supplier_name||!vehicle_number||!material_description||qty===undefined)
      return res.status(400).json({error:'All required fields must be provided'});
    const now = new Date();
    const d   = now.toISOString().split('T')[0];
    const t   = now.toTimeString().split(' ')[0];
    const enteredBy = (entered_by && entered_by.trim()) ? entered_by.trim() : req.user.username;
    const result = run(
      `INSERT INTO gate_entries (inward_date,inward_time,invoice_number,po_number,invoice_date,supplier_name,plant_name,vehicle_number,material_description,qty,entered_by,remark,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d,t,invoice_number.toUpperCase(),po_number||'',invoice_date,supplier_name,plant_name||'',vehicle_number.toUpperCase(),material_description,parseFloat(qty),enteredBy,remark||'',req.user.username]
    );
    res.status(201).json(qOne('SELECT * FROM gate_entries WHERE serial_number=?',[result.lastInsertRowid]));
  } catch(err) { res.status(500).json({error:err.message}); }
});

app.put('/api/entries/:id', auth, adminOnly, (req,res) => {
  try {
    const {id} = req.params;
    const e = qOne('SELECT * FROM gate_entries WHERE serial_number=?',[id]);
    if (!e) return res.status(404).json({error:'Not found'});
    const b = req.body;
    const enteredBy = (b.entered_by && b.entered_by.trim()) ? b.entered_by.trim() : (e.entered_by || e.created_by || '');
    run(`UPDATE gate_entries SET inward_date=?,inward_time=?,invoice_number=?,po_number=?,invoice_date=?,supplier_name=?,plant_name=?,vehicle_number=?,material_description=?,qty=?,entered_by=?,remark=?,updated_at=datetime('now') WHERE serial_number=?`,
      [b.inward_date||e.inward_date, b.inward_time||e.inward_time,
       (b.invoice_number||e.invoice_number).toUpperCase(),
       b.po_number!==undefined?b.po_number:e.po_number,
       b.invoice_date||e.invoice_date,
       b.supplier_name||e.supplier_name,
       b.plant_name!==undefined?b.plant_name:e.plant_name,
       (b.vehicle_number||e.vehicle_number).toUpperCase(),
       b.material_description||e.material_description,
       b.qty!==undefined?parseFloat(b.qty):e.qty,
       enteredBy,
       b.remark!==undefined?b.remark:(e.remark||''),
       id]);
    res.json(qOne('SELECT * FROM gate_entries WHERE serial_number=?',[id]));
  } catch(err) { res.status(500).json({error:err.message}); }
});

// ─── Remark — editable by both admin and user ──────────────────────────────────
app.patch('/api/entries/:id/remark', auth, (req,res) => {
  try {
    const {id} = req.params;
    const e = qOne('SELECT * FROM gate_entries WHERE serial_number=?',[id]);
    if (!e) return res.status(404).json({error:'Not found'});
    const {remark} = req.body;
    run(`UPDATE gate_entries SET remark=?, updated_at=datetime('now') WHERE serial_number=?`,
      [remark !== undefined ? remark : (e.remark||''), id]);
    res.json(qOne('SELECT * FROM gate_entries WHERE serial_number=?',[id]));
  } catch(err) { res.status(500).json({error:err.message}); }
});

// ─── Delete with serial_number renumbering ─────────────────────────────────────
app.delete('/api/entries/:id', auth, adminOnly, (req,res) => {
  try {
    const idNum = parseInt(req.params.id);
    if (!qOne('SELECT 1 FROM gate_entries WHERE serial_number=?',[idNum]))
      return res.status(404).json({error:'Not found'});

    db.run('DELETE FROM gate_entries WHERE serial_number=?',[idNum]);
    db.run('UPDATE gate_entries SET serial_number = serial_number - 1 WHERE serial_number > ?',[idNum]);
    db.run(`UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(serial_number),0) FROM gate_entries) WHERE name='gate_entries'`);

    saveDb();
    res.json({message:'Deleted and renumbered', id:idNum});
  } catch(err) { res.status(500).json({error:err.message}); }
});

// ─── Excel Export ──────────────────────────────────────────────────────────────
app.get('/api/entries/export/excel', (req,res) => {
  try {
    const {search} = req.query;
    let where='', params=[];
    if (search) {
      where=` WHERE invoice_number LIKE ? OR supplier_name LIKE ? OR vehicle_number LIKE ? OR po_number LIKE ? OR entered_by LIKE ? OR remark LIKE ?`;
      const s=`%${search}%`; params=[s,s,s,s,s,s];
    }
    const entries = qAll(`SELECT * FROM gate_entries${where} ORDER BY serial_number ASC`, params);
    const wsData = [
      ['S.No','Inward Date','Inward Time','Invoice Number','PO Number','Invoice Date','Supplier Name','Plant','Vehicle Number','Material Description','Qty','Entered By','Remark'],
      ...entries.map(e=>[e.serial_number,e.inward_date,e.inward_time,e.invoice_number,e.po_number,e.invoice_date,e.supplier_name,e.plant_name||'',e.vehicle_number,e.material_description,e.qty,e.entered_by||'',e.remark||''])
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{wch:6},{wch:12},{wch:10},{wch:18},{wch:15},{wch:12},{wch:25},{wch:15},{wch:15},{wch:35},{wch:8},{wch:15},{wch:30}];
    XLSX.utils.book_append_sheet(wb, ws, 'Gate Entries');
    const buf = XLSX.write(wb, {type:'buffer', bookType:'xlsx'});
    res.setHeader('Content-Disposition',`attachment; filename=gate_entries_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch(err) { res.status(500).json({error:err.message}); }
});

// ─── Users ─────────────────────────────────────────────────────────────────────
app.get('/api/users', auth, adminOnly, (req,res) => res.json(qAll('SELECT id,username,role,created_at FROM users ORDER BY COALESCE(sort_order, id) ASC')));

app.post('/api/users', auth, adminOnly, (req,res) => {
  const {username,password,role} = req.body;
  if (!username||!password||!['admin','user'].includes(role)) return res.status(400).json({error:'Invalid input'});
  try {
    const result = run('INSERT INTO users (username,password,role) VALUES (?,?,?)',[username,bcrypt.hashSync(password,10),role]);
    res.status(201).json({id:result.lastInsertRowid,username,role});
  } catch(err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({error:'Username exists'});
    res.status(500).json({error:err.message});
  }
});

app.delete('/api/users/:id', auth, adminOnly, (req,res) => {
  if (parseInt(req.params.id)===req.user.id) return res.status(400).json({error:'Cannot delete yourself'});
  run('DELETE FROM users WHERE id=?',[req.params.id]);
  res.json({message:'Deleted'});
});

// ─── Entered-By Names (managed list, like suppliers) ───────────────────────────
app.get('/api/enteredby', auth, (req,res) => {
  res.json(qAll('SELECT * FROM enteredby_names ORDER BY COALESCE(sort_order, id) ASC'));
});

app.post('/api/enteredby', auth, adminOnly, (req,res) => {
  const {name} = req.body;
  if (!name?.trim()) return res.status(400).json({error:'Name is required'});
  try {
    const result = run('INSERT INTO enteredby_names (name) VALUES (?)',[name.trim()]);
    res.status(201).json({id:result.lastInsertRowid, name:name.trim()});
  } catch(err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({error:'Name already exists'});
    res.status(500).json({error:err.message});
  }
});

app.delete('/api/enteredby/:id', auth, adminOnly, (req,res) => {
  if (!qOne('SELECT 1 FROM enteredby_names WHERE id=?',[req.params.id]))
    return res.status(404).json({error:'Not found'});
  run('DELETE FROM enteredby_names WHERE id=?',[req.params.id]);
  res.json({message:'Deleted'});
});

// ─── Suppliers ─────────────────────────────────────────────────────────────────
app.get('/api/suppliers', (req,res) => res.json(qAll('SELECT * FROM suppliers ORDER BY COALESCE(sort_order, id) ASC')));

app.post('/api/suppliers', auth, adminOnly, (req,res) => {
  const {name} = req.body;
  if (!name?.trim()) return res.status(400).json({error:'Supplier name required'});
  try {
    const result = run('INSERT INTO suppliers (name) VALUES (?)',[name.trim()]);
    res.status(201).json({id:result.lastInsertRowid, name:name.trim()});
  } catch(err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({error:'Supplier already exists'});
    res.status(500).json({error:err.message});
  }
});

app.delete('/api/suppliers/:id', auth, adminOnly, (req,res) => {
  if (!qOne('SELECT 1 FROM suppliers WHERE id=?',[req.params.id])) return res.status(404).json({error:'Not found'});
  run('DELETE FROM suppliers WHERE id=?',[req.params.id]);
  res.json({message:'Deleted'});
});

// ─── Plants ────────────────────────────────────────────────────────────────────
app.get('/api/plants', (req,res) => res.json(qAll('SELECT * FROM plants ORDER BY COALESCE(sort_order, id) ASC')));

app.post('/api/plants', auth, adminOnly, (req,res) => {
  const {name} = req.body;
  if (!name?.trim()) return res.status(400).json({error:'Plant name required'});
  try {
    const result = run('INSERT INTO plants (name) VALUES (?)',[name.trim()]);
    res.status(201).json({id:result.lastInsertRowid, name:name.trim()});
  } catch(err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({error:'Plant already exists'});
    res.status(500).json({error:err.message});
  }
});

app.delete('/api/plants/:id', auth, adminOnly, (req,res) => {
  if (!qOne('SELECT 1 FROM plants WHERE id=?',[req.params.id])) return res.status(404).json({error:'Not found'});
  run('DELETE FROM plants WHERE id=?',[req.params.id]);
  res.json({message:'Deleted'});
});

// ─── Change Credentials ────────────────────────────────────────────────────────
app.patch('/api/auth/change-credentials', auth, (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;
  if (!currentPassword) return res.status(400).json({ error: 'Current password required' });

  const user = qOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!bcrypt.compareSync(currentPassword, user.password))
    return res.status(401).json({ error: 'Current password is incorrect' });

  if (!newUsername && !newPassword)
    return res.status(400).json({ error: 'Provide new username or password' });

  try {
    if (newUsername && newPassword) {
      db.run('UPDATE users SET username=?, password=? WHERE id=?', [newUsername.trim(), bcrypt.hashSync(newPassword, 10), req.user.id]);
    } else if (newUsername) {
      db.run('UPDATE users SET username=? WHERE id=?', [newUsername.trim(), req.user.id]);
    } else {
      db.run('UPDATE users SET password=? WHERE id=?', [bcrypt.hashSync(newPassword, 10), req.user.id]);
    }
    saveDb();
    res.json({ message: 'Credentials updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message?.includes('UNIQUE') ? 'Username already taken' : 'Update failed' });
  }
});

// ─── Reorder Suppliers ────────────────────────────────────────────────────────
app.patch('/api/suppliers/reorder', auth, adminOnly, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  // Store display order by updating a sort_order column (add if missing)
  ids.forEach((id, idx) => db.run('UPDATE suppliers SET sort_order=? WHERE id=?', [idx, id]));
  saveDb();
  res.json({ success: true });
});

// ─── Reorder Plants ───────────────────────────────────────────────────────────
app.patch('/api/plants/reorder', auth, adminOnly, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  ids.forEach((id, idx) => db.run('UPDATE plants SET sort_order=? WHERE id=?', [idx, id]));
  saveDb();
  res.json({ success: true });
});

// ─── Reorder EnteredBy ────────────────────────────────────────────────────────
app.patch('/api/enteredby/reorder', auth, adminOnly, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  ids.forEach((id, idx) => db.run('UPDATE enteredby_names SET sort_order=? WHERE id=?', [idx, id]));
  saveDb();
  res.json({ success: true });
});

// ─── Reorder Users ────────────────────────────────────────────────────────────
app.patch('/api/users/reorder', auth, adminOnly, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  ids.forEach((id, idx) => db.run('UPDATE users SET sort_order=? WHERE id=?', [idx, id]));
  saveDb();
  res.json({ success: true });
});

app.get('/api/health', (req,res) => res.json({status:'OK',time:new Date().toISOString()}));

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server → http://localhost:${PORT}`);
    console.log(`   Admin  : admin / admin123`);
    console.log(`   User   : gateuser / user123`);
    console.log(`   Guest  : Click "Continue as Guest"\n`);
  });
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
