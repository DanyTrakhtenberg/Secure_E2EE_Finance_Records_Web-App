import { useEffect, useState } from "react";
import type { FinanceRecord, EncryptedRecord, DecryptedRecord } from "../types";
import { createRecordRequest, fetchRecordsRequest } from "../api/client";
import { encryptJson, decryptJson } from "../crypto/e2ee";
import { getSessionKey } from "../session/sessionKeyStore";

interface DashboardPageProps {
  onLogout: () => void;
}

const emptyRecord = (): FinanceRecord => ({
  productName: "",
  price: 0,
  seller: "",
  salesPerson: "",
  time: new Date().toISOString(),
});

/** Format ISO string for datetime-local input (local time). */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const [form, setForm] = useState<FinanceRecord>(emptyRecord());
  const [records, setRecords] = useState<DecryptedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEncryptedPayload, setLastEncryptedPayload] = useState<{
    ciphertextB64: string;
    ivB64: string;
  } | null>(null);

  const loadRecords = async () => {
    const key = getSessionKey();
    if (!key) {
      setError("Missing encryption key, please log in again.");
      return;
    }

    setError(null);
    setLoadingList(true);

    try {
      const encrypted: EncryptedRecord[] = await fetchRecordsRequest();
      const decrypted: DecryptedRecord[] = [];

      for (const item of encrypted) {
        const rec = await decryptJson<FinanceRecord>(
          item.ciphertextB64,
          item.ivB64,
          key
        );
        decrypted.push({ ...rec, id: String(item.id) });
      }

      setRecords(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "price"
          ? (Number(value) || 0)
          : name === "time" && value.length >= 16
            ? new Date(value).toISOString()
            : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = getSessionKey();
    if (!key) {
      setError("Missing encryption key, please log in again.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = await encryptJson<FinanceRecord>(form, key);
      setLastEncryptedPayload(payload);
      await createRecordRequest(payload);
      await loadRecords();
      setForm(emptyRecord());
    } catch {
      setError("Failed to create record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <h1>Finance Records</h1>
        <button onClick={onLogout}>Logout</button>
      </header>

      <section style={sectionStyle}>
        <h2>Add Record</h2>
        <form onSubmit={handleSubmit} style={formStyle}>
          <label>
            <span>Product Name</span>
            <input
              name="productName"
              value={form.productName}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Price</span>
            <input
              type="number"
              name="price"
              value={form.price === 0 ? "" : form.price}
              onChange={handleChange}
              placeholder="0"
              required
            />
          </label>
          <label>
            <span>Seller</span>
            <input
              name="seller"
              value={form.seller}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Sales Person</span>
            <input
              name="salesPerson"
              value={form.salesPerson}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Time</span>
            <input
              type="datetime-local"
              name="time"
              value={toDatetimeLocal(form.time)}
              onChange={handleChange}
              required
            />
          </label>
          {error && <div style={errorStyle}>{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Record"}
          </button>
        </form>
        {lastEncryptedPayload && (
          <details style={payloadDetailsStyle}>
            <summary>Request payload (encrypted) — for demo/screenshot</summary>
            <pre style={payloadPreStyle}>
              {JSON.stringify(
                {
                  ciphertextB64:
                    lastEncryptedPayload.ciphertextB64.slice(0, 60) + "...",
                  ivB64: lastEncryptedPayload.ivB64,
                },
                null,
                2
              )}
            </pre>
            <p style={payloadNoteStyle}>
              Full ciphertext length: {lastEncryptedPayload.ciphertextB64.length} chars (truncated above).
            </p>
          </details>
        )}
      </section>

      <section style={sectionStyle}>
        <h2>Decrypted Records</h2>
        {loadingList ? (
          <p>Loading records...</p>
        ) : records.length === 0 ? (
          <p>No records yet.</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Seller</th>
                <th>Sales Person</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.productName}</td>
                  <td>{r.price}</td>
                  <td>{r.seller}</td>
                  <td>{r.salesPerson}</td>
                  <td>{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: "2rem auto",
  padding: "1rem 2rem",
  fontFamily: "system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "1.5rem",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "2rem",
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "1rem",
};

const errorStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  color: "#b00020",
  fontSize: "0.9rem",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const payloadDetailsStyle: React.CSSProperties = {
  marginTop: "1rem",
  padding: "0.75rem",
  background: "#f5f5f5",
  borderRadius: 4,
  fontSize: "0.85rem",
};

const payloadPreStyle: React.CSSProperties = {
  margin: "0.5rem 0",
  overflow: "auto",
  fontFamily: "monospace",
};

const payloadNoteStyle: React.CSSProperties = {
  margin: 0,
  color: "#666",
  fontSize: "0.8rem",
};
