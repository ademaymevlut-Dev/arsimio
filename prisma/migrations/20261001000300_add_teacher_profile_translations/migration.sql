CREATE TABLE "teacher_profile_translations" (
  "teacher_profile_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "teacher_profile_translations_pkey" PRIMARY KEY ("teacher_profile_id", "locale"),
  CONSTRAINT "teacher_profile_translations_locale_check" CHECK ("locale" IN ('tr', 'sq', 'en'))
);

CREATE INDEX "teacher_profile_translations_school_locale_idx"
  ON "teacher_profile_translations"("school_id", "locale");

ALTER TABLE "teacher_profile_translations"
  ADD CONSTRAINT "teacher_profile_translations_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "teacher_profile_translations"
  ADD CONSTRAINT "teacher_profile_translations_profile_id_school_id_fkey"
  FOREIGN KEY ("teacher_profile_id", "school_id") REFERENCES "teacher_profiles"("id", "school_id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

INSERT INTO "teacher_profile_translations" (
  "teacher_profile_id",
  "school_id",
  "locale",
  "title",
  "created_at",
  "updated_at"
)
SELECT
  tp."id",
  tp."school_id",
  locales."locale",
  tp."title",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "teacher_profiles" tp
CROSS JOIN (VALUES ('tr'), ('sq'), ('en')) AS locales("locale")
ON CONFLICT ("teacher_profile_id", "locale") DO NOTHING;
