const bcrypt = require('bcryptjs');
const DB = require('better-sqlite3')('./gate_entry.db');
DB.prepare("UPDATE users SET password=? WHERE username='admin'").run(bcrypt.hashSync('admin123', 10));
console.log('Password reset done');
