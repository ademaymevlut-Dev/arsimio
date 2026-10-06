DO $$
BEGIN
  CREATE TYPE "StudentFinanceContractItemKind" AS ENUM (
    'TUITION',
    'MEAL',
    'TRANSPORT',
    'UNIFORM',
    'BOOK_MATERIAL',
    'EXAM_ACTIVITY',
    'OTHER',
    'LATE_FEE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "StudentFinanceContractItemStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "student_finance_contract_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "contract_id" uuid NOT NULL,
  "kind" "StudentFinanceContractItemKind" NOT NULL,
  "description" varchar(200) NOT NULL,
  "gross_amount" decimal(12,2) NOT NULL,
  "discount_rate" decimal(5,2) NOT NULL DEFAULT 0,
  "discount_amount" decimal(12,2) NOT NULL DEFAULT 0,
  "net_amount" decimal(12,2) NOT NULL,
  "status" "StudentFinanceContractItemStatus" NOT NULL DEFAULT 'ACTIVE',
  "sort_order" integer NOT NULL DEFAULT 0,
  "note" varchar(1000),
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_finance_contract_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_finance_contract_items_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_contract_items_contract_id_school_id_fkey"
    FOREIGN KEY ("contract_id", "school_id")
    REFERENCES "student_finance_contracts"("id", "school_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "student_finance_contract_items_description_check"
    CHECK (length(trim("description")) > 0),
  CONSTRAINT "student_finance_contract_items_gross_amount_check"
    CHECK ("gross_amount" > 0),
  CONSTRAINT "student_finance_contract_items_discount_rate_check"
    CHECK ("discount_rate" >= 0 AND "discount_rate" <= 100),
  CONSTRAINT "student_finance_contract_items_discount_amount_check"
    CHECK ("discount_amount" >= 0 AND "discount_amount" <= "gross_amount"),
  CONSTRAINT "student_finance_contract_items_net_amount_check"
    CHECK ("net_amount" = "gross_amount" - "discount_amount"),
  CONSTRAINT "student_finance_contract_items_sort_order_check"
    CHECK ("sort_order" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_finance_contract_items_id_school_id_key"
  ON "student_finance_contract_items"("id", "school_id");

CREATE INDEX IF NOT EXISTS "sfci_contract_status_order_idx"
  ON "student_finance_contract_items"(
    "school_id",
    "contract_id",
    "status",
    "sort_order"
  );

CREATE INDEX IF NOT EXISTS "sfci_kind_status_idx"
  ON "student_finance_contract_items"("school_id", "kind", "status");
