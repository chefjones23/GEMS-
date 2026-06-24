# Gate Entry Management System

A full-stack web application for managing gate entry records in a warehouse / factory setting.
Built with **React** (frontend) · **Node.js + Express** (backend) · **SQLite** (database).

---

## 📁 Project Structure

```
gate-entry-system/
├── server/
│   ├── server.js          ← Express API server
│   ├── package.json
│   └── gate_entry.db      ← SQLite DB (auto-created on first run)
├── client/
│   ├── public/index.html
│   ├── src/
│   │   ├── App.js         ← Root + Auth Context
│   │   ├── App.css        ← Global design system
│   │   ├── index.js
│   │   └── components/
│   │       ├── Login.js
│   │       ├── Dashboard.js
│   │       ├── EntryForm.js
│   │       └── UserManagement.js
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18 or higher
- npm v8 or higher

### 1 — Install & Start the Backend

```bash
cd server
npm install
node server.js
```

Server will start on **http://localhost:5000**

### 2 — Install & Start the Frontend (new terminal)

```bash
cd client
npm install
npm start
```

React app opens on **http://localhost:3000**

---

## 🔐 Default Login Credentials

| Role  | Username   | Password  | Permissions                              |
|-------|------------|-----------|------------------------------------------|
| Admin | `admin`    | `admin123`| Full CRUD + User Management + Export     |
| User  | `gateuser` | `user123` | Add entries + View + Export              |
| Guest | —          | —         | View only + Export (click "Continue as Guest") |

---

## 🗄️ Database Schema

**Table: `gate_entries`**

| Column               | Type     | Notes                          |
|----------------------|----------|--------------------------------|
| serial_number        | INTEGER  | PK, Auto-increment             |
| inward_date          | DATE     | Auto-captured on submit        |
| inward_time          | TIME     | Auto-captured on submit        |
| invoice_number       | TEXT     | Stored in UPPERCASE            |
| po_number            | TEXT     | Optional                       |
| invoice_date         | DATE     | Manual entry                   |
| supplier_name        | TEXT     |                                |
| vehicle_number       | TEXT     | Stored in UPPERCASE            |
| material_description | TEXT     |                                |
| qty                  | REAL     |                                |
| created_by           | TEXT     | Username who created the entry |
| updated_at           | DATETIME |                                |

**Table: `users`**

| Column     | Type    | Notes                     |
|------------|---------|---------------------------|
| id         | INTEGER | PK, Auto-increment        |
| username   | TEXT    | Unique                    |
| password   | TEXT    | bcrypt hashed             |
| role       | TEXT    | `admin` or `user`         |
| created_at | DATETIME|                           |

---

## 🔌 API Reference

### Auth
| Method | Endpoint          | Description         | Auth Required |
|--------|-------------------|---------------------|---------------|
| POST   | /api/auth/login   | Login with credentials | No         |

### Gate Entries
| Method | Endpoint                      | Description              | Auth Required        |
|--------|-------------------------------|--------------------------|----------------------|
| GET    | /api/entries                  | List all entries (paginated + search) | No    |
| POST   | /api/entries                  | Create new entry         | User or Admin        |
| PUT    | /api/entries/:id              | Update entry             | Admin only           |
| DELETE | /api/entries/:id              | Delete entry             | Admin only           |
| GET    | /api/entries/:id              | Get single entry         | No                   |
| GET    | /api/entries/export/excel     | Download as Excel        | No                   |

### Query Parameters (GET /api/entries)
- `search` — filter by invoice/supplier/vehicle/PO number
- `page` — page number (default: 1)
- `limit` — items per page (default: 20)

### Users (Admin only)
| Method | Endpoint       | Description    |
|--------|----------------|----------------|
| GET    | /api/users     | List all users |
| POST   | /api/users     | Create user    |
| DELETE | /api/users/:id | Delete user    |

---

## ✨ Features

- **Role-Based Access Control**: Admin, User, Guest with JWT authentication
- **Auto Date/Time**: Inward date and time auto-captured server-side
- **Excel Export**: Download filtered or full data as `.xlsx`
- **Search**: Real-time search across invoice, supplier, vehicle, PO
- **Pagination**: 20 entries per page
- **User Management**: Admin can create/delete users
- **Uppercase Enforcement**: Invoice and vehicle numbers stored in caps
- **Responsive**: Works on mobile and desktop

---

## 🛠️ Environment Variables (Optional)

Create a `.env` file in the `server/` directory:

```env
PORT=5000
JWT_SECRET=your_custom_secret_here
```

---

## 📦 Dependencies

### Backend
- `express` — HTTP server
- `better-sqlite3` — SQLite database
- `bcryptjs` — Password hashing
- `jsonwebtoken` — JWT authentication
- `cors` — Cross-origin resource sharing
- `xlsx` — Excel file generation

### Frontend
- `react` + `react-dom` — UI framework
- `axios` — HTTP client
