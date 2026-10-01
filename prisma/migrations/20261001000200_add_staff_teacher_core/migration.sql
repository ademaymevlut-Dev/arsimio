ALTER TYPE "SchoolSequenceKind" ADD VALUE IF NOT EXISTS 'STAFF_NUMBER';

CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'ENDED');
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'FIXED_TERM', 'CONTRACTOR', 'INTERN');
CREATE TYPE "EmploymentExitReason" AS ENUM ('RESIGNED', 'TERMINATED', 'CONTRACT_ENDED', 'MATERNITY_LEAVE', 'HEALTH', 'RELOCATION', 'OTHER', 'UNKNOWN');
CREATE TYPE "EmploymentLifecycleEventType" AS ENUM ('HIRED', 'ON_LEAVE', 'REACTIVATED', 'ENDED');
CREATE TYPE "TeacherCategory" AS ENUM ('CLASSROOM', 'BRANCH');
CREATE TYPE "TeacherStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "staff_departments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "default_name" VARCHAR(120) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "staff_departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_department_translations" (
  "department_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "staff_department_translations_pkey" PRIMARY KEY ("department_id", "locale"),
  CONSTRAINT "staff_department_translations_locale_check" CHECK ("locale" IN ('tr', 'sq', 'en'))
);

CREATE TABLE "staff_positions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "default_name" VARCHAR(120) NOT NULL,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "staff_positions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_position_translations" (
  "position_id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "staff_position_translations_pkey" PRIMARY KEY ("position_id", "locale"),
  CONSTRAINT "staff_position_translations_locale_check" CHECK ("locale" IN ('tr', 'sq', 'en'))
);

CREATE TABLE "employments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "person_id" UUID NOT NULL,
  "department_id" UUID NOT NULL,
  "position_id" UUID NOT NULL,
  "staff_number" VARCHAR(40) NOT NULL,
  "type" "EmploymentType" NOT NULL,
  "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "hired_on" DATE NOT NULL,
  "ended_on" DATE,
  "exit_reason" "EmploymentExitReason",
  "note" VARCHAR(500),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "employments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employment_lifecycle_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "employment_id" UUID NOT NULL,
  "type" "EmploymentLifecycleEventType" NOT NULL,
  "effective_on" DATE NOT NULL,
  "exit_reason" "EmploymentExitReason",
  "note" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employment_lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "employment_id" UUID NOT NULL,
  "category" "TeacherCategory" NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "status" "TeacherStatus" NOT NULL DEFAULT 'ACTIVE',
  "note" VARCHAR(500),
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_subject_capabilities" (
  "school_id" UUID NOT NULL,
  "teacher_profile_id" UUID NOT NULL,
  "subject_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "teacher_subject_capabilities_pkey" PRIMARY KEY ("teacher_profile_id", "subject_id")
);

CREATE UNIQUE INDEX "staff_departments_school_code_key" ON "staff_departments"("school_id", "code");
CREATE UNIQUE INDEX "staff_departments_id_school_key" ON "staff_departments"("id", "school_id");
CREATE INDEX "staff_departments_school_archived_name_idx" ON "staff_departments"("school_id", "archived_at", "default_name");
CREATE UNIQUE INDEX "sdt_school_locale_name_key" ON "staff_department_translations"("school_id", "locale", "name");
CREATE INDEX "staff_department_translations_school_locale_idx" ON "staff_department_translations"("school_id", "locale");

CREATE UNIQUE INDEX "staff_positions_school_code_key" ON "staff_positions"("school_id", "code");
CREATE UNIQUE INDEX "staff_positions_id_school_key" ON "staff_positions"("id", "school_id");
CREATE INDEX "staff_positions_school_archived_name_idx" ON "staff_positions"("school_id", "archived_at", "default_name");
CREATE UNIQUE INDEX "spt_school_locale_name_key" ON "staff_position_translations"("school_id", "locale", "name");
CREATE INDEX "staff_position_translations_school_locale_idx" ON "staff_position_translations"("school_id", "locale");

CREATE UNIQUE INDEX "employments_school_staff_number_key" ON "employments"("school_id", "staff_number");
CREATE UNIQUE INDEX "employments_id_school_key" ON "employments"("id", "school_id");
CREATE UNIQUE INDEX "employment_open_person_key" ON "employments"("school_id", "person_id") WHERE "archived_at" IS NULL AND "status" IN ('ACTIVE', 'ON_LEAVE');
CREATE INDEX "employments_school_status_archived_idx" ON "employments"("school_id", "status", "archived_at");
CREATE INDEX "employments_school_person_status_idx" ON "employments"("school_id", "person_id", "status");
CREATE INDEX "employments_school_department_idx" ON "employments"("school_id", "department_id");
CREATE INDEX "employments_school_position_idx" ON "employments"("school_id", "position_id");

CREATE INDEX "employment_lifecycle_events_school_employment_effective_idx" ON "employment_lifecycle_events"("school_id", "employment_id", "effective_on");
CREATE INDEX "employment_lifecycle_events_school_type_effective_idx" ON "employment_lifecycle_events"("school_id", "type", "effective_on");

CREATE UNIQUE INDEX "teacher_profiles_school_employment_key" ON "teacher_profiles"("school_id", "employment_id");
CREATE UNIQUE INDEX "teacher_profiles_employment_school_key" ON "teacher_profiles"("employment_id", "school_id");
CREATE UNIQUE INDEX "teacher_profiles_id_school_key" ON "teacher_profiles"("id", "school_id");
CREATE INDEX "teacher_profiles_school_status_category_idx" ON "teacher_profiles"("school_id", "status", "category");

CREATE INDEX "teacher_subject_capabilities_school_subject_idx" ON "teacher_subject_capabilities"("school_id", "subject_id");

ALTER TABLE "staff_departments" ADD CONSTRAINT "staff_departments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "staff_department_translations" ADD CONSTRAINT "staff_department_translations_department_id_school_id_fkey" FOREIGN KEY ("department_id", "school_id") REFERENCES "staff_departments"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "staff_department_translations" ADD CONSTRAINT "staff_department_translations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "staff_positions" ADD CONSTRAINT "staff_positions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "staff_position_translations" ADD CONSTRAINT "staff_position_translations_position_id_school_id_fkey" FOREIGN KEY ("position_id", "school_id") REFERENCES "staff_positions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "staff_position_translations" ADD CONSTRAINT "staff_position_translations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "employments" ADD CONSTRAINT "employments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "employments" ADD CONSTRAINT "employments_person_id_school_id_fkey" FOREIGN KEY ("person_id", "school_id") REFERENCES "persons"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "employments" ADD CONSTRAINT "employments_department_id_school_id_fkey" FOREIGN KEY ("department_id", "school_id") REFERENCES "staff_departments"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "employments" ADD CONSTRAINT "employments_position_id_school_id_fkey" FOREIGN KEY ("position_id", "school_id") REFERENCES "staff_positions"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "employment_lifecycle_events" ADD CONSTRAINT "employment_lifecycle_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "employment_lifecycle_events" ADD CONSTRAINT "employment_lifecycle_events_employment_id_school_id_fkey" FOREIGN KEY ("employment_id", "school_id") REFERENCES "employments"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "teacher_profiles" ADD CONSTRAINT "teacher_profiles_employment_id_school_id_fkey" FOREIGN KEY ("employment_id", "school_id") REFERENCES "employments"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "teacher_subject_capabilities" ADD CONSTRAINT "teacher_subject_capabilities_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "teacher_subject_capabilities" ADD CONSTRAINT "teacher_subject_capabilities_teacher_profile_id_school_id_fkey" FOREIGN KEY ("teacher_profile_id", "school_id") REFERENCES "teacher_profiles"("id", "school_id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "teacher_subject_capabilities" ADD CONSTRAINT "teacher_subject_capabilities_subject_id_school_id_fkey" FOREIGN KEY ("subject_id", "school_id") REFERENCES "subjects"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

WITH wanted(code) AS (
  VALUES
    ('hr.staff.read'),
    ('hr.staff.manage'),
    ('hr.catalog.read'),
    ('hr.catalog.manage'),
    ('teachers.read'),
    ('teachers.manage')
)
INSERT INTO "permissions" ("id", "code", "scope", "created_at", "updated_at")
SELECT gen_random_uuid(), code, 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM wanted
ON CONFLICT ("code") DO NOTHING;

WITH wanted(code) AS (
  VALUES
    ('hr.staff.read'),
    ('hr.staff.manage'),
    ('hr.catalog.read'),
    ('hr.catalog.manage'),
    ('teachers.read'),
    ('teachers.manage')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT r."id", p."id", 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."scope" = 'SCHOOL'::"RoleScope"
JOIN wanted w ON w.code = p."code"
WHERE r."scope" = 'SCHOOL'::"RoleScope"
  AND r."code" = 'SCHOOL_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

WITH dept_values(code, default_name, tr, sq, en) AS (
  VALUES
    ('MANAGEMENT', 'Yönetim', 'Yönetim', 'Menaxhimi', 'Management'),
    ('EDUCATION', 'Eğitim', 'Eğitim', 'Arsimi', 'Education'),
    ('ACCOUNTING', 'Muhasebe', 'Muhasebe', 'Kontabiliteti', 'Accounting'),
    ('OPERATIONS', 'Operasyon', 'Operasyon', 'Operacionet', 'Operations'),
    ('SUPPORT', 'Destek Hizmetleri', 'Destek Hizmetleri', 'Shërbimet Mbështetëse', 'Support Services')
),
upserted AS (
  INSERT INTO "staff_departments" ("id", "school_id", "code", "default_name", "created_at", "updated_at")
  SELECT gen_random_uuid(), s."id", v.code, v.default_name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM "schools" s
  CROSS JOIN dept_values v
  ON CONFLICT ("school_id", "code") DO UPDATE
    SET "default_name" = EXCLUDED."default_name",
        "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id", "school_id", "code"
)
INSERT INTO "staff_department_translations" ("department_id", "school_id", "locale", "name", "created_at", "updated_at")
SELECT u."id", u."school_id", names.locale, names.name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM upserted u
JOIN dept_values v ON v.code = u."code"
CROSS JOIN LATERAL (VALUES ('tr', v.tr), ('sq', v.sq), ('en', v.en)) AS names(locale, name)
ON CONFLICT ("department_id", "locale") DO UPDATE
  SET "name" = EXCLUDED."name",
      "updated_at" = CURRENT_TIMESTAMP;

WITH position_values(code, default_name, tr, sq, en) AS (
  VALUES
    ('PRINCIPAL', 'Müdür', 'Müdür', 'Drejtor', 'Principal'),
    ('VICE_PRINCIPAL', 'Müdür Yardımcısı', 'Müdür Yardımcısı', 'Zëvendësdrejtor', 'Vice Principal'),
    ('ACCOUNTANT', 'Muhasebeci', 'Muhasebeci', 'Kontabilist', 'Accountant'),
    ('CLASSROOM_TEACHER', 'Sınıf Öğretmeni', 'Sınıf Öğretmeni', 'Mësues klase', 'Classroom Teacher'),
    ('BRANCH_TEACHER', 'Branş Öğretmeni', 'Branş Öğretmeni', 'Mësues lënde', 'Subject Teacher'),
    ('CLEANER', 'Temizlik Görevlisi', 'Temizlik Görevlisi', 'Punonjës pastrimi', 'Cleaner'),
    ('SECURITY', 'Güvenlik Görevlisi', 'Güvenlik Görevlisi', 'Punonjës sigurie', 'Security Officer'),
    ('KITCHEN_STAFF', 'Mutfak Çalışanı', 'Mutfak Çalışanı', 'Punonjës kuzhine', 'Kitchen Staff')
),
upserted AS (
  INSERT INTO "staff_positions" ("id", "school_id", "code", "default_name", "created_at", "updated_at")
  SELECT gen_random_uuid(), s."id", v.code, v.default_name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM "schools" s
  CROSS JOIN position_values v
  ON CONFLICT ("school_id", "code") DO UPDATE
    SET "default_name" = EXCLUDED."default_name",
        "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id", "school_id", "code"
)
INSERT INTO "staff_position_translations" ("position_id", "school_id", "locale", "name", "created_at", "updated_at")
SELECT u."id", u."school_id", names.locale, names.name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM upserted u
JOIN position_values v ON v.code = u."code"
CROSS JOIN LATERAL (VALUES ('tr', v.tr), ('sq', v.sq), ('en', v.en)) AS names(locale, name)
ON CONFLICT ("position_id", "locale") DO UPDATE
  SET "name" = EXCLUDED."name",
      "updated_at" = CURRENT_TIMESTAMP;
