-- AlterTable
ALTER TABLE "public"."Booking"
ADD COLUMN "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "finalPriceSnapshot" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "public"."MarketingEvent"
ADD COLUMN "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "MarketingEvent_businessId_sessionId_createdAt_idx"
ON "public"."MarketingEvent"("businessId", "sessionId", "createdAt");