import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
const sql = neon(process.env.DATABASE_URL);
const [tables, domains, schools] = await Promise.all([
  sql`SELECT (SELECT count(*)::int FROM public.schools) schools,
    (SELECT count(*)::int FROM public.users) users,
    (SELECT count(*)::int FROM public.user_credentials) password_accounts,
    (SELECT count(*)::int FROM public.auth_sessions WHERE revoked_at IS NULL AND expires_at > NOW()) active_sessions`,
  sql`SELECT hostname, status FROM public.school_domains ORDER BY hostname`,
  sql`SELECT s.id, s.slug, s.name, s.status,
    b.primary_color, b.secondary_color, b.accent_color,
    (b.logo_asset_key IS NOT NULL) AS has_logo,
    (SELECT count(*)::int FROM public.audit_events a
      WHERE a.school_id = s.id AND a.action IN ('platform.school.updated', 'platform.branding.updated')) AS settings_audit_count
    FROM public.schools s LEFT JOIN public.school_branding b ON b.school_id = s.id
    ORDER BY s.slug`,
]);
console.log(
  JSON.stringify(
    {
      tables,
      domains,
      schools,
    },
    null,
    2,
  ),
);
