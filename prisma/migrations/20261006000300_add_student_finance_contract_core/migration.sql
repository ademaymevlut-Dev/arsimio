DO $$
BEGIN
  CREATE TYPE "StudentFinanceContractStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "gr_id_school_student_key"
  ON "guardian_relationships"("id", "school_id", "student_profile_id");

CREATE TABLE IF NOT EXISTS "student_finance_contracts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_profile_id" uuid NOT NULL,
  "academic_year_id" uuid NOT NULL,
  "responsible_guardian_relationship_id" uuid NOT NULL,
  "protocol_number" varchar(80) NOT NULL,
  "status" "StudentFinanceContractStatus" NOT NULL DEFAULT 'DRAFT',
  "currency_code" char(3) NOT NULL DEFAULT 'EUR',
  "issued_on" date NOT NULL DEFAULT CURRENT_DATE,
  "note" varchar(1000),
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_finance_contracts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_finance_contracts_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_contracts_student_profile_id_school_id_fkey"
    FOREIGN KEY ("student_profile_id", "school_id")
    REFERENCES "student_profiles"("id", "school_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_contracts_academic_year_id_school_id_fkey"
    FOREIGN KEY ("academic_year_id", "school_id")
    REFERENCES "academic_years"("id", "school_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_contracts_responsible_guardian_relationship_fkey"
    FOREIGN KEY (
      "responsible_guardian_relationship_id",
      "school_id",
      "student_profile_id"
    )
    REFERENCES "guardian_relationships"("id", "school_id", "student_profile_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_contracts_protocol_number_check"
    CHECK (length(trim("protocol_number")) > 0),
  CONSTRAINT "student_finance_contracts_currency_code_check"
    CHECK ("currency_code" ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS "sfc_school_year_protocol_key"
  ON "student_finance_contracts"(
    "school_id",
    "academic_year_id",
    "protocol_number"
  );

CREATE UNIQUE INDEX IF NOT EXISTS "student_finance_contracts_id_school_id_key"
  ON "student_finance_contracts"("id", "school_id");

CREATE UNIQUE INDEX IF NOT EXISTS "sfc_one_active_student_year_key"
  ON "student_finance_contracts"(
    "school_id",
    "student_profile_id",
    "academic_year_id"
  )
  WHERE "status" = 'ACTIVE';

CREATE INDEX IF NOT EXISTS "sfc_student_year_status_idx"
  ON "student_finance_contracts"(
    "school_id",
    "student_profile_id",
    "academic_year_id",
    "status"
  );

CREATE INDEX IF NOT EXISTS "sfc_year_status_idx"
  ON "student_finance_contracts"("school_id", "academic_year_id", "status");

CREATE INDEX IF NOT EXISTS "sfc_responsible_guardian_idx"
  ON "student_finance_contracts"("school_id", "responsible_guardian_relationship_id");

WITH wanted(code) AS (
  VALUES
    ('finance.contracts.read'),
    ('finance.contracts.manage'),
    ('finance.payments.read'),
    ('finance.payments.manage')
)
INSERT INTO "permissions" ("id", "code", "scope", "created_at", "updated_at")
SELECT gen_random_uuid(), code, 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM wanted
ON CONFLICT ("code") DO NOTHING;

WITH wanted(code) AS (
  VALUES
    ('finance.contracts.read'),
    ('finance.contracts.manage'),
    ('finance.payments.read'),
    ('finance.payments.manage')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT r."id", p."id", 'SCHOOL'::"RoleScope", CURRENT_TIMESTAMP
FROM "roles" r
JOIN "permissions" p ON p."scope" = 'SCHOOL'::"RoleScope"
JOIN wanted w ON w.code = p."code"
WHERE r."scope" = 'SCHOOL'::"RoleScope"
  AND r."code" = 'SCHOOL_ADMIN'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
