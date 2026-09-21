import assert from "node:assert/strict";
import { request } from "node:http";

const live = process.argv.includes("--production");
let passed = 0;
function localRequest(host, path, extraHeaders) {
  // Native HTTP preserves explicit Host headers; fetch implementations may replace them.
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "localhost",
        port: 3000,
        path,
        headers: { host, ...extraHeaders },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () =>
          resolve(
            new Response(body, {
              status: res.statusCode,
              headers: res.headers,
            }),
          ),
        );
      },
    );
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("HTTP test timeout")));
    req.end();
  });
}
async function check(host, path, status, expectedText, extraHeaders = {}) {
  const response = live
    ? await fetch(`https://${host}${path}`, {
        headers: extraHeaders,
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
      })
    : await localRequest(host, path, extraHeaders);
  assert.equal(response.status, status, `${host}${path}`);
  const body = await response.text();
  if (expectedText)
    assert.ok(
      body.includes(expectedText),
      `${host}${path}: expected branding missing`,
    );
  if (status === 307) assert.equal(response.headers.get("location"), "/login");
  if (path === "/login" && status === 200) {
    assert.ok(
      body.includes(
        host === "arsimio.vercel.app" ? "E-posta adresi" : "Kullanıcı adı",
      ),
    );
    if (host !== "arsimio.vercel.app")
      assert.ok(!body.includes('type="email"'));
    assert.match(
      response.headers.get("cache-control") ?? "",
      live ? /no-store/ : /no-cache|no-store/,
    );
    if (host === "horizonedu.vercel.app")
      assert.ok(!body.includes("GjimCamEdu"));
    if (host === "gjimcamedu.vercel.app")
      assert.ok(!body.includes("HorizonEdu"));
  }
  passed++;
  console.log(`PASS ${host}${path} => ${status}`);
}
await check("arsimio.vercel.app", "/login", 200, "Süper Admin");
await check("arsimio.vercel.app", "/platform", 307);
await check("arsimio.vercel.app", "/platform/schools", 307);
await check("arsimio.vercel.app", "/platform/ui", 307);
await check(
  "arsimio.vercel.app",
  "/platform/schools/415710ba-0d83-4d4a-aa3f-f51cb9dff36b",
  307,
);
await check("arsimio.vercel.app", "/setup", 200, "İlk yönetici hesabı");
for (const [host, name] of [
  ["horizonedu.vercel.app", "HorizonEdu"],
  ["gjimcamedu.vercel.app", "GjimCamEdu"],
]) {
  await check(host, "/login", 200, name);
  await check(host, "/dashboard", 307);
  await check(host, "/platform", 404);
  await check(host, "/platform/schools", 404);
  await check(host, "/platform/ui", 404);
  await check(
    host,
    "/platform/schools/415710ba-0d83-4d4a-aa3f-f51cb9dff36b",
    404,
  );
  await check(host, "/setup", 404);
  await check(host, "/api/auth/admin/list-users", 404);
}
if (!live)
  await check("unknown.invalid", "/login", 404, null, {
    "x-forwarded-host": "arsimio.vercel.app",
    "x-school-id": "fake",
    "x-tenant-id": "fake",
  });
console.log(
  `${passed} HTTP checks passed. Authenticated/session-isolation acceptance remains separate.`,
);
