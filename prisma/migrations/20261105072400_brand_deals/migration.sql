-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "brandUserId" TEXT,
    "brandName" TEXT NOT NULL,
    "brandEmail" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'direct',
    "campaignApplicationId" TEXT,
    "conversationId" TEXT,
    "inquiryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "brandToken" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealVersion" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "deliverables" JSONB NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "advancePct" INTEGER NOT NULL DEFAULT 0,
    "paymentPlan" TEXT NOT NULL DEFAULT 'upfront',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealPayment" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "provider" TEXT,
    "providerOrderId" TEXT,
    "providerRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealEvent" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_brandToken_key" ON "Deal"("brandToken");

-- CreateIndex
CREATE INDEX "Deal_creatorId_updatedAt_idx" ON "Deal"("creatorId", "updatedAt");

-- CreateIndex
CREATE INDEX "Deal_brandUserId_updatedAt_idx" ON "Deal"("brandUserId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DealVersion_dealId_number_key" ON "DealVersion"("dealId", "number");

-- CreateIndex
CREATE INDEX "DealPayment_dealId_idx" ON "DealPayment"("dealId");

-- CreateIndex
CREATE INDEX "DealEvent_dealId_createdAt_idx" ON "DealEvent"("dealId", "createdAt");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_brandUserId_fkey" FOREIGN KEY ("brandUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealVersion" ADD CONSTRAINT "DealVersion_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealPayment" ADD CONSTRAINT "DealPayment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEvent" ADD CONSTRAINT "DealEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
