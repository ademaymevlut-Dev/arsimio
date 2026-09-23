BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE TYPE "SubjectTrack" AS ENUM ('GENERAL', 'ELECTIVE', 'IGCSE');

ALTER TABLE "subjects"
  ADD COLUMN "track" "SubjectTrack" NOT NULL DEFAULT 'GENERAL';

CREATE INDEX "subjects_school_id_track_archived_at_idx"
  ON "subjects"("school_id", "track", "archived_at");

COMMIT;
