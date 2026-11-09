-- Brigade app sign-in (phone -> Telegram code): codes and sessions are tagged so they never mix with ERP e-mail sign-in.
-- Existing rows keep working: codes are 'email', sessions are 'erp'.
-- AlterTable
ALTER TABLE "auth_codes" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "channel" VARCHAR(20) NOT NULL DEFAULT 'email';

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "scope" VARCHAR(20) NOT NULL DEFAULT 'erp';

-- CreateIndex
CREATE INDEX "auth_codes_userId_channel_createdAt_idx" ON "auth_codes"("userId", "channel", "createdAt");

