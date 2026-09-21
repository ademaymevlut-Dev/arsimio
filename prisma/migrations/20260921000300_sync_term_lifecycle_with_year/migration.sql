BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- A school year can have multiple usable terms. The event date, not a manually
-- selected "current term", determines which term owns a grade, note or comment.
DROP INDEX IF EXISTS "academic_terms_one_active_per_year_key";

CREATE OR REPLACE FUNCTION "validate_academic_year_change"() RETURNS trigger
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

CREATE OR REPLACE FUNCTION "validate_academic_term_change"() RETURNS trigger
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
    RAISE EXCEPTION 'academic terms are active only with their active academic year';
  END IF;

  IF parent_status = 'ARCHIVED' AND NEW."status" <> 'ARCHIVED' THEN
    RAISE EXCEPTION 'an archived academic year cannot contain a non-archived term';
  END IF;

  IF parent_status = 'CLOSED' AND NEW."status" IN ('DRAFT', 'ACTIVE') THEN
    RAISE EXCEPTION 'a closed academic year cannot contain a draft or active term';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."status" <> NEW."status" THEN
    IF NOT (
      (OLD."status" = 'DRAFT' AND NEW."status" IN ('ACTIVE', 'CLOSED', 'ARCHIVED')) OR
      (OLD."status" = 'ACTIVE' AND NEW."status" = 'CLOSED') OR
      (OLD."status" = 'CLOSED' AND NEW."status" IN ('ACTIVE', 'ARCHIVED')) OR
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

-- Repair the state produced by the previous single-active-term workflow.
-- All non-archived terms of the active year become usable together.
UPDATE "academic_terms" term
   SET "status" = 'ACTIVE',
       "updated_at" = CURRENT_TIMESTAMP
  FROM "academic_years" year
 WHERE year."id" = term."academic_year_id"
   AND year."school_id" = term."school_id"
   AND year."status" = 'ACTIVE'
   AND term."status" <> 'ARCHIVED'
   AND term."status" <> 'ACTIVE';

COMMIT;
