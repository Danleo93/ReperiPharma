-- CreateTable
CREATE TABLE "PharmacistSite" (
    "id" TEXT NOT NULL,
    "pharmacistId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacistSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PharmacistSite_siteId_idx" ON "PharmacistSite"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacistSite_pharmacistId_siteId_key" ON "PharmacistSite"("pharmacistId", "siteId");

-- AddForeignKey
ALTER TABLE "PharmacistSite" ADD CONSTRAINT "PharmacistSite_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "Pharmacist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacistSite" ADD CONSTRAINT "PharmacistSite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
