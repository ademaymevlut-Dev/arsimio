BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE TABLE "education_stages" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "education_stages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "education_stages_code_check" CHECK (btrim("code") <> ''),
  CONSTRAINT "education_stages_sequence_check" CHECK ("sequence" BETWEEN 1 AND 100)
);

CREATE TABLE "education_stage_translations" (
  "education_stage_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "education_stage_translations_pkey" PRIMARY KEY ("education_stage_id", "locale"),
  CONSTRAINT "education_stage_translations_locale_check" CHECK ("locale" IN ('tr', 'sq', 'en')),
  CONSTRAINT "education_stage_translations_name_check" CHECK (btrim("name") <> '')
);

CREATE TABLE "grade_levels" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "education_stage_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "grade_levels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "grade_levels_code_check" CHECK (btrim("code") <> ''),
  CONSTRAINT "grade_levels_sequence_check" CHECK ("sequence" BETWEEN 1 AND 200)
);

CREATE TABLE "class_sections" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "grade_level_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "class_sections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "class_sections_code_check" CHECK (btrim("code") <> '')
);

CREATE TABLE "subjects" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "subjects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subjects_name_check" CHECK (btrim("name") <> '')
);

CREATE TABLE "subject_translations" (
  "subject_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "subject_translations_pkey" PRIMARY KEY ("subject_id", "locale"),
  CONSTRAINT "subject_translations_locale_check" CHECK ("locale" IN ('tr', 'sq', 'en')),
  CONSTRAINT "subject_translations_name_check" CHECK (btrim("name") <> '')
);

CREATE TABLE "course_offerings" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "class_section_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lesson_periods" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "start_time" TIME(0) NOT NULL,
  "end_time" TIME(0) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "lesson_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lesson_periods_name_check" CHECK (btrim("name") <> ''),
  CONSTRAINT "lesson_periods_sequence_check" CHECK ("sequence" BETWEEN 1 AND 100),
  CONSTRAINT "lesson_periods_time_check" CHECK ("end_time" > "start_time")
);

CREATE TABLE "lesson_period_translations" (
  "lesson_period_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "lesson_period_translations_pkey" PRIMARY KEY ("lesson_period_id", "locale"),
  CONSTRAINT "lesson_period_translations_locale_check" CHECK ("locale" IN ('tr', 'sq', 'en')),
  CONSTRAINT "lesson_period_translations_name_check" CHECK (btrim("name") <> '')
);

CREATE UNIQUE INDEX "education_stages_academic_year_id_code_key" ON "education_stages"("academic_year_id", "code");
CREATE UNIQUE INDEX "education_stages_academic_year_id_sequence_key" ON "education_stages"("academic_year_id", "sequence");
CREATE UNIQUE INDEX "education_stages_id_school_id_academic_year_id_key" ON "education_stages"("id", "school_id", "academic_year_id");
CREATE INDEX "education_stages_school_id_academic_year_id_archived_at_sequence_idx" ON "education_stages"("school_id", "academic_year_id", "archived_at", "sequence");

CREATE UNIQUE INDEX "est_scope_locale_name_key" ON "education_stage_translations"("school_id", "academic_year_id", "locale", "name");
CREATE INDEX "est_scope_locale_idx" ON "education_stage_translations"("school_id", "academic_year_id", "locale");

CREATE UNIQUE INDEX "grade_levels_academic_year_id_code_key" ON "grade_levels"("academic_year_id", "code");
CREATE UNIQUE INDEX "grade_levels_academic_year_id_sequence_key" ON "grade_levels"("academic_year_id", "sequence");
CREATE UNIQUE INDEX "grade_levels_id_school_id_academic_year_id_key" ON "grade_levels"("id", "school_id", "academic_year_id");
CREATE INDEX "gl_scope_stage_archived_idx" ON "grade_levels"("school_id", "academic_year_id", "education_stage_id", "archived_at");

CREATE UNIQUE INDEX "cs_year_grade_code_key" ON "class_sections"("academic_year_id", "grade_level_id", "code");
CREATE UNIQUE INDEX "class_sections_id_school_id_academic_year_id_key" ON "class_sections"("id", "school_id", "academic_year_id");
CREATE INDEX "cs_scope_archived_idx" ON "class_sections"("school_id", "academic_year_id", "archived_at");

CREATE UNIQUE INDEX "subjects_id_school_id_key" ON "subjects"("id", "school_id");
CREATE INDEX "subjects_school_id_archived_at_name_idx" ON "subjects"("school_id", "archived_at", "name");

CREATE UNIQUE INDEX "st_school_locale_name_key" ON "subject_translations"("school_id", "locale", "name");
CREATE INDEX "st_school_locale_idx" ON "subject_translations"("school_id", "locale");

CREATE UNIQUE INDEX "co_year_section_subject_key" ON "course_offerings"("academic_year_id", "class_section_id", "subject_id");
CREATE UNIQUE INDEX "course_offerings_id_school_id_key" ON "course_offerings"("id", "school_id");
CREATE INDEX "co_scope_archived_idx" ON "course_offerings"("school_id", "academic_year_id", "archived_at");
CREATE INDEX "co_subject_school_idx" ON "course_offerings"("subject_id", "school_id");

CREATE UNIQUE INDEX "lesson_periods_academic_year_id_sequence_key" ON "lesson_periods"("academic_year_id", "sequence");
CREATE UNIQUE INDEX "lesson_periods_id_school_id_academic_year_id_key" ON "lesson_periods"("id", "school_id", "academic_year_id");
CREATE INDEX "lp_scope_archived_start_idx" ON "lesson_periods"("school_id", "academic_year_id", "archived_at", "start_time");

CREATE UNIQUE INDEX "lpt_scope_locale_name_key" ON "lesson_period_translations"("school_id", "academic_year_id", "locale", "name");
CREATE INDEX "lpt_scope_locale_idx" ON "lesson_period_translations"("school_id", "academic_year_id", "locale");

ALTER TABLE "education_stages" ADD CONSTRAINT "education_stages_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "education_stages" ADD CONSTRAINT "education_stages_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "education_stage_translations" ADD CONSTRAINT "education_stage_translations_education_stage_id_school_id_academic_year_id_fkey" FOREIGN KEY ("education_stage_id", "school_id", "academic_year_id") REFERENCES "education_stages"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "education_stage_translations" ADD CONSTRAINT "education_stage_translations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_education_stage_id_school_id_academic_year_id_fkey" FOREIGN KEY ("education_stage_id", "school_id", "academic_year_id") REFERENCES "education_stages"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_grade_level_id_school_id_academic_year_id_fkey" FOREIGN KEY ("grade_level_id", "school_id", "academic_year_id") REFERENCES "grade_levels"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "subject_translations" ADD CONSTRAINT "subject_translations_subject_id_school_id_fkey" FOREIGN KEY ("subject_id", "school_id") REFERENCES "subjects"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "subject_translations" ADD CONSTRAINT "subject_translations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_class_section_id_school_id_academic_year_id_fkey" FOREIGN KEY ("class_section_id", "school_id", "academic_year_id") REFERENCES "class_sections"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_subject_id_school_id_fkey" FOREIGN KEY ("subject_id", "school_id") REFERENCES "subjects"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "lesson_periods" ADD CONSTRAINT "lesson_periods_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "lesson_periods" ADD CONSTRAINT "lesson_periods_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "lesson_period_translations" ADD CONSTRAINT "lesson_period_translations_lesson_period_id_school_id_academic_year_id_fkey" FOREIGN KEY ("lesson_period_id", "school_id", "academic_year_id") REFERENCES "lesson_periods"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "lesson_period_translations" ADD CONSTRAINT "lesson_period_translations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION "validate_lesson_period_change"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
  IF NEW."archived_at" IS NULL AND EXISTS (
    SELECT 1
      FROM "lesson_periods" other
     WHERE other."academic_year_id" = NEW."academic_year_id"
       AND other."school_id" = NEW."school_id"
       AND other."id" <> NEW."id"
       AND other."archived_at" IS NULL
       AND other."start_time" < NEW."end_time"
       AND other."end_time" > NEW."start_time"
  ) THEN
    RAISE EXCEPTION 'lesson periods cannot overlap';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER "lesson_period_change_guard"
BEFORE INSERT OR UPDATE OF "school_id", "academic_year_id", "start_time", "end_time", "archived_at" ON "lesson_periods"
FOR EACH ROW EXECUTE FUNCTION "validate_lesson_period_change"();

COMMIT;
