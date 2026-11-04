-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "bookingUrl" TEXT;

-- CreateTable
CREATE TABLE "SchedulerConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchedulerConnection_userId_provider_key" ON "SchedulerConnection"("userId", "provider");

-- AddForeignKey
ALTER TABLE "SchedulerConnection" ADD CONSTRAINT "SchedulerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
