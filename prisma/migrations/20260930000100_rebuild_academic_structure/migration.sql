BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Pilot academic structure rows are intentionally replaced. Subjects and their
-- translations are school-wide master data and remain untouched.
DROP TABLE "course_offerings";
DROP TABLE "lesson_period_translations";
DROP TABLE "lesson_periods";
DROP TABLE "class_sections";
DROP TABLE "grade_levels";
DROP TABLE "education_stage_translations";
DROP TABLE "education_stages";
DROP FUNCTION IF EXISTS "validate_lesson_period_change"();

CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "ScheduleProfileKind" AS ENUM ('FULL_DAY', 'MORNING', 'AFTERNOON', 'UNCLASSIFIED');
CREATE TYPE "AcademicYearSetupStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY', 'FAILED');
CREATE TYPE "AcademicYearClassSectionStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CourseOfferingSource" AS ENUM ('CURRICULUM', 'MANUAL');
CREATE TYPE "AcademicYearSetupRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "education_stage_definitions" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "default_name" VARCHAR(100) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "education_stage_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "education_stage_definitions_code_check" CHECK (btrim("code") <> ''),
  CONSTRAINT "education_stage_definitions_name_check" CHECK (btrim("default_name") <> ''),
  CONSTRAINT "education_stage_definitions_sequence_check" CHECK ("sequence" BETWEEN 1 AND 100)
);

CREATE TABLE "education_stage_definition_translations" (
  "education_stage_definition_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "education_stage_definition_translations_pkey" PRIMARY KEY ("education_stage_definition_id", "locale"),
  CONSTRAINT "education_stage_definition_translations_locale_check" CHECK ("locale" IN ('tr', 'sq', 'en')),
  CONSTRAINT "education_stage_definition_translations_name_check" CHECK (btrim("name") <> '')
);

CREATE TABLE "grade_level_definitions" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "display_label" VARCHAR(100) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "grade_level_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "grade_level_definitions_code_check" CHECK (btrim("code") <> ''),
  CONSTRAINT "grade_level_definitions_label_check" CHECK (btrim("display_label") <> ''),
  CONSTRAINT "grade_level_definitions_sequence_check" CHECK ("sequence" BETWEEN 1 AND 200)
);

CREATE TABLE "class_section_definitions" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "grade_level_definition_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "display_label" VARCHAR(100),
  "sequence" INTEGER NOT NULL DEFAULT 1,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "class_section_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "class_section_definitions_code_check" CHECK (btrim("code") <> ''),
  CONSTRAINT "class_section_definitions_sequence_check" CHECK ("sequence" BETWEEN 1 AND 100)
);

CREATE TABLE "academic_structure_versions" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMPTZ(6),
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "academic_structure_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academic_structure_versions_name_check" CHECK (btrim("name") <> '')
);

CREATE TABLE "academic_structure_levels" (
  "academic_structure_version_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "grade_level_definition_id" UUID NOT NULL,
  "education_stage_definition_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  CONSTRAINT "academic_structure_levels_pkey" PRIMARY KEY ("academic_structure_version_id", "grade_level_definition_id"),
  CONSTRAINT "academic_structure_levels_sequence_check" CHECK ("sequence" BETWEEN 1 AND 200)
);

CREATE TABLE "curriculum_versions" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMPTZ(6),
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "curriculum_versions_name_check" CHECK (btrim("name") <> ''),
  CONSTRAINT "curriculum_versions_revision_check" CHECK ("revision" > 0)
);

CREATE TABLE "curriculum_items" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "curriculum_version_id" UUID NOT NULL,
  "grade_level_definition_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "delivery_type" "SubjectTrack" NOT NULL DEFAULT 'GENERAL',
  "grading_bucket" VARCHAR(100),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "curriculum_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academic_year_curricula" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "grade_level_definition_id" UUID NOT NULL,
  "curriculum_version_id" UUID NOT NULL,
  "valid_from" DATE NOT NULL,
  "valid_to" DATE NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academic_year_curricula_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academic_year_curricula_dates_check" CHECK ("valid_to" >= "valid_from")
);

CREATE TABLE "schedule_profiles" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "kind" "ScheduleProfileKind" NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "schedule_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "schedule_profiles_code_check" CHECK (btrim("code") <> ''),
  CONSTRAINT "schedule_profiles_name_check" CHECK (btrim("name") <> '')
);

CREATE TABLE "schedule_profile_versions" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "schedule_profile_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "schedule_profile_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "schedule_profile_versions_version_check" CHECK ("version" > 0)
);

CREATE TABLE "schedule_periods" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "schedule_profile_version_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "default_name" VARCHAR(100) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "start_time" TIME(0) NOT NULL,
  "end_time" TIME(0) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "schedule_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "schedule_periods_code_check" CHECK (btrim("code") <> ''),
  CONSTRAINT "schedule_periods_name_check" CHECK (btrim("default_name") <> ''),
  CONSTRAINT "schedule_periods_sequence_check" CHECK ("sequence" BETWEEN 1 AND 100),
  CONSTRAINT "schedule_periods_time_check" CHECK ("end_time" > "start_time")
);

CREATE TABLE "schedule_period_translations" (
  "schedule_period_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "schedule_period_translations_pkey" PRIMARY KEY ("schedule_period_id", "locale"),
  CONSTRAINT "schedule_period_translations_locale_check" CHECK ("locale" IN ('tr', 'sq', 'en')),
  CONSTRAINT "schedule_period_translations_name_check" CHECK (btrim("name") <> '')
);

CREATE TABLE "academic_year_class_sections" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "class_section_definition_id" UUID NOT NULL,
  "schedule_profile_version_id" UUID,
  "status" "AcademicYearClassSectionStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "academic_year_class_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_offerings" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "academic_year_class_section_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "curriculum_item_id" UUID,
  "source" "CourseOfferingSource" NOT NULL DEFAULT 'CURRICULUM',
  "valid_from" DATE NOT NULL,
  "valid_to" DATE NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "course_offerings_dates_check" CHECK ("valid_to" >= "valid_from")
);

CREATE TABLE "academic_year_setup_runs" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(191) NOT NULL,
  "status" "AcademicYearSetupRunStatus" NOT NULL DEFAULT 'RUNNING',
  "input_snapshot" JSONB NOT NULL,
  "result_summary" JSONB,
  "started_by_id" UUID,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMPTZ(6),
  "error_summary" VARCHAR(1000),
  CONSTRAINT "academic_year_setup_runs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "academic_years"
  ADD COLUMN "academic_structure_version_id" UUID,
  ADD COLUMN "setup_completed_at" TIMESTAMPTZ(6),
  ADD COLUMN "setup_status" "AcademicYearSetupStatus" NOT NULL DEFAULT 'NOT_STARTED';

CREATE UNIQUE INDEX "education_stage_definitions_school_id_code_key" ON "education_stage_definitions"("school_id", "code");
CREATE UNIQUE INDEX "education_stage_definitions_id_school_id_key" ON "education_stage_definitions"("id", "school_id");
CREATE INDEX "education_stage_definitions_school_id_archived_at_sequence_idx" ON "education_stage_definitions"("school_id", "archived_at", "sequence");
CREATE UNIQUE INDEX "esdt_school_locale_name_key" ON "education_stage_definition_translations"("school_id", "locale", "name");
CREATE INDEX "education_stage_definition_translations_school_id_locale_idx" ON "education_stage_definition_translations"("school_id", "locale");
CREATE UNIQUE INDEX "grade_level_definitions_school_id_code_key" ON "grade_level_definitions"("school_id", "code");
CREATE UNIQUE INDEX "grade_level_definitions_id_school_id_key" ON "grade_level_definitions"("id", "school_id");
CREATE INDEX "grade_level_definitions_school_id_archived_at_sequence_idx" ON "grade_level_definitions"("school_id", "archived_at", "sequence");
CREATE UNIQUE INDEX "csd_school_grade_code_key" ON "class_section_definitions"("school_id", "grade_level_definition_id", "code");
CREATE UNIQUE INDEX "class_section_definitions_id_school_id_key" ON "class_section_definitions"("id", "school_id");
CREATE INDEX "csd_school_archived_grade_sequence_idx" ON "class_section_definitions"("school_id", "archived_at", "grade_level_definition_id", "sequence");
CREATE UNIQUE INDEX "academic_structure_versions_school_id_name_key" ON "academic_structure_versions"("school_id", "name");
CREATE UNIQUE INDEX "academic_structure_versions_id_school_id_key" ON "academic_structure_versions"("id", "school_id");
CREATE INDEX "academic_structure_versions_school_id_status_created_at_idx" ON "academic_structure_versions"("school_id", "status", "created_at");
CREATE UNIQUE INDEX "academic_structure_levels_academic_structure_version_id_seq_key" ON "academic_structure_levels"("academic_structure_version_id", "sequence");
CREATE INDEX "academic_structure_levels_school_id_education_stage_definit_idx" ON "academic_structure_levels"("school_id", "education_stage_definition_id");
CREATE UNIQUE INDEX "curriculum_versions_school_id_name_revision_key" ON "curriculum_versions"("school_id", "name", "revision");
CREATE UNIQUE INDEX "curriculum_versions_id_school_id_key" ON "curriculum_versions"("id", "school_id");
CREATE INDEX "curriculum_versions_school_id_status_created_at_idx" ON "curriculum_versions"("school_id", "status", "created_at");
CREATE UNIQUE INDEX "ci_version_grade_subject_key" ON "curriculum_items"("curriculum_version_id", "grade_level_definition_id", "subject_id");
CREATE UNIQUE INDEX "curriculum_items_id_school_id_key" ON "curriculum_items"("id", "school_id");
CREATE INDEX "curriculum_items_school_id_grade_level_definition_id_idx" ON "curriculum_items"("school_id", "grade_level_definition_id");
CREATE UNIQUE INDEX "ayc_year_grade_version_from_key" ON "academic_year_curricula"("academic_year_id", "grade_level_definition_id", "curriculum_version_id", "valid_from");
CREATE UNIQUE INDEX "academic_year_curricula_id_school_id_key" ON "academic_year_curricula"("id", "school_id");
CREATE INDEX "ayc_scope_validity_idx" ON "academic_year_curricula"("school_id", "academic_year_id", "grade_level_definition_id", "valid_from", "valid_to");
CREATE UNIQUE INDEX "schedule_profiles_school_id_code_key" ON "schedule_profiles"("school_id", "code");
CREATE UNIQUE INDEX "schedule_profiles_id_school_id_key" ON "schedule_profiles"("id", "school_id");
CREATE INDEX "schedule_profiles_school_id_archived_at_kind_idx" ON "schedule_profiles"("school_id", "archived_at", "kind");
CREATE UNIQUE INDEX "schedule_profile_versions_schedule_profile_id_version_key" ON "schedule_profile_versions"("schedule_profile_id", "version");
CREATE UNIQUE INDEX "schedule_profile_versions_id_school_id_key" ON "schedule_profile_versions"("id", "school_id");
CREATE INDEX "schedule_profile_versions_school_id_status_schedule_profile_idx" ON "schedule_profile_versions"("school_id", "status", "schedule_profile_id");
CREATE UNIQUE INDEX "schedule_periods_schedule_profile_version_id_code_key" ON "schedule_periods"("schedule_profile_version_id", "code");
CREATE UNIQUE INDEX "schedule_periods_schedule_profile_version_id_sequence_key" ON "schedule_periods"("schedule_profile_version_id", "sequence");
CREATE UNIQUE INDEX "schedule_periods_id_school_id_key" ON "schedule_periods"("id", "school_id");
CREATE INDEX "schedule_periods_school_id_schedule_profile_version_id_star_idx" ON "schedule_periods"("school_id", "schedule_profile_version_id", "start_time");
CREATE UNIQUE INDEX "spt_school_locale_name_key" ON "schedule_period_translations"("school_id", "locale", "name");
CREATE INDEX "schedule_period_translations_school_id_locale_idx" ON "schedule_period_translations"("school_id", "locale");
CREATE UNIQUE INDEX "aycs_year_section_definition_key" ON "academic_year_class_sections"("academic_year_id", "class_section_definition_id");
CREATE UNIQUE INDEX "academic_year_class_sections_id_school_id_academic_year_id_key" ON "academic_year_class_sections"("id", "school_id", "academic_year_id");
CREATE INDEX "academic_year_class_sections_school_id_academic_year_id_sta_idx" ON "academic_year_class_sections"("school_id", "academic_year_id", "status");
CREATE UNIQUE INDEX "co_year_section_subject_from_key" ON "course_offerings"("academic_year_id", "academic_year_class_section_id", "subject_id", "valid_from");
CREATE UNIQUE INDEX "course_offerings_id_school_id_key" ON "course_offerings"("id", "school_id");
CREATE INDEX "co_scope_archived_idx" ON "course_offerings"("school_id", "academic_year_id", "archived_at");
CREATE INDEX "co_subject_school_idx" ON "course_offerings"("subject_id", "school_id");
CREATE UNIQUE INDEX "academic_year_setup_runs_school_id_idempotency_key_key" ON "academic_year_setup_runs"("school_id", "idempotency_key");
CREATE INDEX "academic_year_setup_runs_school_id_academic_year_id_started_idx" ON "academic_year_setup_runs"("school_id", "academic_year_id", "started_at");

ALTER TABLE "education_stage_definitions" ADD CONSTRAINT "education_stage_definitions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "education_stage_definition_translations" ADD CONSTRAINT "esdt_definition_school_fkey" FOREIGN KEY ("education_stage_definition_id", "school_id") REFERENCES "education_stage_definitions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "education_stage_definition_translations" ADD CONSTRAINT "esdt_school_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "grade_level_definitions" ADD CONSTRAINT "grade_level_definitions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "class_section_definitions" ADD CONSTRAINT "class_section_definitions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "class_section_definitions" ADD CONSTRAINT "csd_grade_school_fkey" FOREIGN KEY ("grade_level_definition_id", "school_id") REFERENCES "grade_level_definitions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_structure_versions" ADD CONSTRAINT "academic_structure_versions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_structure_versions" ADD CONSTRAINT "academic_structure_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE "academic_structure_levels" ADD CONSTRAINT "academic_structure_levels_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_structure_levels" ADD CONSTRAINT "asl_version_school_fkey" FOREIGN KEY ("academic_structure_version_id", "school_id") REFERENCES "academic_structure_versions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_structure_levels" ADD CONSTRAINT "asl_grade_school_fkey" FOREIGN KEY ("grade_level_definition_id", "school_id") REFERENCES "grade_level_definitions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_structure_levels" ADD CONSTRAINT "asl_stage_school_fkey" FOREIGN KEY ("education_stage_definition_id", "school_id") REFERENCES "education_stage_definitions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE "curriculum_items" ADD CONSTRAINT "curriculum_items_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "curriculum_items" ADD CONSTRAINT "ci_version_school_fkey" FOREIGN KEY ("curriculum_version_id", "school_id") REFERENCES "curriculum_versions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "curriculum_items" ADD CONSTRAINT "ci_grade_school_fkey" FOREIGN KEY ("grade_level_definition_id", "school_id") REFERENCES "grade_level_definitions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "curriculum_items" ADD CONSTRAINT "ci_subject_school_fkey" FOREIGN KEY ("subject_id", "school_id") REFERENCES "subjects"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_curricula" ADD CONSTRAINT "academic_year_curricula_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_curricula" ADD CONSTRAINT "ayc_year_school_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_curricula" ADD CONSTRAINT "ayc_grade_school_fkey" FOREIGN KEY ("grade_level_definition_id", "school_id") REFERENCES "grade_level_definitions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_curricula" ADD CONSTRAINT "ayc_curriculum_school_fkey" FOREIGN KEY ("curriculum_version_id", "school_id") REFERENCES "curriculum_versions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "schedule_profiles" ADD CONSTRAINT "schedule_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "schedule_profile_versions" ADD CONSTRAINT "schedule_profile_versions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "schedule_profile_versions" ADD CONSTRAINT "spv_profile_school_fkey" FOREIGN KEY ("schedule_profile_id", "school_id") REFERENCES "schedule_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "schedule_periods" ADD CONSTRAINT "schedule_periods_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "schedule_periods" ADD CONSTRAINT "schedule_periods_version_school_fkey" FOREIGN KEY ("schedule_profile_version_id", "school_id") REFERENCES "schedule_profile_versions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "schedule_period_translations" ADD CONSTRAINT "spt_period_school_fkey" FOREIGN KEY ("schedule_period_id", "school_id") REFERENCES "schedule_periods"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "schedule_period_translations" ADD CONSTRAINT "spt_school_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_class_sections" ADD CONSTRAINT "academic_year_class_sections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_class_sections" ADD CONSTRAINT "aycs_year_school_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_class_sections" ADD CONSTRAINT "aycs_definition_school_fkey" FOREIGN KEY ("class_section_definition_id", "school_id") REFERENCES "class_section_definitions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_class_sections" ADD CONSTRAINT "aycs_profile_version_school_fkey" FOREIGN KEY ("schedule_profile_version_id", "school_id") REFERENCES "schedule_profile_versions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_offerings" ADD CONSTRAINT "co_year_section_school_fkey" FOREIGN KEY ("academic_year_class_section_id", "school_id", "academic_year_id") REFERENCES "academic_year_class_sections"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_subject_id_school_id_fkey" FOREIGN KEY ("subject_id", "school_id") REFERENCES "subjects"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_offerings" ADD CONSTRAINT "co_curriculum_item_school_fkey" FOREIGN KEY ("curriculum_item_id", "school_id") REFERENCES "curriculum_items"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_setup_runs" ADD CONSTRAINT "academic_year_setup_runs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_setup_runs" ADD CONSTRAINT "aysr_year_school_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_year_setup_runs" ADD CONSTRAINT "academic_year_setup_runs_started_by_id_fkey" FOREIGN KEY ("started_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_structure_version_school_fkey" FOREIGN KEY ("academic_structure_version_id", "school_id") REFERENCES "academic_structure_versions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION "validate_schedule_period_change"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "schedule_periods" other
     WHERE other."schedule_profile_version_id" = NEW."schedule_profile_version_id"
       AND other."school_id" = NEW."school_id"
       AND other."id" <> NEW."id"
       AND other."start_time" < NEW."end_time"
       AND other."end_time" > NEW."start_time"
  ) THEN
    RAISE EXCEPTION 'schedule periods cannot overlap';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER "schedule_period_change_guard"
BEFORE INSERT OR UPDATE OF "school_id", "schedule_profile_version_id", "start_time", "end_time" ON "schedule_periods"
FOR EACH ROW EXECUTE FUNCTION "validate_schedule_period_change"();

COMMIT;
