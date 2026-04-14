ALTER TABLE "User"
  ADD COLUMN "isBanned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "bannedAt" TIMESTAMP(3),
  ADD COLUMN "banReason" TEXT;

CREATE TABLE "SystemSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "instanceName" TEXT NOT NULL DEFAULT 'AutoPrint Flow',
  "instanceIconFilePath" TEXT,
  "stripeBackgroundPath" TEXT,
  "stripeFooterText" TEXT NOT NULL DEFAULT 'Printed in "AutoPrint Flow. {year}"',
  "stripeFooterFontSizePt" INTEGER NOT NULL DEFAULT 18,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemSettings" ("id") VALUES (1)
ON CONFLICT ("id") DO NOTHING;
