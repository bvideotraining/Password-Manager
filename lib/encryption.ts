// lib/encryption.ts

// Web Crypto API based Zero-Knowledge Encryption
// AES-256-GCM, PBKDF2, SHA-256

const PBKDF2_ITERATIONS = 600000; // High iteration count for security
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export async function generateSalt(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export async function generateIV(): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

export async function deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"] as KeyUsage[]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"] as KeyUsage[]
  );
}

export async function encryptVaultItem(data: any, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = await generateIV();
  const encodedData = enc.encode(JSON.stringify(data));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
    },
    key,
    encodedData
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptVaultItem(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<any> {
  if (!ciphertextBase64 || !ivBase64) {
    throw new Error("Missing ciphertext or IV for decryption.");
  }

  try {
    const iv = new Uint8Array(base64ToBuffer(ivBase64));
    const encryptedBuffer = base64ToBuffer(ciphertextBase64);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as BufferSource,
      },
      key,
      encryptedBuffer
    );

    const dec = new TextDecoder();
    const decryptedString = dec.decode(decryptedBuffer);
    return JSON.parse(decryptedString);
  } catch (e) {
    console.error("Decryption failed", e);
    throw new Error("Decryption failed. Invalid key or corrupted data.");
  }
}

export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"] as KeyUsage[]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000, // Slightly lower for PIN but still secure
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"] as KeyUsage[]
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(exported);
}

export async function importKey(keyBase64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(keyBase64);
  return crypto.subtle.importKey(
    "raw",
    buffer,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"] as KeyUsage[]
  );
}

// Utility to convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBufferLike): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility to convert Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function generatePassword(length: number, options: { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean }): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+~`|}{[]:;?><,./-=";

  let chars = "";
  if (options.upper) chars += upper;
  if (options.lower) chars += lower;
  if (options.numbers) chars += numbers;
  if (options.symbols) chars += symbols;

  if (chars === "") chars = lower + numbers;

  let password = "";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length];
  }

  return password;
}

export function calculatePasswordStrength(password: string): number {
  let score = 0;
  if (!password) return score;

  if (password.length > 8) score += 10;
  if (password.length > 12) score += 20;
  if (password.length >= 16) score += 30;

  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  return Math.min(100, score);
}
