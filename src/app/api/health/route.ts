import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      service: "arsimio",
      database: "connected",
    });
  } catch {
    return Response.json(
      {
        status: "error",
        service: "arsimio",
        database: "unavailable",
      },
      { status: 503 },
    );
  }
}
