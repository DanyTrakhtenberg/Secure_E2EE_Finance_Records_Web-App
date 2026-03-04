import type { LoginResponse, EncryptedRecord } from "../types";

const API_BASE = "";

export async function registerRequest(
  username: string,
  password: string
): Promise<void> {
  const resp = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || "Registration failed");
  }
}

export async function loginRequest(
  username: string,
  password: string
): Promise<LoginResponse> {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!resp.ok) {
    throw new Error("Login failed");
  }

  return (await resp.json()) as LoginResponse;
}

function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

export async function createRecordRequest(payload: {
  ciphertextB64: string;
  ivB64: string;
}): Promise<{ id: number }> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const resp = await fetch(`${API_BASE}/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error("Failed to create record");
  }

  return (await resp.json()) as { id: number };
}

export async function fetchRecordsRequest(): Promise<EncryptedRecord[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const resp = await fetch(`${API_BASE}/records`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    throw new Error("Failed to fetch records");
  }

  return (await resp.json()) as EncryptedRecord[];
}
