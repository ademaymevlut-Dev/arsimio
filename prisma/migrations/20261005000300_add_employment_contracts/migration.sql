CREATE TYPE "EmploymentContractType" AS ENUM (
  'INDEFINITE',
  'FIXED_TERM',
  'PART_TIME',
  'SERVICE',
  'INTERN',
  'OTHER'
);

CREATE TYPE "EmploymentContractStatus" AS ENUM (
  'ACTIVE',
  'ENDED',
  'CANCELLED'
);

CREATE TABLE "employment_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "employment_id" uuid NOT NULL,
  "contract_number" varchar(80) NOT NULL,
  "type" "EmploymentContractType" NOT NULL,
  "status" "EmploymentContractStatus" NOT NULL DEFAULT 'ACTIVE',
  "started_on" date NOT NULL,
  "ended_on" date,
  "note" varchar(1000),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employment_contracts_school_id_fkey"
    FOREIGN KEY ("school_id")
    REFERENCES "schools"("id")
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT "employment_contracts_employment_id_school_id_fkey"
    FOREIGN KEY ("employment_id", "school_id")
    REFERENCES "employments"("id", "school_id")
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX "employment_contracts_school_id_contract_number_key"
  ON "employment_contracts"("school_id", "contract_number");

CREATE UNIQUE INDEX "employment_contracts_one_active_per_employment_idx"
  ON "employment_contracts"("school_id", "employment_id")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "employment_contracts_school_id_employment_id_status_idx"
  ON "employment_contracts"("school_id", "employment_id", "status");

CREATE INDEX "employment_contracts_school_id_status_idx"
  ON "employment_contracts"("school_id", "status");

WITH wanted(code) AS (
  VALUES
    ('hr.contracts.read'),
    ('hr.contracts.manage')
)
INSERT INTO "permissions" ("id", "code", "scope", "created_at", "updated_at")
SELECT gen_random_uuid(), code, 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM wanted
ON CONFLICT ("code") DO NOTHING;

WITH wanted(code) AS (
  VALUES
    ('hr.contracts.read'),
    ('hr.contracts.manage')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT r."id", p."id", 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."scope" = 'SCHOOL'::"RoleScope"
JOIN wanted w ON w.code = p."code"
WHERE r."scope" = 'SCHOOL'::"RoleScope"
  AND r."code" = 'SCHOOL_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
