CREATE TYPE "TeachingAssignmentStatus" AS ENUM ('ACTIVE', 'PASSIVE');

CREATE UNIQUE INDEX "co_id_school_year_key" ON "course_offerings"("id", "school_id", "academic_year_id");

CREATE TABLE "homeroom_teacher_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "academic_year_class_section_id" UUID NOT NULL,
  "teacher_profile_id" UUID NOT NULL,
  "status" "TeachingAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "note" VARCHAR(500),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "homeroom_teacher_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_teacher_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "course_offering_id" UUID NOT NULL,
  "teacher_profile_id" UUID NOT NULL,
  "status" "TeachingAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "note" VARCHAR(500),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "course_teacher_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hta_year_section_teacher_from_key" ON "homeroom_teacher_assignments"("academic_year_id", "academic_year_class_section_id", "teacher_profile_id", "effective_from");
CREATE UNIQUE INDEX "homeroom_teacher_assignments_id_school_id_key" ON "homeroom_teacher_assignments"("id", "school_id");
CREATE INDEX "homeroom_teacher_assignments_school_id_academic_year_id_status_idx" ON "homeroom_teacher_assignments"("school_id", "academic_year_id", "status");
CREATE INDEX "homeroom_teacher_assignments_school_id_teacher_profile_id_status_idx" ON "homeroom_teacher_assignments"("school_id", "teacher_profile_id", "status");
CREATE UNIQUE INDEX "hta_one_active_per_class_idx"
  ON "homeroom_teacher_assignments"("school_id", "academic_year_class_section_id")
  WHERE "status" = 'ACTIVE' AND "archived_at" IS NULL;

CREATE UNIQUE INDEX "cta_course_teacher_from_key" ON "course_teacher_assignments"("course_offering_id", "teacher_profile_id", "effective_from");
CREATE UNIQUE INDEX "course_teacher_assignments_id_school_id_key" ON "course_teacher_assignments"("id", "school_id");
CREATE INDEX "course_teacher_assignments_school_id_academic_year_id_status_idx" ON "course_teacher_assignments"("school_id", "academic_year_id", "status");
CREATE INDEX "course_teacher_assignments_school_id_teacher_profile_id_status_idx" ON "course_teacher_assignments"("school_id", "teacher_profile_id", "status");
CREATE UNIQUE INDEX "cta_one_active_per_course_idx"
  ON "course_teacher_assignments"("school_id", "course_offering_id")
  WHERE "status" = 'ACTIVE' AND "archived_at" IS NULL;

ALTER TABLE "homeroom_teacher_assignments" ADD CONSTRAINT "homeroom_teacher_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "homeroom_teacher_assignments" ADD CONSTRAINT "homeroom_teacher_assignments_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "homeroom_teacher_assignments" ADD CONSTRAINT "homeroom_teacher_assignments_academic_year_class_section_id_school_id_academic_year_id_fkey" FOREIGN KEY ("academic_year_class_section_id", "school_id", "academic_year_id") REFERENCES "academic_year_class_sections"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "homeroom_teacher_assignments" ADD CONSTRAINT "homeroom_teacher_assignments_teacher_profile_id_school_id_fkey" FOREIGN KEY ("teacher_profile_id", "school_id") REFERENCES "teacher_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "course_teacher_assignments" ADD CONSTRAINT "course_teacher_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_teacher_assignments" ADD CONSTRAINT "course_teacher_assignments_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_teacher_assignments" ADD CONSTRAINT "course_teacher_assignments_course_offering_id_school_id_academic_year_id_fkey" FOREIGN KEY ("course_offering_id", "school_id", "academic_year_id") REFERENCES "course_offerings"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "course_teacher_assignments" ADD CONSTRAINT "course_teacher_assignments_teacher_profile_id_school_id_fkey" FOREIGN KEY ("teacher_profile_id", "school_id") REFERENCES "teacher_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

WITH wanted(code) AS (
  VALUES
    ('teaching.assignments.read'),
    ('teaching.assignments.manage')
)
INSERT INTO "permissions" ("id", "code", "scope", "created_at", "updated_at")
SELECT gen_random_uuid(), code, 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM wanted
ON CONFLICT ("code") DO NOTHING;

WITH wanted(code) AS (
  VALUES
    ('teaching.assignments.read'),
    ('teaching.assignments.manage')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT r."id", p."id", 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."scope" = 'SCHOOL'::"RoleScope"
JOIN wanted w ON w.code = p."code"
WHERE r."scope" = 'SCHOOL'::"RoleScope"
  AND r."code" = 'SCHOOL_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
