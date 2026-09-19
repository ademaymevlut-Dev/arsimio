BEGIN;

-- Email is optional for school users. Existing addresses and provider identities remain intact.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "school_memberships" ADD COLUMN "username" VARCHAR(64);
CREATE UNIQUE INDEX "school_memberships_school_id_username_key" ON "school_memberships"("school_id", "username");
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_username_check"
  CHECK ("username" IS NULL OR "username" ~ '^[a-z0-9][a-z0-9._-]{2,63}$');

CREATE TABLE "user_credentials" (
  "user_id" UUID NOT NULL PRIMARY KEY,
  "password_hash" VARCHAR(255) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL PRIMARY KEY,
  "user_id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL CHECK ("token_hash" ~ '^[a-f0-9]{64}$'),
  "hostname" VARCHAR(253) NOT NULL CHECK ("hostname" = lower(btrim("hostname")) AND length("hostname") > 0),
  "school_id" UUID,
  "membership_id" UUID,
  "credential_version" INTEGER NOT NULL CHECK ("credential_version" > 0),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_scope_check" CHECK (("school_id" IS NULL) = ("membership_id" IS NULL)),
  CONSTRAINT "auth_sessions_expiry_check" CHECK ("expires_at" > "created_at"),
  CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "auth_sessions_membership_id_school_id_user_id_fkey" FOREIGN KEY ("membership_id", "school_id", "user_id") REFERENCES "school_memberships"("id", "school_id", "user_id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");
CREATE INDEX "auth_sessions_user_id_expires_at_idx" ON "auth_sessions"("user_id", "expires_at");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

CREATE TABLE "auth_throttles" (
  "key" CHAR(64) NOT NULL PRIMARY KEY,
  "attempts" INTEGER NOT NULL CHECK ("attempts" > 0),
  "reset_at" TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX "auth_throttles_reset_at_idx" ON "auth_throttles"("reset_at");

COMMIT;
