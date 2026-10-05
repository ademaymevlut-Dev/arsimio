CREATE TABLE "employment_hr_profiles" (
  "employment_id" uuid PRIMARY KEY,
  "school_id" uuid NOT NULL,
  "residence_city" varchar(120),
  "neighborhood" varchar(120),
  "address_line" varchar(300),
  "emergency_contact_name" varchar(200),
  "emergency_contact_relation" varchar(80),
  "emergency_contact_phone" varchar(50),
  "internal_note" varchar(500),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employment_hr_profiles_school_id_fkey"
    FOREIGN KEY ("school_id")
    REFERENCES "schools"("id")
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT "employment_hr_profiles_employment_id_school_id_fkey"
    FOREIGN KEY ("employment_id", "school_id")
    REFERENCES "employments"("id", "school_id")
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
);

CREATE INDEX "employment_hr_profiles_school_id_idx"
  ON "employment_hr_profiles"("school_id");

CREATE UNIQUE INDEX "employment_hr_profiles_employment_id_school_id_key"
  ON "employment_hr_profiles"("employment_id", "school_id");
