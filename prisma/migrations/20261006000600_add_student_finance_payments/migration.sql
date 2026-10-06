DO $$
BEGIN
  CREATE TYPE "StudentFinancePaymentStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "student_finance_payments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "paid_on" date NOT NULL,
  "amount" decimal(12,2) NOT NULL,
  "description" varchar(300) NOT NULL,
  "status" "StudentFinancePaymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_finance_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_finance_payments_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_payments_contract_id_school_id_fkey"
    FOREIGN KEY ("contract_id", "school_id")
    REFERENCES "student_finance_contracts"("id", "school_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_payments_amount_check"
    CHECK ("amount" > 0),
  CONSTRAINT "student_finance_payments_description_check"
    CHECK (length(trim("description")) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_finance_payments_id_school_id_key"
  ON "student_finance_payments"("id", "school_id");

CREATE INDEX IF NOT EXISTS "sfp_contract_status_paid_on_idx"
  ON "student_finance_payments"(
    "school_id",
    "contract_id",
    "status",
    "paid_on"
  );

CREATE INDEX IF NOT EXISTS "sfp_paid_on_status_idx"
  ON "student_finance_payments"("school_id", "paid_on", "status");
