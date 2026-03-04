# How to capture the required screenshots

This guide explains how to get the four items for documentation:

1. **UI add record** — Screenshot of the Add Record form  
2. **UI decrypt list** — Screenshot of the Decrypted Records table  
3. **SQL view (ciphertext only)** — View of the database showing only encrypted data  
4. **Request payload (encrypted)** — The encrypted body sent when adding a record  

---

## Prerequisites

- Server and client running (see [README.md](README.md))
- Log in as **demo** / **demo123** (or your own user)
- Add at least one record so the list and payload are visible  

---

## 1. UI add record

1. Open the app (e.g. http://localhost:5173) and log in.
2. Scroll to the **Add Record** section (Product Name, Price, Seller, Sales Person, Time).
3. Take a screenshot of the form (you can fill it or leave it empty).

**Suggested filename:** `screenshot-ui-add-record.png`

---

## 2. UI decrypt list

1. After adding one or more records, scroll to **Decrypted Records**.
2. The table shows decrypted data (Product, Price, Seller, Sales Person, Time).
3. Take a screenshot of the table.

**Suggested filename:** `screenshot-ui-decrypt-list.png`

---

## 3. SQL view (ciphertext only)

The database stores only ciphertext and IV — no plaintext fields.

**Option A — Run the print script (recommended)**

From the project root:

```bash
cd server
npm run print-records
```

Or from repo root:

```bash
node server/print-records-table.js
```

The script prints the `records` table (id, user_id, ciphertext_b64, iv_b64, created_at).  
Take a screenshot of the terminal output.

**Option B — Inspect the DB file**

Open `server/finance.db` with a SQLite viewer (e.g. DB Browser for SQLite) and run:

```sql
SELECT id, user_id, ciphertext_b64, iv_b64, created_at FROM records;
```

Screenshot the result.

**Suggested filename:** `screenshot-sql-ciphertext.png`

---

## 4. Request payload (encrypted)

**Option A — In-app demo panel (easiest)**

1. Add a record using the form and click **Save Record**.
2. Below the form, open the details: **Request payload (encrypted) — for demo/screenshot**.
3. The panel shows the last request body: `ciphertextB64` (truncated) and `ivB64`.
4. Take a screenshot of that panel.

**Option B — Browser DevTools**

1. Open DevTools (F12) → **Network** tab.
2. Add a record and click **Save Record**.
3. Click the **records** request (POST to `/records`).
4. Open **Payload** or **Request** and show the JSON body: `{ "ciphertextB64": "...", "ivB64": "..." }`.
5. Take a screenshot.

**Suggested filename:** `screenshot-request-payload-encrypted.png`

---

## Quick checklist

| Item                    | Where to capture                         |
|-------------------------|------------------------------------------|
| UI add record           | Dashboard → Add Record form              |
| UI decrypt list         | Dashboard → Decrypted Records table      |
| SQL view (ciphertext)   | Terminal: `npm run print-records` in server |
| Request payload         | Dashboard → “Request payload (encrypted)” or DevTools → Network → POST /records |

Save the screenshots in the `screenshots/` folder. Suggested filenames: `01-ui-add-record.png`, `02-ui-decrypt-list.png`, `03-sql-ciphertext-only.png`, `04-request-payload-encrypted.png`.
