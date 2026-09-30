import "server-only";
import {
  createCipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import type { IdentityType } from "@/generated/prisma/client";

export class IdentityProtectionUnavailableError extends Error {
  constructor() {
    super("PERSON_IDENTITY_ENCRYPTION_KEY is unavailable");
    this.name = "IdentityProtectionUnavailableError";
  }
}

function encryptionKey(value = process.env.PERSON_IDENTITY_ENCRYPTION_KEY) {
  if (!value) throw new IdentityProtectionUnavailableError();
  const trimmed = value.trim();
  const decoded = /^[0-9a-f]{64}$/i.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");
  if (decoded.length !== 32) throw new IdentityProtectionUnavailableError();
  return decoded;
}

export function identityProtectionIsReady() {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function normalizeIdentity(value: string) {
  return value.normalize("NFKC").toUpperCase().replace(/[\s.-]+/g, "");
}

export function protectIdentity(
  schoolId: string,
  type: IdentityType,
  value: string,
  secret?: string,
) {
  const key = encryptionKey(secret);
  const normalized = normalizeIdentity(value);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`${schoolId}:${type}`, "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(value.trim(), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const lookupHash = createHmac("sha256", key)
    .update(`${schoolId}:${type}:${normalized}`)
    .digest("hex");
  const checksum = createHash("sha256").update(encrypted).digest("hex");

  return {
    encryptedValue: new Uint8Array(
      Buffer.concat([Buffer.from([1]), iv, tag, encrypted]),
    ),
    lookupHash,
    lastFour: normalized.slice(-4),
    checksum,
  };
}
