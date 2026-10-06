CREATE TABLE IF NOT EXISTS "employment_contract_templates" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "code" varchar(80) NOT NULL,
  "locale" varchar(10) NOT NULL DEFAULT 'sq',
  "title" varchar(200) NOT NULL,
  "header_text" varchar(2000),
  "footer_text" varchar(2000),
  "note" varchar(1000),
  "archived_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employment_contract_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employment_contract_templates_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "employment_contract_templates_locale_check"
    CHECK ("locale" IN ('tr', 'sq', 'en'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "employment_contract_templates_school_id_code_key"
  ON "employment_contract_templates"("school_id", "code");

CREATE UNIQUE INDEX IF NOT EXISTS "employment_contract_templates_id_school_id_key"
  ON "employment_contract_templates"("id", "school_id");

CREATE INDEX IF NOT EXISTS "employment_contract_templates_school_id_archived_at_title_idx"
  ON "employment_contract_templates"("school_id", "archived_at", "title");

CREATE TABLE IF NOT EXISTS "employment_contract_template_clauses" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "template_id" uuid NOT NULL,
  "sort_order" integer NOT NULL,
  "title" varchar(200) NOT NULL,
  "body" text NOT NULL,
  "archived_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employment_contract_template_clauses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employment_contract_template_clauses_school_id_fkey"
    FOREIGN KEY ("school_id") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "employment_contract_template_clauses_template_id_school_id_fkey"
    FOREIGN KEY ("template_id", "school_id")
    REFERENCES "employment_contract_templates"("id", "school_id")
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "employment_contract_template_clauses_sort_order_check"
    CHECK ("sort_order" BETWEEN 1 AND 999),
  CONSTRAINT "employment_contract_template_clauses_body_check"
    CHECK (length(trim("body")) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "employment_contract_template_clauses_id_school_id_key"
  ON "employment_contract_template_clauses"("id", "school_id");

CREATE INDEX IF NOT EXISTS "employment_contract_template_clauses_school_id_template_id_archived_at_sort_order_idx"
  ON "employment_contract_template_clauses"(
    "school_id",
    "template_id",
    "archived_at",
    "sort_order"
  );

ALTER TABLE "employment_contracts"
  ADD COLUMN IF NOT EXISTS "template_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employment_contracts_template_id_school_id_fkey'
  ) THEN
    ALTER TABLE "employment_contracts"
      ADD CONSTRAINT "employment_contracts_template_id_school_id_fkey"
      FOREIGN KEY ("template_id", "school_id")
      REFERENCES "employment_contract_templates"("id", "school_id")
      ON DELETE RESTRICT ON UPDATE RESTRICT;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "employment_contracts_school_id_template_id_idx"
  ON "employment_contracts"("school_id", "template_id");
