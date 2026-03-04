const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_HASH = "SHA-256";
const KEY_LENGTH_BITS = 256;
const AES_ALGO = "AES-GCM";
const IV_LENGTH_BYTES = 12;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface EncryptedPayload {
  ciphertextB64: string;
  ivB64: string;
}

export async function deriveAesKeyFromPassword(
  password: string,
  saltB64: string
): Promise<CryptoKey> {
  const passwordBytes = textEncoder.encode(password);
  const saltBytes = base64ToUint8Array(saltB64);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    baseKey,
    {
      name: AES_ALGO,
      length: KEY_LENGTH_BITS,
    },
    false,
    ["encrypt", "decrypt"]
  );

  return key;
}

export async function encryptJson<T>(
  data: T,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const json = JSON.stringify(data);
  const plaintextBytes = textEncoder.encode(json);

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: AES_ALGO,
      iv,
    },
    key,
    plaintextBytes
  );

  return {
    ciphertextB64: arrayBufferToBase64(ciphertext),
    ivB64: uint8ArrayToBase64(iv),
  };
}

export async function decryptJson<T>(
  ciphertextB64: string,
  ivB64: string,
  key: CryptoKey
): Promise<T> {
  const ciphertext = base64ToArrayBuffer(ciphertextB64);
  const iv = base64ToUint8Array(ivB64);

  if (iv.length !== IV_LENGTH_BYTES) {
    throw new Error(
      "Decryption failed (wrong password/key or data was modified)."
    );
  }

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: AES_ALGO,
        iv: iv as BufferSource,
      },
      key,
      ciphertext
    );

    const json = textDecoder.decode(new Uint8Array(plaintext));
    return JSON.parse(json) as T;
  } catch {
    throw new Error(
      "Decryption failed (wrong password/key or data was modified)."
    );
  }
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
