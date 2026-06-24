const DB = require('better-sqlite3')('./gate_entry.db');
const users = DB.prepare('SELECT id, username, role FROM users').all();
console.log(users);
