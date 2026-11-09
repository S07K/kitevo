-- CreateIndex
CREATE INDEX "CampaignView_campaignId_viewedAt_idx" ON "CampaignView"("campaignId", "viewedAt");

-- CreateIndex
CREATE INDEX "Inquiry_kitId_createdAt_idx" ON "Inquiry"("kitId", "createdAt");

-- CreateIndex
CREATE INDEX "KitView_kitId_viewedAt_idx" ON "KitView"("kitId", "viewedAt");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "User_accountType_createdAt_idx" ON "User"("accountType", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_reporterId_idx" ON "UserReport"("reporterId");

