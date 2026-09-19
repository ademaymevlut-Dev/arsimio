import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  arsimioPrisma?: PrismaClient;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL tanımlı değil. Neon bağlantı adresini .env.local dosyasına veya Vercel ortam değişkenlerine ekleyin.",
    );
  }

  const adapter = new PrismaNeon({ connectionString: databaseUrl });

  return new PrismaClient({ adapter });
}

export function getPrisma() {
  if (!globalForPrisma.arsimioPrisma) {
    globalForPrisma.arsimioPrisma = createPrismaClient();
  }

  return globalForPrisma.arsimioPrisma;
}
