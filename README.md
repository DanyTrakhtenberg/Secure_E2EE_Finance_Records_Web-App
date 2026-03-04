# Secure E2EE Finance Records Web App

A small web app where users can store finance records (product, price, seller, sales person, time) with **end-to-end encryption**. The server and database only ever see ciphertext; decryption happens only in the browser.

---

## Architecture

### High-level flow

1. **Auth:** User registers or logs in with username + password. Server verifies the password (bcrypt), returns a JWT and a **per-user salt** (stored in DB). The client **never** sends the encryption key.
2. **Key derivation:** After login, the client derives an AES-GCM key in the browser from `password + salt` using PBKDF2 (SHA-256, 200k iterations). This key is kept **only in memory** (e.g. in a session store); it is not sent to the server or persisted.
3. **Add record:** User fills the form (productName, price, seller, salesPerson, time). The client encrypts the whole record as one JSON blob with AES-GCM (random 12-byte IV per record), then sends only `ciphertextB64` and `ivB64` to the server.
4. **Storage:** The server stores rows in SQLite with `user_id`, `ciphertext_b64`, `iv_b64` (and optionally `created_at`). No plaintext finance fields are stored.
5. **List records:** Client requests records with the JWT; server returns encrypted rows. Client decrypts each row in the browser and renders the table.
6. **Logout / refresh:** Logout clears the JWT (localStorage) and the in-memory key. On page refresh the key is lost, so the user must log in again to derive it and decrypt records.

### Components

| Layer   | Role |
|--------|------|
| **Client** | React (Vite + TypeScript). Web Crypto for PBKDF2 and AES-GCM. Reads token from `localStorage.getItem("authToken")`, sends `Authorization: Bearer <token>` on protected requests. Session key lives only in memory. |
| **Server** | Express on port 3000. Auth: register (bcrypt + random salt), login (JWT + return salt). Records: store/return only ciphertext + IV. No decryption, no key derivation. |
| **Database** | SQLite via **sql.js** (no native bindings). Tables: `users` (id, username, password_hash, salt_b64), `records` (id, user_id, ciphertext_b64, iv_b64). |

### Data model (logical, client-side)

Each record is one encrypted JSON object with:

- `productName`, `price`, `seller`, `salesPerson`, `time` (ISO string).

The server only sees `id`, `user_id`, `ciphertext_b64`, `iv_b64` (and timestamps if added).

---

## Setup

### Prerequisites

- Node.js (e.g. 18+)
- npm

### 1. Server

```bash
cd server
npm install
```

Set a strong **JWT secret** (required; no default in production):

```bash
# Windows (PowerShell)
$env:JWT_SECRET = "your-strong-random-secret-at-least-16-chars"

# Linux/macOS
export JWT_SECRET="your-strong-random-secret-at-least-16-chars"
```

Create the DB and a demo user (optional):

```bash
npm run init-db    # creates finance.db and user demo / demo123
```

Start the API:

```bash
npm run dev        # http://localhost:3000
```

### 2. Client

```bash
cd client
npm install
npm run dev        # Vite dev server (proxies /auth, /records to server)
```

Open the app (e.g. http://localhost:5173) and log in (e.g. **demo** / **demo123**), or register a new account.

### Project layout

```
├── client/                 # Frontend
│   ├── src/
│   │   ├── crypto/e2ee.ts  # PBKDF2, AES-GCM, encrypt/decrypt JSON
│   │   ├── api/client.ts   # Auth + records API (Bearer token)
│   │   ├── session/        # In-memory key store (get/set/clear)
│   │   └── pages/          # Login, Dashboard
│   ├── vite.config.ts      # Proxy to server
│   └── package.json
├── server/
│   ├── index.js            # Express routes, validation, error handler
│   ├── db.js               # sql.js init, getDb(), saveDb()
│   ├── init-db.js          # Schema + seed demo user
│   ├── schema.sql          # DB schema (ciphertext only)
│   └── package.json
└── README.md
```

### API summary

| Method | Path            | Auth   | Body / Response |
|--------|-----------------|--------|------------------|
| POST   | /auth/register  | —      | Body: `{ username, password }` → 201 |
| POST   | /auth/login     | —      | Body: `{ username, password }` → `{ token, saltB64 }` |
| GET    | /records        | Bearer | → `[{ id, ciphertextB64, ivB64 }]` |
| POST   | /records        | Bearer | Body: `{ ciphertextB64, ivB64 }` → `{ id }` |

---

## Security rationale

- **Why E2EE:** So that the server and DB never see plaintext finance data. Even with DB or server compromise, an attacker cannot decrypt records without the user’s password and the per-user salt (salt is not secret but is needed for key derivation).
- **Key only in browser:** The AES key is derived from the user’s password and the server-stored salt using PBKDF2. It is kept only in memory and never sent to the server or stored in localStorage/sessionStorage.
- **Same password for login and decryption:** One password is used both for server-side auth (bcrypt) and for client-side key derivation (PBKDF2). Changing the password would require re-encrypting all records under a new key (not implemented here).
- **Ciphertext-only storage:** The DB stores only `ciphertext_b64` and `iv_b64` (and ids/timestamps). No plaintext product, price, seller, or sales person fields.
- **Server role:** The server authenticates users, stores and returns ciphertext, and returns the PBKDF2 salt for the client. It never derives or stores the AES key and never decrypts records.
- **What we do not protect:** Passwords and tokens in transit rely on HTTPS in production. This app does not implement key rotation, secure password reset, or optional 2FA; those would be separate enhancements.

---

## Assumptions & trade-offs

### Assumptions

- **Single server, single DB:** No distributed auth or multi-region DB; one Node process and one SQLite file are enough for the assignment.
- **Same-origin or trusted frontend:** CORS is configured for a known frontend origin (e.g. `http://localhost:5173` in dev). Production would set `FRONTEND_ORIGIN` to the real app URL.
- **JWT secret is set securely:** `JWT_SECRET` must be set in the environment and be strong (e.g. ≥16 chars). No default is used in production.
- **Users accept “login again after refresh”:** Because the key is only in memory, a full page refresh loses it; the user must log in again to decrypt records. This is an intentional trade-off for not persisting the key.

### Trade-offs

- **sql.js instead of native SQLite:** The server uses **sql.js** (WASM) so it runs on Windows without Visual Studio or native build tools. Trade-off: DB is loaded into memory and written back to disk on each change; for very large DBs a native driver would be better.
- **Password = auth + key derivation:** Using the same password for login and for PBKDF2 keeps the design simple but ties account auth to decryption; a separate “encryption password” would add complexity and UX cost.
- **No key recovery:** If the user forgets the password, encrypted records cannot be decrypted. There is no key escrow or recovery flow.
- **Minimal rate limiting / hardening:** The server does input validation, body size limits, and a global error handler; it does not include rate limiting, CSRF, or advanced hardening, which would be needed for a production deployment.

---

## License

Use as needed for the assignment or learning. Ensure `JWT_SECRET` and any production secrets are set securely and never committed.
