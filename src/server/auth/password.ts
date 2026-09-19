import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// OWASP scrypt option: N=2^15, r=8, p=3 (32 MiB). No custom cryptographic primitive.
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const prefix = "scrypt-v1$32768$8$3";
export const MIN_PASSWORD_LENGTH = 12;

export function isValidPassword(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= 128;
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string) {
  if (!isValidPassword(password))
    throw new Error("Parola 12–128 karakter olmalı.");
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `${prefix}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encoded: string | null | undefined,
) {
  if (!isValidPassword(password)) return false;
  const match =
    /^scrypt-v1\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(
      encoded ?? "",
    );
  // Missing/disabled accounts still incur the same KDF work; no fast username oracle.
  const actual = await derive(
    password,
    match ? Buffer.from(match[1], "hex") : Buffer.alloc(16),
  );
  const expected = match ? Buffer.from(match[2], "hex") : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && match !== null;
}
