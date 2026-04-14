CREATE TYPE "PrintProductType" AS ENUM ('STICKER_STRIPE', 'LASER_MONO', 'PHOTO_A4', 'DISC_PRINT', 'BUSINESS_CARD', 'CUSTOM');
CREATE TYPE "ProductionUnit" AS ENUM ('SHEET', 'DISK', 'CARD', 'ITEM');

CREATE TABLE "PrintProfile" (
  "id" SERIAL NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" "PrintProductType" NOT NULL,
  "productionUnit" "ProductionUnit" NOT NULL,
  "acceptsMaterials" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrintProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrintMaterial" (
  "id" SERIAL NOT NULL,
  "profileId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "weightGsm" INTEGER,
  "finish" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrintMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrintProfile_slug_key" ON "PrintProfile"("slug");
CREATE INDEX "PrintProfile_type_idx" ON "PrintProfile"("type");
CREATE UNIQUE INDEX "PrintMaterial_profileId_name_key" ON "PrintMaterial"("profileId", "name");
CREATE INDEX "PrintMaterial_profileId_sortOrder_idx" ON "PrintMaterial"("profileId", "sortOrder");

ALTER TABLE "PrintMaterial"
  ADD CONSTRAINT "PrintMaterial_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "PrintProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
