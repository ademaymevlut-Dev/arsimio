CREATE TYPE "TimetableWeekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');
CREATE TYPE "TimetableSessionStatus" AS ENUM ('ACTIVE', 'PASSIVE');

CREATE TABLE "timetable_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "teacher_profile_id" UUID NOT NULL,
  "schedule_period_id" UUID NOT NULL,
  "weekday" "TimetableWeekday" NOT NULL,
  "status" "TimetableSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "note" VARCHAR(500),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "timetable_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timetable_session_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "timetable_session_id" UUID NOT NULL,
  "course_teacher_assignment_id" UUID NOT NULL,
  "course_offering_id" UUID NOT NULL,
  "academic_year_class_section_id" UUID NOT NULL,
  "status" "TimetableSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "note" VARCHAR(500),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "timetable_session_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timetable_sessions_id_school_id_key" ON "timetable_sessions"("id", "school_id");
CREATE UNIQUE INDEX "ts_id_school_year_key" ON "timetable_sessions"("id", "school_id", "academic_year_id");
CREATE INDEX "ts_teacher_status_idx" ON "timetable_sessions"("school_id", "academic_year_id", "teacher_profile_id", "status");
CREATE INDEX "ts_slot_status_idx" ON "timetable_sessions"("school_id", "academic_year_id", "weekday", "schedule_period_id", "status");
CREATE UNIQUE INDEX "ts_one_active_teacher_slot_idx"
  ON "timetable_sessions"("school_id", "academic_year_id", "teacher_profile_id", "weekday", "schedule_period_id")
  WHERE "status" = 'ACTIVE' AND "archived_at" IS NULL;

CREATE UNIQUE INDEX "timetable_session_participants_id_school_id_key" ON "timetable_session_participants"("id", "school_id");
CREATE INDEX "tsp_class_slot_lookup_idx" ON "timetable_session_participants"("school_id", "academic_year_id", "academic_year_class_section_id", "status");
CREATE INDEX "tsp_assignment_lookup_idx" ON "timetable_session_participants"("school_id", "academic_year_id", "course_teacher_assignment_id", "status");
CREATE INDEX "tsp_session_status_idx" ON "timetable_session_participants"("school_id", "timetable_session_id", "status");
CREATE UNIQUE INDEX "tsp_one_active_assignment_per_session_idx"
  ON "timetable_session_participants"("timetable_session_id", "course_teacher_assignment_id")
  WHERE "status" = 'ACTIVE' AND "archived_at" IS NULL;

ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_teacher_profile_id_school_id_fkey" FOREIGN KEY ("teacher_profile_id", "school_id") REFERENCES "teacher_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "timetable_sessions" ADD CONSTRAINT "timetable_sessions_schedule_period_id_school_id_fkey" FOREIGN KEY ("schedule_period_id", "school_id") REFERENCES "schedule_periods"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "timetable_session_participants" ADD CONSTRAINT "timetable_session_participants_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "timetable_session_participants" ADD CONSTRAINT "timetable_session_participants_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "timetable_session_participants" ADD CONSTRAINT "timetable_session_participants_timetable_session_id_school_id_academic_year_id_fkey" FOREIGN KEY ("timetable_session_id", "school_id", "academic_year_id") REFERENCES "timetable_sessions"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "timetable_session_participants" ADD CONSTRAINT "timetable_session_participants_course_teacher_assignment_id_school_id_fkey" FOREIGN KEY ("course_teacher_assignment_id", "school_id") REFERENCES "course_teacher_assignments"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "timetable_session_participants" ADD CONSTRAINT "timetable_session_participants_course_offering_id_school_id_academic_year_id_fkey" FOREIGN KEY ("course_offering_id", "school_id", "academic_year_id") REFERENCES "course_offerings"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "timetable_session_participants" ADD CONSTRAINT "timetable_session_participants_academic_year_class_section_id_school_id_academic_year_id_fkey" FOREIGN KEY ("academic_year_class_section_id", "school_id", "academic_year_id") REFERENCES "academic_year_class_sections"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

WITH wanted(code) AS (
  VALUES
    ('teaching.schedule.read'),
    ('teaching.schedule.manage')
)
INSERT INTO "permissions" ("id", "code", "scope", "created_at", "updated_at")
SELECT gen_random_uuid(), code, 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM wanted
ON CONFLICT ("code") DO NOTHING;

WITH wanted(code) AS (
  VALUES
    ('teaching.schedule.read'),
    ('teaching.schedule.manage')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT r."id", p."id", 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."scope" = 'SCHOOL'::"RoleScope"
JOIN wanted w ON w.code = p."code"
WHERE r."scope" = 'SCHOOL'::"RoleScope"
  AND r."code" = 'SCHOOL_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
