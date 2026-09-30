BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Published schedule versions are immutable. A new draft clones their labels,
-- so the same localized period name must be allowed in multiple versions.
DROP INDEX "spt_school_locale_name_key";

COMMIT;
