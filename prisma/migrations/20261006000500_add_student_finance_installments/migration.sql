DO $$
BEGIN
  CREATE TYPE "StudentFinanceInstallmentKind" AS ENUM (
    'DOWN_PAYMENT',
    'INSTALLMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "StudentFinanceInstallmentStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "student_finance_installments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "kind" "StudentFinanceInstallmentKind" NOT NULL,
  "sequence" integer NOT NULL,
  "label" varchar(80) NOT NULL,
  "due_date" date NOT NULL,
  "amount" decimal(12,2) NOT NULL,
  "status" "StudentFinanceInstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "note" varchar(1000),
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_finance_installments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_finance_installments_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_installments_contract_id_school_id_fkey"
    FOREIGN KEY ("contract_id", "school_id")
    REFERENCES "student_finance_contracts"("id", "school_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_installments_label_check"
    CHECK (length(trim("label")) > 0),
  CONSTRAINT "student_finance_installments_amount_check"
    CHECK ("amount" >= 0 AND ("kind" = 'DOWN_PAYMENT' OR "amount" > 0)),
  CONSTRAINT "student_finance_installments_sequence_check"
    CHECK (
      ("kind" = 'DOWN_PAYMENT' AND "sequence" = 0)
      OR
      ("kind" = 'INSTALLMENT' AND "sequence" > 0)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "sfi_contract_sequence_key"
  ON "student_finance_installments"("contract_id", "sequence");

CREATE UNIQUE INDEX IF NOT EXISTS "student_finance_installments_id_school_id_key"
  ON "student_finance_installments"("id", "school_id");

CREATE INDEX IF NOT EXISTS "sfi_contract_status_sequence_idx"
  ON "student_finance_installments"(
    "school_id",
    "contract_id",
    "status",
    "sequence"
  );

CREATE INDEX IF NOT EXISTS "sfi_due_status_idx"
  ON "student_finance_installments"("school_id", "due_date", "status");
