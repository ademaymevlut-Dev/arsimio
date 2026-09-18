import { neon } from "@neondatabase/serverless";

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL tanımlı değil. Neon bağlantı adresini .env.local dosyasına veya Vercel ortam değişkenlerine ekleyin.",
    );
  }

  return neon(databaseUrl);
}
