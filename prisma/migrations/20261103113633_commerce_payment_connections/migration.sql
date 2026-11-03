-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "providerOrderId" TEXT;

-- CreateTable
CREATE TABLE "PaymentConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "secretEncrypted" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentConnection_userId_provider_key" ON "PaymentConnection"("userId", "provider");

-- AddForeignKey
ALTER TABLE "PaymentConnection" ADD CONSTRAINT "PaymentConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
