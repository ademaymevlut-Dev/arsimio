import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const [tables, domains] = await Promise.all([
  sql`SELECT (SELECT count(*)::int FROM public.schools) schools,
    (SELECT count(*)::int FROM public.users) users,
    (SELECT count(*)::int FROM public.user_credentials) password_accounts,
    (SELECT count(*)::int FROM public.auth_sessions WHERE revoked_at IS NULL AND expires_at > NOW()) active_sessions`,
  sql`SELECT hostname, status FROM public.school_domains ORDER BY hostname`,
]);
console.log(
  JSON.stringify(
    {
      tables,
      domains,
    },
    null,
    2,
  ),
);
