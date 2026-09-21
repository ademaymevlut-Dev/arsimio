BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE TYPE "AcademicYearStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');
CREATE TYPE "AcademicTermStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

CREATE TABLE "academic_years" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "name" VARCHAR(40) NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "status" "AcademicYearStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "archived_at" TIMESTAMPTZ(6),
  "archived_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academic_years_date_check" CHECK ("end_date" > "start_date"),
  CONSTRAINT "academic_years_archive_check" CHECK (("status" = 'ARCHIVED') = ("archived_at" IS NOT NULL))
);

CREATE TABLE "academic_terms" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "sequence" INTEGER NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "status" "AcademicTermStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "archived_at" TIMESTAMPTZ(6),
  "archived_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academic_terms_sequence_check" CHECK ("sequence" BETWEEN 1 AND 20),
  CONSTRAINT "academic_terms_date_check" CHECK ("end_date" >= "start_date"),
  CONSTRAINT "academic_terms_archive_check" CHECK (("status" = 'ARCHIVED') = ("archived_at" IS NOT NULL))
);

CREATE UNIQUE INDEX "academic_years_school_id_name_key" ON "academic_years"("school_id", "name");
CREATE UNIQUE INDEX "academic_years_id_school_id_key" ON "academic_years"("id", "school_id");
CREATE INDEX "academic_years_school_id_status_start_date_idx" ON "academic_years"("school_id", "status", "start_date");
CREATE UNIQUE INDEX "academic_years_one_active_per_school_key" ON "academic_years"("school_id") WHERE "status" = 'ACTIVE' AND "archived_at" IS NULL;

CREATE UNIQUE INDEX "academic_terms_academic_year_id_sequence_key" ON "academic_terms"("academic_year_id", "sequence");
CREATE UNIQUE INDEX "academic_terms_academic_year_id_name_key" ON "academic_terms"("academic_year_id", "name");
CREATE UNIQUE INDEX "academic_terms_id_school_id_key" ON "academic_terms"("id", "school_id");
CREATE INDEX "academic_terms_school_id_status_start_date_idx" ON "academic_terms"("school_id", "status", "start_date");
CREATE INDEX "academic_terms_academic_year_id_status_sequence_idx" ON "academic_terms"("academic_year_id", "status", "sequence");
CREATE UNIQUE INDEX "academic_terms_one_active_per_year_key" ON "academic_terms"("academic_year_id") WHERE "status" = 'ACTIVE' AND "archived_at" IS NULL;

ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_archived_by_id_fkey"
  FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_academic_year_id_school_id_fkey"
  FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_archived_by_id_fkey"
  FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

CREATE FUNCTION "validate_academic_year_change"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."status" <> NEW."status" THEN
    IF NOT (
      (OLD."status" = 'DRAFT' AND NEW."status" IN ('ACTIVE', 'ARCHIVED')) OR
      (OLD."status" = 'ACTIVE' AND NEW."status" = 'CLOSED') OR
      (OLD."status" = 'CLOSED' AND NEW."status" = 'ARCHIVED') OR
      (OLD."status" = 'ARCHIVED' AND NEW."status" = 'DRAFT')
    ) THEN
      RAISE EXCEPTION 'invalid academic year status transition';
    END IF;
  END IF;

  IF NEW."status" = 'ACTIVE' AND NOT EXISTS (
    SELECT 1 FROM "academic_terms" term
    WHERE term."academic_year_id" = NEW."id" AND term."status" <> 'ARCHIVED'
  ) THEN
    RAISE EXCEPTION 'an academic year needs a term before activation';
  END IF;

  IF NEW."status" <> 'ACTIVE' AND EXISTS (
    SELECT 1 FROM "academic_terms" term
    WHERE term."academic_year_id" = NEW."id" AND term."status" = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'an inactive academic year cannot contain an active term';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "academic_terms" term
    WHERE term."academic_year_id" = NEW."id"
      AND term."status" <> 'ARCHIVED'
      AND (term."start_date" < NEW."start_date" OR term."end_date" > NEW."end_date")
  ) THEN
    RAISE EXCEPTION 'academic term dates must stay inside the academic year';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER "academic_year_change_guard"
BEFORE UPDATE OF "start_date", "end_date", "status" ON "academic_years"
FOR EACH ROW EXECUTE FUNCTION "validate_academic_year_change"();

CREATE FUNCTION "validate_academic_term_change"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $function$
DECLARE
  parent_start DATE;
  parent_end DATE;
  parent_status "AcademicYearStatus";
BEGIN
  SELECT year."start_date", year."end_date", year."status"
    INTO parent_start, parent_end, parent_status
    FROM "academic_years" year
   WHERE year."id" = NEW."academic_year_id" AND year."school_id" = NEW."school_id"
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'academic year does not belong to this school';
  END IF;

  IF NEW."start_date" < parent_start OR NEW."end_date" > parent_end THEN
    RAISE EXCEPTION 'academic term dates must stay inside the academic year';
  END IF;

  IF NEW."status" = 'ACTIVE' AND parent_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'an academic term can be active only in the active academic year';
  END IF;

  IF parent_status = 'ARCHIVED' AND NEW."status" <> 'ARCHIVED' THEN
    RAISE EXCEPTION 'an archived academic year cannot contain a non-archived term';
  END IF;

  IF parent_status = 'CLOSED' AND NEW."status" IN ('DRAFT', 'ACTIVE') THEN
    RAISE EXCEPTION 'a closed academic year cannot contain a draft or active term';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."status" <> NEW."status" THEN
    IF NOT (
      (OLD."status" = 'DRAFT' AND NEW."status" IN ('ACTIVE', 'ARCHIVED')) OR
      (OLD."status" = 'ACTIVE' AND NEW."status" = 'CLOSED') OR
      (OLD."status" = 'CLOSED' AND NEW."status" = 'ARCHIVED') OR
      (OLD."status" = 'ARCHIVED' AND NEW."status" = 'DRAFT')
    ) THEN
      RAISE EXCEPTION 'invalid academic term status transition';
    END IF;
  END IF;

  IF NEW."status" <> 'ARCHIVED' AND EXISTS (
    SELECT 1 FROM "academic_terms" other
     WHERE other."academic_year_id" = NEW."academic_year_id"
       AND other."id" <> NEW."id"
       AND other."status" <> 'ARCHIVED'
       AND daterange(other."start_date", other."end_date", '[]') && daterange(NEW."start_date", NEW."end_date", '[]')
  ) THEN
    RAISE EXCEPTION 'academic terms cannot overlap';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER "academic_term_change_guard"
BEFORE INSERT OR UPDATE OF "school_id", "academic_year_id", "start_date", "end_date", "status" ON "academic_terms"
FOR EACH ROW EXECUTE FUNCTION "validate_academic_term_change"();

INSERT INTO "permissions" ("id", "code", "scope", "description", "created_at", "updated_at") VALUES
  ('7a661c52-b7e9-4d7e-8f14-d56b4f3b2c01', 'academics.read', 'SCHOOL', 'Akademik yapı kayıtlarını görüntüleme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('7a661c52-b7e9-4d7e-8f14-d56b4f3b2c02', 'academics.manage', 'SCHOOL', 'Öğretim yılı ve dönem kayıtlarını yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT role."id", permission."id", 'SCHOOL', CURRENT_TIMESTAMP
  FROM "roles" role
 CROSS JOIN "permissions" permission
 WHERE role."scope" = 'SCHOOL'
   AND role."code" = 'SCHOOL_ADMIN'
   AND permission."code" IN ('academics.read', 'academics.manage')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

COMMIT;
