import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function getKey(): Buffer {
  const hex = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY;
  if (!hex) throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY is not set.");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars).");
  return key;
}

/** AES-256-GCM, random IV per call. Stored format: "<iv-hex>:<authTag-hex>:<ciphertext-hex>". */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) throw new Error("Malformed encrypted secret.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf-8");
}
