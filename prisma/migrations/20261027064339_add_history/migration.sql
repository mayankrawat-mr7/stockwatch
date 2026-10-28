-- CreateTable
CREATE TABLE "HistoryEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "totalInventory" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "HistoryEvent_shop_productId_createdAt_idx" ON "HistoryEvent"("shop", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "HistoryEvent_shop_createdAt_idx" ON "HistoryEvent"("shop", "createdAt");
