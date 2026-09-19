-- Initial application schema. Keep Neon-managed schemas outside this migration.
BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'DISABLED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('PLATFORM', 'SCHOOL');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('USER', 'SYSTEM', 'API', 'IMPORT');

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "legal_name" VARCHAR(240),
    "status" "SchoolStatus" NOT NULL DEFAULT 'DRAFT',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "default_locale" VARCHAR(10) NOT NULL DEFAULT 'tr',
    "created_by_user_id" UUID,
    "archived_at" TIMESTAMPTZ(6),
    "archived_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_domains" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "hostname" VARCHAR(253) NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "last_checked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "school_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_branding" (
    "school_id" UUID NOT NULL,
    "logo_asset_key" VARCHAR(500),
    "icon_asset_key" VARCHAR(500),
    "primary_color" VARCHAR(20),
    "secondary_color" VARCHAR(20),
    "accent_color" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "school_branding_pkey" PRIMARY KEY ("school_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_provider" VARCHAR(50),
    "auth_provider_user_id" VARCHAR(191),
    "email" VARCHAR(320) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "last_login_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_memberships" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "joined_at" TIMESTAMPTZ(6),
    "suspended_at" TIMESTAMPTZ(6),
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "school_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "school_id" UUID,
    "key" VARCHAR(191) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "scope" "RoleScope" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(191) NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "membership_roles" (
    "school_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("membership_id","role_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "role_scope" "RoleScope" NOT NULL DEFAULT 'PLATFORM',
    "assigned_by_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "school_invitations" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "token_hash" VARCHAR(191) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by_user_id" UUID NOT NULL,
    "accepted_by_user_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "school_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_roles" (
    "school_id" UUID NOT NULL,
    "invitation_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "invitation_roles_pkey" PRIMARY KEY ("invitation_id","role_id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "school_id" UUID,
    "actor_user_id" UUID,
    "actor_membership_id" UUID,
    "source" "AuditSource" NOT NULL DEFAULT 'USER',
    "action" VARCHAR(191) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(191),
    "before_data" JSONB,
    "after_data" JSONB,
    "changed_fields" JSONB,
    "reason" VARCHAR(1000),
    "request_id" VARCHAR(100),
    "ip_address" INET,
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_slug_key" ON "schools"("slug");

-- CreateIndex
CREATE INDEX "schools_status_idx" ON "schools"("status");

-- CreateIndex
CREATE UNIQUE INDEX "school_domains_hostname_key" ON "school_domains"("hostname");

-- CreateIndex
CREATE INDEX "school_domains_school_id_status_idx" ON "school_domains"("school_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_auth_provider_user_id_key" ON "users"("auth_provider", "auth_provider_user_id");

-- CreateIndex
CREATE INDEX "school_memberships_school_id_status_idx" ON "school_memberships"("school_id", "status");

-- CreateIndex
CREATE INDEX "school_memberships_user_id_status_idx" ON "school_memberships"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "school_memberships_school_id_user_id_key" ON "school_memberships"("school_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_memberships_id_school_id_key" ON "school_memberships"("id", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_memberships_id_school_id_user_id_key" ON "school_memberships"("id", "school_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE INDEX "roles_scope_is_system_idx" ON "roles"("scope", "is_system");

-- CreateIndex
CREATE UNIQUE INDEX "roles_school_id_code_key" ON "roles"("school_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_id_school_id_key" ON "roles"("id", "school_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_id_scope_key" ON "roles"("id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_id_scope_key" ON "permissions"("id", "scope");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_scope_idx" ON "role_permissions"("permission_id", "scope");

-- CreateIndex
CREATE INDEX "membership_roles_role_id_idx" ON "membership_roles"("role_id");

-- CreateIndex
CREATE INDEX "membership_roles_school_id_idx" ON "membership_roles"("school_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "school_invitations_token_hash_key" ON "school_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "school_invitations_school_id_email_status_idx" ON "school_invitations"("school_id", "email", "status");

-- CreateIndex
CREATE INDEX "school_invitations_expires_at_status_idx" ON "school_invitations"("expires_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "school_invitations_id_school_id_key" ON "school_invitations"("id", "school_id");

-- CreateIndex
CREATE INDEX "invitation_roles_role_id_idx" ON "invitation_roles"("role_id");

-- CreateIndex
CREATE INDEX "invitation_roles_school_id_idx" ON "invitation_roles"("school_id");

-- CreateIndex
CREATE INDEX "audit_events_school_id_created_at_idx" ON "audit_events"("school_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_user_id_created_at_idx" ON "audit_events"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_created_at_idx" ON "audit_events"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_request_id_idx" ON "audit_events"("request_id");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_domains" ADD CONSTRAINT "school_domains_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_branding" ADD CONSTRAINT "school_branding_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_scope_fkey" FOREIGN KEY ("role_id", "scope") REFERENCES "roles"("id", "scope") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_scope_fkey" FOREIGN KEY ("permission_id", "scope") REFERENCES "permissions"("id", "scope") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membership_id_school_id_fkey" FOREIGN KEY ("membership_id", "school_id") REFERENCES "school_memberships"("id", "school_id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_role_id_school_id_fkey" FOREIGN KEY ("role_id", "school_id") REFERENCES "roles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_role_scope_fkey" FOREIGN KEY ("role_id", "role_scope") REFERENCES "roles"("id", "scope") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_invitations" ADD CONSTRAINT "school_invitations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_invitations" ADD CONSTRAINT "school_invitations_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_invitations" ADD CONSTRAINT "school_invitations_accepted_by_user_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_roles" ADD CONSTRAINT "invitation_roles_invitation_id_school_id_fkey" FOREIGN KEY ("invitation_id", "school_id") REFERENCES "school_invitations"("id", "school_id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "invitation_roles" ADD CONSTRAINT "invitation_roles_role_id_school_id_fkey" FOREIGN KEY ("role_id", "school_id") REFERENCES "roles"("id", "school_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_membership_id_school_id_actor_user_id_fkey" FOREIGN KEY ("actor_membership_id", "school_id", "actor_user_id") REFERENCES "school_memberships"("id", "school_id", "user_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- SQL-only invariants. Keep these in migration history; schema.prisma cannot
-- express CHECK constraints and triggers. See docs/database-migrations.md.
ALTER TABLE "roles" ADD CONSTRAINT "roles_scope_school_check" CHECK (
    ("scope" = 'PLATFORM' AND "school_id" IS NULL)
    OR ("scope" = 'SCHOOL' AND "school_id" IS NOT NULL)
);

CREATE UNIQUE INDEX "roles_platform_code_key" ON "roles" ("code")
    WHERE "school_id" IS NULL;

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_platform_only_check"
    CHECK ("role_scope" = 'PLATFORM');

ALTER TABLE "schools" ADD CONSTRAINT "schools_slug_format_check"
    CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Store normalized ASCII/punycode hostnames without protocol, path or port.
ALTER TABLE "school_domains" ADD CONSTRAINT "school_domains_hostname_format_check"
    CHECK ("hostname" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$');
ALTER TABLE "school_domains" ADD CONSTRAINT "school_domains_verified_check"
    CHECK ("status" <> 'VERIFIED' OR "verified_at" IS NOT NULL);
ALTER TABLE "school_domains" ADD CONSTRAINT "school_domains_primary_verified_check"
    CHECK (NOT "is_primary" OR "status" = 'VERIFIED');
CREATE UNIQUE INDEX "school_domains_one_primary_per_school_key"
    ON "school_domains" ("school_id") WHERE "is_primary";

-- Application input normalizes emails before saving; DB rejects bypasses.
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized_check"
    CHECK ("email" = lower(btrim("email")) AND length("email") > 0);
ALTER TABLE "school_invitations" ADD CONSTRAINT "school_invitations_email_normalized_check"
    CHECK ("email" = lower(btrim("email")) AND length("email") > 0);
ALTER TABLE "users" ADD CONSTRAINT "users_auth_identity_pair_check"
    CHECK (("auth_provider" IS NULL) = ("auth_provider_user_id" IS NULL));
ALTER TABLE "school_invitations" ADD CONSTRAINT "school_invitations_expiry_check"
    CHECK ("expires_at" > "created_at");

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_context_check"
    CHECK ("actor_membership_id" IS NULL OR ("school_id" IS NOT NULL AND "actor_user_id" IS NOT NULL));
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_actor_check"
    CHECK ("source" <> 'USER' OR "actor_user_id" IS NOT NULL);

CREATE FUNCTION public.arsimio_reject_audit_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE EXCEPTION 'audit_events is append-only; % is not allowed', TG_OP
        USING ERRCODE = '55000';
END;
$function$;

CREATE TRIGGER "audit_events_append_only"
    BEFORE UPDATE OR DELETE OR TRUNCATE ON public.audit_events
    FOR EACH STATEMENT EXECUTE FUNCTION public.arsimio_reject_audit_mutation();

COMMENT ON TABLE public.audit_events IS
    'Append-only audit history. Retention/anonymization needs a separately reviewed administrative operation.';

COMMIT;
