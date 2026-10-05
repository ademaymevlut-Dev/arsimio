CREATE TYPE "EmploymentCompensationPayType" AS ENUM (
  'MONTHLY',
  'HOURLY',
  'DAILY',
  'LESSON',
  'OTHER'
);

CREATE TYPE "EmploymentCompensationAmountKind" AS ENUM (
  'GROSS',
  'NET'
);

CREATE TYPE "EmploymentCompensationStatus" AS ENUM (
  'ACTIVE',
  'ENDED',
  'CANCELLED'
);

CREATE TABLE "employment_compensations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "employment_id" uuid NOT NULL,
  "amount" decimal(12,2) NOT NULL,
  "currency_code" char(3) NOT NULL DEFAULT 'EUR',
  "amount_kind" "EmploymentCompensationAmountKind" NOT NULL DEFAULT 'GROSS',
  "pay_type" "EmploymentCompensationPayType" NOT NULL,
  "status" "EmploymentCompensationStatus" NOT NULL DEFAULT 'ACTIVE',
  "started_on" date NOT NULL,
  "ended_on" date,
  "note" varchar(1000),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employment_compensations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employment_compensations_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "employment_compensations_employment_id_school_id_fkey"
    FOREIGN KEY ("employment_id", "school_id") REFERENCES "employments"("id", "school_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "employment_compensations_amount_positive"
    CHECK ("amount" > 0),
  CONSTRAINT "employment_compensations_currency_code_check"
    CHECK ("currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "employment_compensations_date_range_check"
    CHECK ("ended_on" IS NULL OR "ended_on" >= "started_on")
);

CREATE UNIQUE INDEX "employment_compensations_one_active_per_employment_idx"
  ON "employment_compensations"("school_id", "employment_id")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "employment_compensations_school_id_employment_id_status_idx"
  ON "employment_compensations"("school_id", "employment_id", "status");

CREATE INDEX "employment_compensations_school_id_status_idx"
  ON "employment_compensations"("school_id", "status");

WITH wanted(code) AS (
  VALUES
    ('hr.compensation.read'),
    ('hr.compensation.manage')
)
INSERT INTO "permissions" ("id", "code", "scope", "created_at", "updated_at")
SELECT gen_random_uuid(), code, 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM wanted
ON CONFLICT ("code") DO NOTHING;

WITH wanted(code) AS (
  VALUES
    ('hr.compensation.read'),
    ('hr.compensation.manage')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT r."id", p."id", 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."scope" = 'SCHOOL'::"RoleScope"
JOIN wanted w ON w.code = p."code"
WHERE r."scope" = 'SCHOOL'::"RoleScope"
  AND r."code" = 'SCHOOL_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
