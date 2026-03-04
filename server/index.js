import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { getDb, saveDb } from "./db.js";

const app = express();
const PORT = 3000;

// Require a strong JWT secret; no insecure default.
const { JWT_SECRET } = process.env;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  throw new Error(
    "JWT_SECRET env var must be set to a strong random value (>=16 chars)"
  );
}

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: false,
  })
);

// Limit JSON body size to avoid abuse.
app.use(express.json({ limit: "32kb" }));

function toBase64(buf) {
  return Buffer.from(buf).toString("base64");
}

function validateUsername(username) {
  if (typeof username !== "string") return "Username must be a string";
  const trimmed = username.trim();
  if (!trimmed) return "Username is required";
  if (trimmed.length > 64) return "Username too long";
  if (!/^[a-zA-Z0-9_.@-]+$/.test(trimmed)) {
    return "Username has invalid characters";
  }
  return null;
}

function validatePassword(password) {
  if (typeof password !== "string") return "Password must be a string";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password too long";
  return null;
}

function validateCiphertext(ciphertextB64, ivB64) {
  const b64re = /^[A-Za-z0-9+/=]+$/;
  if (typeof ciphertextB64 !== "string" || typeof ivB64 !== "string") {
    return "ciphertextB64 and ivB64 must be strings";
  }
  if (!ciphertextB64 || !ivB64) return "ciphertextB64 and ivB64 required";
  if (!b64re.test(ciphertextB64) || !b64re.test(ivB64)) {
    return "Invalid base64 encoding";
  }
  if (ciphertextB64.length > 16384 || ivB64.length > 128) {
    return "Payload too large";
  }
  return null;
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization" });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/auth/register", async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    if (uErr || pErr) {
      return res.status(400).json({ error: uErr || pErr });
    }

    const db = await getDb();
    const saltB64 = toBase64(randomBytes(32));
    const password_hash = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (username, password_hash, salt_b64) VALUES (?, ?, ?)",
      [username.trim(), password_hash, saltB64]
    );
    saveDb();
    return res.status(201).json({ ok: true });
  } catch (e) {
    if (e.message && e.message.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Username already exists" });
    }
    return next(e);
  }
});

app.post("/auth/login", async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    if (uErr || pErr) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const db = await getDb();
    const stmt = db.prepare(
      "SELECT id, password_hash, salt_b64 FROM users WHERE username = ?"
    );
    stmt.bind([username.trim()]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const row = stmt.getAsObject();
    stmt.free();

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, saltB64: row.salt_b64 });
  } catch (e) {
    return next(e);
  }
});

app.get("/records", authMiddleware, async (req, res, next) => {
  try {
    const db = await getDb();
    const stmt = db.prepare(
      "SELECT id, ciphertext_b64 AS ciphertextB64, iv_b64 AS ivB64 FROM records WHERE user_id = ? ORDER BY created_at DESC"
    );
    stmt.bind([req.userId]);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return res.json(rows);
  } catch (e) {
    return next(e);
  }
});

app.post("/records", authMiddleware, async (req, res, next) => {
  try {
    const { ciphertextB64, ivB64 } = req.body ?? {};
    const err = validateCiphertext(ciphertextB64, ivB64);
    if (err) {
      return res.status(400).json({ error: err });
    }

    const db = await getDb();
    db.run(
      "INSERT INTO records (user_id, ciphertext_b64, iv_b64) VALUES (?, ?, ?)",
      [req.userId, ciphertextB64, ivB64]
    );
    const result = db.exec("SELECT last_insert_rowid() AS id");
    const id = result[0]?.values[0]?.[0];
    saveDb();
    return res.status(201).json({ id });
  } catch (e) {
    return next(e);
  }
});

// Global error handler – do not leak internals to client.
app.use((err, req, res, next) => {
  console.error(err instanceof Error ? err.message : err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, async () => {
  await getDb();
  console.log(`Backend running at http://localhost:${PORT}`);
});
