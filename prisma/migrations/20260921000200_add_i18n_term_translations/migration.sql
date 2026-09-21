BEGIN;
SET LOCAL search_path = public, pg_catalog;

ALTER TABLE "schools"
  ADD CONSTRAINT "schools_default_locale_check"
  CHECK ("default_locale" IN ('tr', 'sq', 'en'));

ALTER TABLE "school_memberships"
  ADD COLUMN "preferred_locale" VARCHAR(10),
  ADD CONSTRAINT "school_memberships_preferred_locale_check"
  CHECK ("preferred_locale" IS NULL OR "preferred_locale" IN ('tr', 'sq', 'en'));

CREATE TABLE "academic_term_translations" (
  "academic_term_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "academic_term_translations_pkey" PRIMARY KEY ("academic_term_id", "locale"),
  CONSTRAINT "academic_term_translations_locale_check" CHECK ("locale" IN ('tr', 'sq', 'en')),
  CONSTRAINT "academic_term_translations_name_check" CHECK (char_length(btrim("name")) BETWEEN 2 AND 100)
);

CREATE INDEX "academic_term_translations_school_id_locale_idx"
  ON "academic_term_translations"("school_id", "locale");

ALTER TABLE "academic_term_translations"
  ADD CONSTRAINT "academic_term_translations_academic_term_id_school_id_fkey"
  FOREIGN KEY ("academic_term_id", "school_id")
  REFERENCES "academic_terms"("id", "school_id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "academic_term_translations"
  ADD CONSTRAINT "academic_term_translations_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

INSERT INTO "academic_term_translations" (
  "academic_term_id",
  "school_id",
  "locale",
  "name",
  "created_at",
  "updated_at"
)
SELECT
  term."id",
  term."school_id",
  school."default_locale",
  term."name",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "academic_terms" term
JOIN "schools" school ON school."id" = term."school_id"
ON CONFLICT ("academic_term_id", "locale") DO NOTHING;

COMMIT;
