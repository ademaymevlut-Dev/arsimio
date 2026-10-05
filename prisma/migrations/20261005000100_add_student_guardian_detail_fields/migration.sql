SET search_path = public, pg_catalog;

ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "StudentStatus" ADD VALUE IF NOT EXISTS 'TRANSFERRED';

ALTER TABLE "persons"
  ADD COLUMN "occupation_text" VARCHAR(150),
  ADD COLUMN "photo_url" VARCHAR(500),
  ADD COLUMN "photo_storage_key" VARCHAR(300),
  ADD COLUMN "photo_mime_type" VARCHAR(80),
  ADD COLUMN "photo_updated_at" TIMESTAMPTZ(6);

ALTER TABLE "student_profiles"
  ADD COLUMN "residence_city" VARCHAR(120),
  ADD COLUMN "neighborhood" VARCHAR(120),
  ADD COLUMN "address_line" VARCHAR(500),
  ADD COLUMN "internal_note" VARCHAR(1000),
  ADD COLUMN "has_special_condition" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "special_condition_note" VARCHAR(1000);

ALTER TABLE "student_profiles"
  DROP CONSTRAINT IF EXISTS "student_profiles_status_date_check";

ALTER TABLE "student_profiles"
  ADD CONSTRAINT "student_profiles_status_date_check" CHECK (
    ("status" = 'ACTIVE' AND "inactive_on" IS NULL)
    OR ("status" IN ('INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED') AND "inactive_on" IS NOT NULL)
  );

CREATE TABLE "student_previous_education_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "student_profile_id" UUID NOT NULL,
  "grade_level_text" VARCHAR(50),
  "academic_year_text" VARCHAR(50),
  "school_name" VARCHAR(200),
  "success_text" VARCHAR(100),
  "transport_text" VARCHAR(100),
  "discount_text" VARCHAR(100),
  "note" VARCHAR(500),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "student_previous_education_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_previous_education_records_id_school_id_key"
  ON "student_previous_education_records"("id", "school_id");

CREATE INDEX "sper_student_lookup_idx"
  ON "student_previous_education_records"("school_id", "student_profile_id", "archived_at");

ALTER TABLE "student_previous_education_records"
  ADD CONSTRAINT "student_previous_education_records_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "student_previous_education_records"
  ADD CONSTRAINT "student_previous_education_records_student_profile_id_school_id_fkey"
  FOREIGN KEY ("student_profile_id", "school_id") REFERENCES "student_profiles"("id", "school_id")
  ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "guardian_relationships"
  ADD COLUMN "is_financial_responsible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "note" VARCHAR(500);

CREATE INDEX "guardian_relationships_financial_idx"
  ON "guardian_relationships"("school_id", "student_profile_id", "is_financial_responsible");

CREATE UNIQUE INDEX "guardian_relationships_one_financial_active_key"
  ON "guardian_relationships"("school_id", "student_profile_id")
  WHERE "archived_at" IS NULL AND "is_financial_responsible" = true;
