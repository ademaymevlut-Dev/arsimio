import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { normalizeEmail } from "../src/server/auth/identifiers";
import { activateBootstrap } from "../src/server/auth/bootstrap";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
assert.ok(
  process.stdin.isTTY && process.stdout.isTTY,
  "Kendi terminalinizde çalıştırın. Parolayı argüman, env veya pipe ile vermeyin.",
);
assert.equal(process.argv.length, 2, "Bu komut parola/argüman kabul etmez.");
const link = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
assert.equal(
  link.projectId,
  "prj_TDX4sLtnwUpiYpvWZjOZqqkzqfNR",
  "Yalnız Arsimio projesi desteklenir.",
);
const email = normalizeEmail(process.env.ARSIMIO_BOOTSTRAP_ADMIN_EMAIL ?? "");
assert.ok(email, "ARSIMIO_BOOTSTRAP_ADMIN_EMAIL ayarlanmalı.");
assert.ok(process.env.DATABASE_URL, "DATABASE_URL ayarlanmalı.");
neonConfig.webSocketConstructor = globalThis.WebSocket;
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});
let muted = false;
const output = new Writable({
  write(chunk, encoding, done) {
    if (!muted) process.stdout.write(chunk, encoding);
    done();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
const cancelled = new AbortController();
rl.on("SIGINT", () => {
  cancelled.abort();
  rl.close();
});
async function secret(prompt: string) {
  const result = rl.question(prompt, { signal: cancelled.signal });
  muted = true;
  try {
    return await result;
  } finally {
    muted = false;
    process.stdout.write("\n");
  }
}
try {
  const user = await db.user.findUnique({
    where: { email },
    select: { status: true, credential: { select: { userId: true } } },
  });
  assert.ok(
    user?.status === "PENDING" && !user.credential,
    "Bu hesap için ilk kurulum açık değil. Mevcut parola değiştirilmeyecek.",
  );
  console.log(`Arsimio ilk yönetici: ${email}`);
  console.log(
    `DB hedefi: ${new URL(process.env.DATABASE_URL).hostname} (aynı DB'yi kullanan ortamlara uygulanır)`,
  );
  assert.equal(
    (
      await rl.question(
        "Bu hesabın ilk parolasını belirlemek için EVET yazın: ",
        { signal: cancelled.signal },
      )
    ).trim(),
    "EVET",
    "İşlem iptal edildi.",
  );
  let password = await secret(
    "Yeni parola (12–128 karakter, ekranda görünmez): ",
  );
  let confirmation = await secret("Parolayı tekrar girin: ");
  assert.equal(password === confirmation, true, "Parolalar eşleşmiyor.");
  const hash = await hashPassword(password);
  password = "";
  confirmation = "";
  await db.$transaction((tx) => activateBootstrap(tx, email, hash), {
    timeout: 15000,
  });
  console.log(
    "Yönetici hesabı etkinleştirildi. Yeni sürüm yayınlandıktan sonra ana domain'de e-posta + parolanızla giriş yapın.",
  );
} catch (error) {
  // Do not dump DB/Prisma errors, which may contain query parameters such as the password hash.
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : "Kurulum tamamlanamadı. Hesap/migration durumunu kontrol edin; parola veya hash paylaşmayın.",
  );
  process.exitCode = 1;
} finally {
  muted = false;
  rl.close();
  await db.$disconnect();
}
