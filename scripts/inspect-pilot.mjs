import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const [tables, domains, authColumns] = await Promise.all([
  sql`SELECT (SELECT count(*)::int FROM public.schools) schools,
    (SELECT count(*)::int FROM public.users) users,
    (SELECT count(*)::int FROM neon_auth.user) auth_users`,
  sql`SELECT hostname, status FROM public.school_domains ORDER BY hostname`,
  sql`SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'neon_auth' AND table_name = 'project_config' ORDER BY ordinal_position`,
]);
const auth = await sql`SELECT trusted_origins, allow_localhost,
  email_and_password->>'enabled' AS password_enabled,
  email_and_password->>'requireEmailVerification' AS verification_required,
  email_provider IS NOT NULL AS email_provider_configured
  FROM neon_auth.project_config`;
console.log(
  JSON.stringify(
    {
      tables,
      domains,
      authConfigColumns: authColumns.map((r) => r.column_name),
      auth,
    },
    null,
    2,
  ),
);
