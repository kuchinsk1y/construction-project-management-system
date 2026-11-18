-- Brigade app sign-in no longer uses ERP users: TMA confirms the foreman by phone.
-- Codes and sessions of foremen get their own tables. auth_codes / refresh_tokens stay for the ERP e-mail sign-in.

-- CreateTable
CREATE TABLE "brigade_auth_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(16) NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "foreman_external_id" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(0) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used_at" TIMESTAMPTZ(0),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brigade_auth_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brigade_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "foreman_external_id" VARCHAR(64) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "refresh_token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(0) NOT NULL,
    "revoked_at" TIMESTAMPTZ(0),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brigade_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brigade_auth_codes_phone_created_at_idx" ON "brigade_auth_codes"("phone", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "brigade_sessions_refresh_token_key" ON "brigade_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "brigade_sessions_foreman_external_id_idx" ON "brigade_sessions"("foreman_external_id");
