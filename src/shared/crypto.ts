import type { EncryptedSecret } from "./schema";

const CRYPTO_KEY_STORAGE_KEY = "chattree.crypto.localWrappingKey";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function getLocalWrappingKeyMaterial(): Promise<string> {
  const stored = await chrome.storage.local.get(CRYPTO_KEY_STORAGE_KEY);
  const existing = stored[CRYPTO_KEY_STORAGE_KEY] as string | undefined;
  if (existing) {
    return existing;
  }

  const material = new Uint8Array(32);
  crypto.getRandomValues(material);
  const encoded = bytesToBase64(material);
  await chrome.storage.local.set({ [CRYPTO_KEY_STORAGE_KEY]: encoded });
  return encoded;
}

async function getLocalWrappingKey(): Promise<CryptoKey> {
  const material = await getLocalWrappingKeyMaterial();
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(base64ToBytes(material)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptString(plaintext: string): Promise<EncryptedSecret> {
  const key = await getLocalWrappingKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoder.encode(plaintext))
  );

  return {
    algorithm: "AES-GCM",
    version: 1,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString()
  };
}

export async function decryptString(secret: EncryptedSecret): Promise<string> {
  const key = await getLocalWrappingKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(base64ToBytes(secret.iv)) },
    key,
    toArrayBuffer(base64ToBytes(secret.ciphertext))
  );
  return decoder.decode(plaintext);
}
