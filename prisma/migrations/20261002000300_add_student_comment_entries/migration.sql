-- CreateEnum
CREATE TYPE "StudentCommentCategory" AS ENUM ('GREEN_CARD', 'POSITIVE', 'INFORMATION', 'NEGATIVE', 'RED_CARD');

-- CreateTable
CREATE TABLE "student_comment_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "academic_calendar_day_id" UUID NOT NULL,
    "timetable_session_participant_id" UUID NOT NULL,
    "teacher_profile_id" UUID NOT NULL,
    "student_profile_id" UUID NOT NULL,
    "category" "StudentCommentCategory" NOT NULL,
    "comment_point" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_comment_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sce_participant_day_student_key" ON "student_comment_entries"("timetable_session_participant_id", "academic_calendar_day_id", "student_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_comment_entries_id_school_id_key" ON "student_comment_entries"("id", "school_id");

-- CreateIndex
CREATE INDEX "sce_day_lookup_idx" ON "student_comment_entries"("school_id", "academic_year_id", "academic_calendar_day_id");

-- CreateIndex
CREATE INDEX "sce_teacher_day_lookup_idx" ON "student_comment_entries"("school_id", "teacher_profile_id", "academic_calendar_day_id");

-- CreateIndex
CREATE INDEX "sce_student_day_lookup_idx" ON "student_comment_entries"("school_id", "student_profile_id", "academic_calendar_day_id");

-- AddForeignKey
ALTER TABLE "student_comment_entries" ADD CONSTRAINT "student_comment_entries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_comment_entries" ADD CONSTRAINT "student_comment_entries_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_comment_entries" ADD CONSTRAINT "student_comment_entries_academic_calendar_day_id_school_id_academic_year_id_fkey" FOREIGN KEY ("academic_calendar_day_id", "school_id", "academic_year_id") REFERENCES "academic_calendar_days"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_comment_entries" ADD CONSTRAINT "student_comment_entries_timetable_session_participant_id_school_id_academic_year_id_fkey" FOREIGN KEY ("timetable_session_participant_id", "school_id", "academic_year_id") REFERENCES "timetable_session_participants"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_comment_entries" ADD CONSTRAINT "student_comment_entries_teacher_profile_id_school_id_fkey" FOREIGN KEY ("teacher_profile_id", "school_id") REFERENCES "teacher_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "student_comment_entries" ADD CONSTRAINT "student_comment_entries_student_profile_id_school_id_fkey" FOREIGN KEY ("student_profile_id", "school_id") REFERENCES "student_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
