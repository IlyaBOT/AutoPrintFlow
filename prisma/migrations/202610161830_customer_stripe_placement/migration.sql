ALTER TABLE "SystemSettings" ADD COLUMN "separateCustomerStripes" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "PrintStripe" (
    "id" TEXT NOT NULL,
    "position" SERIAL NOT NULL,
    "label" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrintStripe_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PrintStripe_position_key" ON "PrintStripe"("position");
CREATE INDEX "PrintStripe_customerId_isManual_idx" ON "PrintStripe"("customerId", "isManual");
ALTER TABLE "PrintStripe" ADD CONSTRAINT "PrintStripe_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sticker" ADD COLUMN "printStripeId" TEXT, ADD COLUMN "printSlot" INTEGER;
CREATE UNIQUE INDEX "Sticker_printStripeId_printSlot_key" ON "Sticker"("printStripeId", "printSlot");
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_printStripeId_fkey" FOREIGN KEY ("printStripeId") REFERENCES "PrintStripe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sticker" ADD CONSTRAINT "Sticker_print_placement_check" CHECK (
  ("printStripeId" IS NULL AND "printSlot" IS NULL) OR
  ("printStripeId" IS NOT NULL AND "printSlot" IS NOT NULL AND "printSlot" BETWEEN 0 AND 7)
);
