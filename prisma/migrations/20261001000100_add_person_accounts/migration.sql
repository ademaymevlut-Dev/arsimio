CREATE TYPE "AccountPortal" AS ENUM ('SCHOOL_ADMIN', 'GUARDIAN', 'STUDENT', 'TEACHER', 'STAFF');

CREATE TABLE "person_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "school_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "portal" "AccountPortal" NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "password_reset_at" TIMESTAMPTZ(6),
    "suspended_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "person_accounts_school_id_portal_person_id_key" ON "person_accounts"("school_id", "portal", "person_id");
CREATE UNIQUE INDEX "person_accounts_school_id_portal_user_id_key" ON "person_accounts"("school_id", "portal", "user_id");
CREATE UNIQUE INDEX "person_accounts_school_id_user_id_key" ON "person_accounts"("school_id", "user_id");
CREATE INDEX "person_accounts_school_id_portal_archived_at_idx" ON "person_accounts"("school_id", "portal", "archived_at");
CREATE INDEX "person_accounts_school_id_person_id_idx" ON "person_accounts"("school_id", "person_id");

ALTER TABLE "person_accounts" ADD CONSTRAINT "person_accounts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "person_accounts" ADD CONSTRAINT "person_accounts_person_id_school_id_fkey" FOREIGN KEY ("person_id", "school_id") REFERENCES "persons"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "person_accounts" ADD CONSTRAINT "person_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

INSERT INTO "permissions" ("id", "code", "scope", "description", "created_at", "updated_at") VALUES
  ('8db1dc30-2504-4cbc-af3b-9c1640425c09', 'accounts.read', 'SCHOOL', 'Okul kullanıcı hesaplarını görme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('8db1dc30-2504-4cbc-af3b-9c1640425c10', 'accounts.manage', 'SCHOOL', 'Okul kullanıcı hesaplarını yönetme', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id", "scope", "created_at")
SELECT role."id", permission."id", 'SCHOOL', CURRENT_TIMESTAMP
  FROM "roles" role
 CROSS JOIN "permissions" permission
 WHERE role."scope" = 'SCHOOL'
   AND role."code" = 'SCHOOL_ADMIN'
   AND permission."scope" = 'SCHOOL'
   AND permission."code" IN ('accounts.read', 'accounts.manage')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
