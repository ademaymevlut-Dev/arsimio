CREATE TYPE "AcademicCalendarDayType" AS ENUM ('INSTRUCTIONAL', 'HOLIDAY', 'BREAK', 'ADMIN_CLOSED', 'EXAM', 'EVENT');

CREATE TABLE "academic_weeks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "academic_term_id" UUID,
  "sequence" INTEGER NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "instructional_day_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "academic_weeks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "academic_calendar_days" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "academic_year_id" UUID NOT NULL,
  "academic_week_id" UUID NOT NULL,
  "academic_term_id" UUID,
  "date" DATE NOT NULL,
  "weekday" "TimetableWeekday" NOT NULL,
  "day_type" "AcademicCalendarDayType" NOT NULL DEFAULT 'INSTRUCTIONAL',
  "is_instructional_day" BOOLEAN NOT NULL DEFAULT true,
  "note" VARCHAR(500),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "academic_calendar_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academic_weeks_academic_year_id_sequence_key" ON "academic_weeks"("academic_year_id", "sequence");
CREATE UNIQUE INDEX "academic_weeks_id_school_id_academic_year_id_key" ON "academic_weeks"("id", "school_id", "academic_year_id");
CREATE INDEX "academic_weeks_school_id_academic_year_id_start_date_idx" ON "academic_weeks"("school_id", "academic_year_id", "start_date");
CREATE INDEX "academic_weeks_school_id_academic_term_id_sequence_idx" ON "academic_weeks"("school_id", "academic_term_id", "sequence");

CREATE UNIQUE INDEX "academic_calendar_days_academic_year_id_date_key" ON "academic_calendar_days"("academic_year_id", "date");
CREATE UNIQUE INDEX "academic_calendar_days_id_school_id_academic_year_id_key" ON "academic_calendar_days"("id", "school_id", "academic_year_id");
CREATE INDEX "academic_calendar_days_school_id_academic_year_id_date_idx" ON "academic_calendar_days"("school_id", "academic_year_id", "date");
CREATE INDEX "academic_calendar_days_school_id_academic_week_id_weekday_idx" ON "academic_calendar_days"("school_id", "academic_week_id", "weekday");

ALTER TABLE "academic_weeks" ADD CONSTRAINT "academic_weeks_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_weeks" ADD CONSTRAINT "academic_weeks_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_weeks" ADD CONSTRAINT "academic_weeks_academic_term_id_school_id_fkey" FOREIGN KEY ("academic_term_id", "school_id") REFERENCES "academic_terms"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "academic_calendar_days" ADD CONSTRAINT "academic_calendar_days_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_calendar_days" ADD CONSTRAINT "academic_calendar_days_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_calendar_days" ADD CONSTRAINT "academic_calendar_days_academic_week_id_school_id_academic_year_id_fkey" FOREIGN KEY ("academic_week_id", "school_id", "academic_year_id") REFERENCES "academic_weeks"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "academic_calendar_days" ADD CONSTRAINT "academic_calendar_days_academic_term_id_school_id_fkey" FOREIGN KEY ("academic_term_id", "school_id") REFERENCES "academic_terms"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
