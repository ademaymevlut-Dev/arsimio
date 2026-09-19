import { getAuth } from "@/server/auth/server";
import { getTenantContext } from "@/server/tenancy/context";

// This slice exposes only verification; no open sign-up/admin/organization proxy.
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  await getTenantContext();
  const { path } = await context.params;
  if (path.join("/") !== "verify-email")
    return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const callback = url.searchParams.get("callbackURL");
  if (callback && callback !== `${url.origin}/login`)
    return new Response(null, { status: 400 });
  return getAuth().handler().GET(request, context);
}
