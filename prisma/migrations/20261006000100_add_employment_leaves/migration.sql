CREATE TYPE "EmploymentLeaveKind" AS ENUM (
  'ANNUAL',
  'SICK',
  'UNPAID',
  'MATERNITY',
  'ADMINISTRATIVE',
  'OTHER'
);

CREATE TYPE "EmploymentLeaveStatus" AS ENUM (
  'PLANNED',
  'APPROVED',
  'CANCELLED'
);

CREATE TABLE "employment_leaves" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "employment_id" uuid NOT NULL,
  "kind" "EmploymentLeaveKind" NOT NULL,
  "status" "EmploymentLeaveStatus" NOT NULL DEFAULT 'APPROVED',
  "started_on" date NOT NULL,
  "ended_on" date NOT NULL,
  "day_count" decimal(5,2) NOT NULL,
  "note" varchar(1000),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employment_leaves_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employment_leaves_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "employment_leaves_employment_id_school_id_fkey"
    FOREIGN KEY ("employment_id", "school_id") REFERENCES "employments"("id", "school_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "employment_leaves_day_count_positive"
    CHECK ("day_count" > 0),
  CONSTRAINT "employment_leaves_date_range_check"
    CHECK ("ended_on" >= "started_on")
);

CREATE INDEX "employment_leaves_school_id_employment_id_started_on_idx"
  ON "employment_leaves"("school_id", "employment_id", "started_on");

CREATE INDEX "employment_leaves_school_id_status_started_on_idx"
  ON "employment_leaves"("school_id", "status", "started_on");

WITH wanted(code) AS (
  VALUES
    ('hr.leave.read'),
    ('hr.leave.manage')
)
INSERT INTO "permissions" ("id", "code", "scope", "created_at", "updated_at")
SELECT gen_random_uuid(), code, 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM wanted
ON CONFLICT ("code") DO NOTHING;

WITH wanted(code) AS (
  VALUES
    ('hr.leave.read'),
    ('hr.leave.manage')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT r."id", p."id", 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."scope" = 'SCHOOL'::"RoleScope"
JOIN wanted w ON w.code = p."code"
WHERE r."scope" = 'SCHOOL'::"RoleScope"
  AND r."code" = 'SCHOOL_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
