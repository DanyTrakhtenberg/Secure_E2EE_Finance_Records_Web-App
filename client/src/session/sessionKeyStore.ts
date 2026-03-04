let sessionKey: CryptoKey | null = null;

export function getSessionKey(): CryptoKey | null {
  return sessionKey;
}

export function setSessionKey(key: CryptoKey | null): void {
  sessionKey = key;
}

export function clearSessionKey(): void {
  sessionKey = null;
}
