-- CreateTable
CREATE TABLE "ServiceLogItem" (
    "id" TEXT NOT NULL,
    "serviceLogEntryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceLogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceLogItem_serviceLogEntryId_idx" ON "ServiceLogItem"("serviceLogEntryId");

-- AddForeignKey
ALTER TABLE "ServiceLogItem" ADD CONSTRAINT "ServiceLogItem_serviceLogEntryId_fkey" FOREIGN KEY ("serviceLogEntryId") REFERENCES "ServiceLogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
