import { useState } from "react";
import { loginRequest, registerRequest } from "../api/client";
import { deriveAesKeyFromPassword } from "../crypto/e2ee";
import { setSessionKey } from "../session/sessionKeyStore";

interface LoginPageProps {
  onLoggedIn: () => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (isRegister) {
        await registerRequest(username, password);
        setError(null);
        setInfo("Account created. Please log in.");
        setIsRegister(false);
        setPassword("");
        setLoading(false);
        return;
      }

      const { token, saltB64 } = await loginRequest(username, password);
      const key = await deriveAesKeyFromPassword(password, saltB64);

      localStorage.setItem("authToken", token);
      setSessionKey(key);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h1>Secure Finance Records</h1>
      <form onSubmit={handleSubmit} style={formStyle}>
        <label>
          <span>Username</span>
          <input
            type="text"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete={isRegister ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div style={errorStyle}>{error}</div>}
        {info && !error && <div style={infoStyle}>{info}</div>}
        <button type="submit" disabled={loading}>
          {loading
            ? isRegister
              ? "Registering..."
              : "Logging in..."
            : isRegister
              ? "Register"
              : "Login"}
        </button>
      </form>
      <button
        type="button"
        style={linkStyle}
        onClick={() => {
          setIsRegister((v) => !v);
          setError(null);
          setInfo(null);
        }}
      >
        {isRegister ? "Back to Login" : "Create account"}
      </button>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 400,
  margin: "4rem auto",
  padding: "2rem",
  borderRadius: 8,
  border: "1px solid #ddd",
  fontFamily: "system-ui, sans-serif",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

const errorStyle: React.CSSProperties = {
  color: "#b00020",
  fontSize: "0.9rem",
};

const infoStyle: React.CSSProperties = {
  color: "#0b7a0b",
  fontSize: "0.9rem",
};

const linkStyle: React.CSSProperties = {
  marginTop: "0.5rem",
  background: "none",
  border: "none",
  color: "#666",
  cursor: "pointer",
  fontSize: "0.9rem",
  padding: 0,
};
