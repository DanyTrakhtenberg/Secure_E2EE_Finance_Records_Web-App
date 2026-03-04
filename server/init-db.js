import { getDb, saveDb } from "./db.js";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

function toBase64(buf) {
  return Buffer.from(buf).toString("base64");
}

const db = await getDb();

const insert = db.prepare(
  "INSERT OR IGNORE INTO users (username, password_hash, salt_b64) VALUES (?, ?, ?)"
);
const demoPassword = "demo123";
const hash = await bcrypt.hash(demoPassword, 10);
const saltB64 = toBase64(randomBytes(32));
insert.bind(["demo", hash, saltB64]);
insert.step();
insert.free();

saveDb();
console.log("DB initialized. Demo user: demo / demo123");
