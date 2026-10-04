-- CreateEnum
CREATE TYPE "StudentAttendanceStatus" AS ENUM ('ABSENT', 'LATE');

-- CreateTable
CREATE TABLE "student_attendance_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "academic_calendar_day_id" UUID NOT NULL,
    "academic_year_class_section_id" UUID NOT NULL,
    "student_profile_id" UUID NOT NULL,
    "status" "StudentAttendanceStatus" NOT NULL,
    "opened_timetable_session_participant_id" UUID NOT NULL,
    "opened_teacher_profile_id" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "late_timetable_session_participant_id" UUID,
    "late_teacher_profile_id" UUID,
    "late_at" TIMESTAMPTZ(6),
    "note" VARCHAR(500),
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sar_day_section_student_key" ON "student_attendance_records"("academic_calendar_day_id", "academic_year_class_section_id", "student_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_attendance_records_id_school_id_key" ON "student_attendance_records"("id", "school_id");

-- CreateIndex
CREATE INDEX "sar_day_lookup_idx" ON "student_attendance_records"("school_id", "academic_year_id", "academic_calendar_day_id");

-- CreateIndex
CREATE INDEX "sar_student_day_lookup_idx" ON "student_attendance_records"("school_id", "student_profile_id", "academic_calendar_day_id");

-- CreateIndex
CREATE INDEX "sar_opened_teacher_day_idx" ON "student_attendance_records"("school_id", "opened_teacher_profile_id", "academic_calendar_day_id");

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_academic_calendar_day_id_school_id_academic_year_id_fkey" FOREIGN KEY ("academic_calendar_day_id", "school_id", "academic_year_id") REFERENCES "academic_calendar_days"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_academic_year_class_section_id_school_id_academic_year_id_fkey" FOREIGN KEY ("academic_year_class_section_id", "school_id", "academic_year_id") REFERENCES "academic_year_class_sections"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_student_profile_id_school_id_fkey" FOREIGN KEY ("student_profile_id", "school_id") REFERENCES "student_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_opened_timetable_session_participant_id_school_id_academic_year_id_fkey" FOREIGN KEY ("opened_timetable_session_participant_id", "school_id", "academic_year_id") REFERENCES "timetable_session_participants"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_opened_teacher_profile_id_school_id_fkey" FOREIGN KEY ("opened_teacher_profile_id", "school_id") REFERENCES "teacher_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_late_timetable_session_participant_id_school_id_academic_year_id_fkey" FOREIGN KEY ("late_timetable_session_participant_id", "school_id", "academic_year_id") REFERENCES "timetable_session_participants"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_attendance_records" ADD CONSTRAINT "student_attendance_records_late_teacher_profile_id_school_id_fkey" FOREIGN KEY ("late_teacher_profile_id", "school_id") REFERENCES "teacher_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
