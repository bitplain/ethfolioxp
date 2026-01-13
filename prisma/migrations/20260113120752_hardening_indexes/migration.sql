-- CreateIndex
CREATE INDEX "Transfer_userId_blockTime_idx" ON "Transfer"("userId", "blockTime");

-- CreateIndex
CREATE INDEX "Transfer_userId_tokenId_idx" ON "Transfer"("userId", "tokenId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_bucketTs_idx" ON "PriceSnapshot"("bucketTs");
