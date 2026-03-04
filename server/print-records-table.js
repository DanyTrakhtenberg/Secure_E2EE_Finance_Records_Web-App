/**
 * Prints the records table (ciphertext only) for screenshots/documentation.
 * Run from repo root: node server/print-records-table.js
 * Or from server: node print-records-table.js
 */
import { getDb } from "./db.js";

const db = await getDb();

console.log("-- records table (ciphertext only, no plaintext) --\n");
const stmt = db.prepare(
  "SELECT id, user_id, ciphertext_b64, iv_b64, created_at FROM records ORDER BY id"
);

const rows = [];
while (stmt.step()) {
  rows.push(stmt.getAsObject());
}
stmt.free();

if (rows.length === 0) {
  console.log("(no rows)");
} else {
  console.table(rows);
  console.log("\n-- Sample row (first) --");
  const r = rows[0];
  console.log("id:", r.id);
  console.log("user_id:", r.user_id);
  console.log("ciphertext_b64 (truncated):", (r.ciphertext_b64 || "").slice(0, 80) + "...");
  console.log("iv_b64:", r.iv_b64);
  console.log("created_at:", r.created_at);
}

process.exit(0);
