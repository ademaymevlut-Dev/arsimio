-- CreateTable
CREATE TABLE "public"."exam_notification_entries" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "academic_calendar_day_id" UUID NOT NULL,
    "academic_year_class_section_id" UUID NOT NULL,
    "timetable_session_participant_id" UUID NOT NULL,
    "teacher_profile_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_by_user_id" UUID,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "exam_notification_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ene_day_section_key" ON "public"."exam_notification_entries"("academic_calendar_day_id", "academic_year_class_section_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_notification_entries_id_school_id_key" ON "public"."exam_notification_entries"("id", "school_id");

-- CreateIndex
CREATE INDEX "ene_day_lookup_idx" ON "public"."exam_notification_entries"("school_id", "academic_year_id", "academic_calendar_day_id");

-- CreateIndex
CREATE INDEX "ene_teacher_day_lookup_idx" ON "public"."exam_notification_entries"("school_id", "teacher_profile_id", "academic_calendar_day_id");

-- AddForeignKey
ALTER TABLE "public"."exam_notification_entries" ADD CONSTRAINT "exam_notification_entries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."exam_notification_entries" ADD CONSTRAINT "exam_notification_entries_academic_year_id_school_id_fkey" FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "public"."academic_years"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."exam_notification_entries" ADD CONSTRAINT "exam_notification_entries_academic_calendar_day_id_school_id_academic_year_id_fkey" FOREIGN KEY ("academic_calendar_day_id", "school_id", "academic_year_id") REFERENCES "public"."academic_calendar_days"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."exam_notification_entries" ADD CONSTRAINT "exam_notification_entries_academic_year_class_section_id_school_id_academic_year_id_fkey" FOREIGN KEY ("academic_year_class_section_id", "school_id", "academic_year_id") REFERENCES "public"."academic_year_class_sections"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."exam_notification_entries" ADD CONSTRAINT "exam_notification_entries_timetable_session_participant_id_school_id_academic_year_id_fkey" FOREIGN KEY ("timetable_session_participant_id", "school_id", "academic_year_id") REFERENCES "public"."timetable_session_participants"("id", "school_id", "academic_year_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "public"."exam_notification_entries" ADD CONSTRAINT "exam_notification_entries_teacher_profile_id_school_id_fkey" FOREIGN KEY ("teacher_profile_id", "school_id") REFERENCES "public"."teacher_profiles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
