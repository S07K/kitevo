-- AlterTable (Instagram token expiry for refresh handling)
ALTER TABLE "User" ADD COLUMN "instagramTokenExpiresAt" TIMESTAMP(3);

-- CreateTable (Kit analytics: view events)
CREATE TABLE "KitView" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,

    CONSTRAINT "KitView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitView_kitId_idx" ON "KitView"("kitId");
CREATE INDEX "KitView_viewedAt_idx" ON "KitView"("viewedAt");

-- AddForeignKey
ALTER TABLE "KitView" ADD CONSTRAINT "KitView_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "Kit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
