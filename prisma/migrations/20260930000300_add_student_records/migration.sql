BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE TYPE "PersonSex" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "PersonStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "IdentityType" AS ENUM ('NATIONAL_ID', 'PASSPORT');
CREATE TYPE "ContactKind" AS ENUM ('PHONE', 'EMAIL');
CREATE TYPE "SchoolSequenceKind" AS ENUM ('STUDENT_NUMBER');
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'GRADUATED');
CREATE TYPE "GuardianRelationshipType" AS ENUM ('MOTHER', 'FATHER');
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "EnrollmentOutcome" AS ENUM ('PROMOTED', 'REPEATED', 'GRADUATED', 'TRANSFERRED', 'WITHDRAWN', 'UNKNOWN');
CREATE TYPE "StudentLifecycleEventType" AS ENUM ('ACTIVATED', 'INACTIVATED', 'REACTIVATED', 'TRANSFERRED_OUT', 'WITHDRAWN', 'GRADUATED');
CREATE TYPE "StudentExitReason" AS ENUM ('FAMILY_RELOCATION', 'COST', 'OTHER_SCHOOL', 'OTHER', 'UNKNOWN');

CREATE TABLE "persons" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "first_name" VARCHAR(100) NOT NULL,
  "middle_name" VARCHAR(100),
  "last_name" VARCHAR(100) NOT NULL,
  "birth_date" DATE,
  "birth_place" VARCHAR(150),
  "nationality_text" VARCHAR(100),
  "sex" "PersonSex",
  "status" "PersonStatus" NOT NULL DEFAULT 'ACTIVE',
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "persons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "persons_first_name_check" CHECK (btrim("first_name") <> ''),
  CONSTRAINT "persons_middle_name_check" CHECK ("middle_name" IS NULL OR btrim("middle_name") <> ''),
  CONSTRAINT "persons_last_name_check" CHECK (btrim("last_name") <> ''),
  CONSTRAINT "persons_archived_state_check" CHECK (("status" = 'ARCHIVED') = ("archived_at" IS NOT NULL))
);

CREATE TABLE "person_identities" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "person_id" UUID NOT NULL,
  "type" "IdentityType" NOT NULL,
  "country_code" VARCHAR(2),
  "encrypted_value" BYTEA NOT NULL,
  "lookup_hash" CHAR(64) NOT NULL,
  "last_four" VARCHAR(4) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "person_identities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "person_identities_country_check" CHECK ("country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "person_identities_hash_check" CHECK ("lookup_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "person_identities_last_four_check" CHECK (char_length("last_four") BETWEEN 1 AND 4)
);

CREATE TABLE "person_contact_points" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "person_id" UUID NOT NULL,
  "kind" "ContactKind" NOT NULL,
  "value" VARCHAR(320) NOT NULL,
  "normalized_value" VARCHAR(320) NOT NULL,
  "label" VARCHAR(50),
  "is_primary_for_person" BOOLEAN NOT NULL DEFAULT false,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "person_contact_points_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "person_contact_points_value_check" CHECK (btrim("value") <> '' AND btrim("normalized_value") <> '')
);

CREATE TABLE "school_number_sequences" (
  "school_id" UUID NOT NULL,
  "kind" "SchoolSequenceKind" NOT NULL,
  "next_value" BIGINT NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "school_number_sequences_pkey" PRIMARY KEY ("school_id", "kind"),
  CONSTRAINT "school_number_sequences_next_value_check" CHECK ("next_value" > 0)
);

CREATE TABLE "student_profiles" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "person_id" UUID NOT NULL,
  "student_number" VARCHAR(40) NOT NULL,
  "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
  "admitted_on" DATE NOT NULL,
  "inactive_on" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_profiles_number_check" CHECK ("student_number" ~ '^[0-9]+$'),
  CONSTRAINT "student_profiles_status_date_check" CHECK (
    ("status" = 'ACTIVE' AND "inactive_on" IS NULL)
    OR ("status" IN ('INACTIVE', 'GRADUATED') AND "inactive_on" IS NOT NULL)
  )
);

CREATE TABLE "guardian_relationships" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "student_profile_id" UUID NOT NULL,
  "guardian_person_id" UUID NOT NULL,
  "relationship_type" "GuardianRelationshipType" NOT NULL,
  "is_legal_guardian" BOOLEAN NOT NULL DEFAULT false,
  "is_primary_contact" BOOLEAN NOT NULL DEFAULT false,
  "archived_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "guardian_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enrollments" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "student_profile_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "enrolled_on" DATE NOT NULL,
  "ended_on" DATE,
  "outcome" "EnrollmentOutcome",
  "outcome_on" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enrollments_dates_check" CHECK ("ended_on" IS NULL OR "ended_on" >= "enrolled_on"),
  CONSTRAINT "enrollments_outcome_date_check" CHECK (("outcome" IS NULL) = ("outcome_on" IS NULL)),
  CONSTRAINT "enrollments_active_check" CHECK ("status" <> 'ACTIVE' OR ("ended_on" IS NULL AND "outcome" IS NULL))
);

CREATE TABLE "student_group_placements" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "enrollment_id" UUID NOT NULL,
  "academic_year_class_section_id" UUID NOT NULL,
  "valid_from" DATE NOT NULL,
  "valid_to" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "student_group_placements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_group_placements_dates_check" CHECK ("valid_to" IS NULL OR "valid_to" >= "valid_from")
);

CREATE TABLE "student_lifecycle_events" (
  "id" UUID NOT NULL,
  "school_id" UUID NOT NULL,
  "student_profile_id" UUID NOT NULL,
  "type" "StudentLifecycleEventType" NOT NULL,
  "effective_on" DATE NOT NULL,
  "exit_reason" "StudentExitReason",
  "note" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_lifecycle_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_lifecycle_events_exit_reason_check" CHECK (
    ("type" IN ('INACTIVATED', 'TRANSFERRED_OUT', 'WITHDRAWN') AND "exit_reason" IS NOT NULL)
    OR ("type" NOT IN ('INACTIVATED', 'TRANSFERRED_OUT', 'WITHDRAWN') AND "exit_reason" IS NULL)
  )
);

CREATE UNIQUE INDEX "persons_id_school_id_key" ON "persons"("id", "school_id");
CREATE INDEX "persons_school_status_name_idx" ON "persons"("school_id", "status", "last_name", "first_name");
CREATE UNIQUE INDEX "person_identities_school_person_type_key" ON "person_identities"("school_id", "person_id", "type");
CREATE UNIQUE INDEX "person_identities_school_type_hash_key" ON "person_identities"("school_id", "type", "lookup_hash");
CREATE INDEX "person_identities_school_person_idx" ON "person_identities"("school_id", "person_id");
CREATE UNIQUE INDEX "person_contact_points_scope_value_key" ON "person_contact_points"("school_id", "person_id", "kind", "normalized_value");
CREATE INDEX "person_contact_points_scope_archived_idx" ON "person_contact_points"("school_id", "person_id", "archived_at");
CREATE UNIQUE INDEX "person_contact_points_one_primary_kind_key" ON "person_contact_points"("school_id", "person_id", "kind") WHERE "archived_at" IS NULL AND "is_primary_for_person";
CREATE UNIQUE INDEX "student_profiles_person_id_school_id_key" ON "student_profiles"("person_id", "school_id");
CREATE UNIQUE INDEX "student_profiles_school_number_key" ON "student_profiles"("school_id", "student_number");
CREATE UNIQUE INDEX "student_profiles_id_school_id_key" ON "student_profiles"("id", "school_id");
CREATE INDEX "student_profiles_school_status_number_idx" ON "student_profiles"("school_id", "status", "student_number");
CREATE UNIQUE INDEX "guardian_relationships_scope_pair_key" ON "guardian_relationships"("school_id", "student_profile_id", "guardian_person_id");
CREATE UNIQUE INDEX "guardian_relationships_id_school_id_key" ON "guardian_relationships"("id", "school_id");
CREATE UNIQUE INDEX "guardian_relationships_one_primary_key" ON "guardian_relationships"("school_id", "student_profile_id") WHERE "archived_at" IS NULL AND "is_primary_contact";
CREATE INDEX "guardian_relationships_guardian_idx" ON "guardian_relationships"("school_id", "guardian_person_id", "archived_at");
CREATE INDEX "guardian_relationships_student_idx" ON "guardian_relationships"("school_id", "student_profile_id", "archived_at");
CREATE UNIQUE INDEX "enrollments_student_year_key" ON "enrollments"("school_id", "student_profile_id", "academic_year_id");
CREATE UNIQUE INDEX "enrollments_id_school_year_key" ON "enrollments"("id", "school_id", "academic_year_id");
CREATE INDEX "enrollments_school_year_status_idx" ON "enrollments"("school_id", "academic_year_id", "status");
CREATE UNIQUE INDEX "student_group_placements_enrollment_from_key" ON "student_group_placements"("enrollment_id", "valid_from");
CREATE UNIQUE INDEX "student_group_placements_id_school_id_key" ON "student_group_placements"("id", "school_id");
CREATE INDEX "student_group_placements_scope_section_from_idx" ON "student_group_placements"("school_id", "academic_year_id", "academic_year_class_section_id", "valid_from");
CREATE INDEX "student_lifecycle_events_student_date_idx" ON "student_lifecycle_events"("school_id", "student_profile_id", "effective_on");
CREATE INDEX "student_lifecycle_events_stats_idx" ON "student_lifecycle_events"("school_id", "type", "exit_reason", "effective_on");

ALTER TABLE "persons" ADD CONSTRAINT "persons_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "person_identities" ADD CONSTRAINT "person_identities_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "person_identities" ADD CONSTRAINT "person_identities_person_school_fkey" FOREIGN KEY ("person_id", "school_id") REFERENCES "persons"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "person_contact_points" ADD CONSTRAINT "person_contact_points_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "person_contact_points" ADD CONSTRAINT "person_contact_points_person_school_fkey" FOREIGN KEY ("person_id", "school_id") REFERENCES "persons"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "school_number_sequences" ADD CONSTRAINT "school_number_sequences_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_person_school_fkey" FOREIGN KEY ("person_id", "school_id") REFERENCES "persons"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "guardian_relationships" ADD CONSTRAINT "guardian_relationships_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "guardian_relationships" ADD CONSTRAINT "guardian_relationships_student_school_fkey" FOREIGN KEY ("student_profile_id", "school_id") REFERENCES "student_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "guardian_relationships" ADD CONSTRAINT "guardian_relationships_guardian_school_fkey" FOREIGN KEY ("guardian_person_id", "school_id") REFERENCES "persons"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_school_fkey" FOREIGN KEY ("student_profile_id", "school_id") REFERENCES "student_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_year_school_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "student_group_placements" ADD CONSTRAINT "student_group_placements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "student_group_placements" ADD CONSTRAINT "student_group_placements_year_school_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "student_group_placements" ADD CONSTRAINT "student_group_placements_enrollment_scope_fkey" FOREIGN KEY ("enrollment_id", "school_id", "academic_year_id") REFERENCES "enrollments"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "student_group_placements" ADD CONSTRAINT "student_group_placements_section_scope_fkey" FOREIGN KEY ("academic_year_class_section_id", "school_id", "academic_year_id") REFERENCES "academic_year_class_sections"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "student_lifecycle_events" ADD CONSTRAINT "student_lifecycle_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "student_lifecycle_events" ADD CONSTRAINT "student_lifecycle_events_student_school_fkey" FOREIGN KEY ("student_profile_id", "school_id") REFERENCES "student_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION "validate_guardian_relationship_change"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE student_person_id UUID;
BEGIN
  SELECT "person_id" INTO student_person_id
    FROM "student_profiles"
   WHERE "id" = NEW."student_profile_id" AND "school_id" = NEW."school_id";
  IF student_person_id IS NULL OR student_person_id = NEW."guardian_person_id" THEN
    RAISE EXCEPTION 'guardian must be a different person in the same school';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "guardian_relationships_validate_change"
BEFORE INSERT OR UPDATE ON "guardian_relationships"
FOR EACH ROW EXECUTE FUNCTION "validate_guardian_relationship_change"();

CREATE FUNCTION "validate_student_group_placement_change"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE year_start DATE;
DECLARE year_end DATE;
BEGIN
  SELECT "start_date", "end_date" INTO year_start, year_end
    FROM "academic_years"
   WHERE "id" = NEW."academic_year_id" AND "school_id" = NEW."school_id";

  IF year_start IS NULL OR NEW."valid_from" < year_start OR COALESCE(NEW."valid_to", year_end) > year_end THEN
    RAISE EXCEPTION 'student placement dates must be inside the academic year';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM "student_group_placements" existing
     WHERE existing."enrollment_id" = NEW."enrollment_id"
       AND existing."id" <> NEW."id"
       AND daterange(existing."valid_from", COALESCE(existing."valid_to", 'infinity'::date), '[]')
           && daterange(NEW."valid_from", COALESCE(NEW."valid_to", 'infinity'::date), '[]')
  ) THEN
    RAISE EXCEPTION 'student placement date ranges cannot overlap';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "student_group_placements_validate_change"
BEFORE INSERT OR UPDATE ON "student_group_placements"
FOR EACH ROW EXECUTE FUNCTION "validate_student_group_placement_change"();

INSERT INTO "permissions" ("id", "code", "scope", "description", "created_at", "updated_at") VALUES
  ('8db1dc30-2504-4cbc-af3b-9c1640425c01', 'persons.read', 'SCHOOL', 'Temel kişi kayıtlarını görme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8db1dc30-2504-4cbc-af3b-9c1640425c02', 'persons.manage', 'SCHOOL', 'Temel kişi kayıtlarını yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8db1dc30-2504-4cbc-af3b-9c1640425c03', 'persons.identity.read', 'SCHOOL', 'Maskeli resmî kimlik bilgisini görme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8db1dc30-2504-4cbc-af3b-9c1640425c04', 'persons.identity.manage', 'SCHOOL', 'Resmî kimlik bilgisini yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8db1dc30-2504-4cbc-af3b-9c1640425c05', 'students.read', 'SCHOOL', 'Öğrenci ve yıllık kayıtları görme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8db1dc30-2504-4cbc-af3b-9c1640425c06', 'students.manage', 'SCHOOL', 'Öğrenci ve yıllık kayıtları yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8db1dc30-2504-4cbc-af3b-9c1640425c07', 'guardians.read', 'SCHOOL', 'Öğrenci anne/baba ilişkilerini görme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8db1dc30-2504-4cbc-af3b-9c1640425c08', 'guardians.manage', 'SCHOOL', 'Öğrenci anne/baba ilişkilerini yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT role."id", permission."id", 'SCHOOL', CURRENT_TIMESTAMP
  FROM "roles" role
 CROSS JOIN "permissions" permission
 WHERE role."scope" = 'SCHOOL'
   AND role."code" = 'SCHOOL_ADMIN'
   AND permission."scope" = 'SCHOOL'
   AND permission."code" IN (
     'persons.read', 'persons.manage', 'persons.identity.read', 'persons.identity.manage',
     'students.read', 'students.manage', 'guardians.read', 'guardians.manage'
   )
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

COMMIT;
