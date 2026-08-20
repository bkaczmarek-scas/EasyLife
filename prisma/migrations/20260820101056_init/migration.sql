-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bonus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Bonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Protocol" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "orderNumber" TEXT,
    "totalHours" DOUBLE PRECISION,
    "amount" INTEGER,
    "generatedAt" TEXT,
    "exported" BOOLEAN NOT NULL DEFAULT false,
    "exportedAt" TEXT,
    "zamowienieFilename" TEXT,
    "zamowienieBytes" BYTEA,
    "odbiorczyFilename" TEXT,
    "odbiorczyBytes" BYTEA,

    CONSTRAINT "Protocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualFile" (
    "id" TEXT NOT NULL,
    "protocolId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "uploadedAt" TEXT NOT NULL,

    CONSTRAINT "ManualFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'primary',
    "address" TEXT NOT NULL,
    "maintenanceNote" TEXT NOT NULL DEFAULT '',
    "maintenanceDate" TEXT,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenancy" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenants" JSONB NOT NULL,
    "leaseStart" TEXT,
    "leaseEnd" TEXT,
    "rentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilityAdvance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gateCode" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Tenancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyComment" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "PropertyComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyExpense" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'car',
    "year" INTEGER,
    "engine" TEXT,
    "fuelType" TEXT,
    "power" INTEGER,
    "plate" TEXT,
    "vin" TEXT,
    "mileage" INTEGER NOT NULL DEFAULT 0,
    "nextServiceDate" TEXT,
    "insuranceExpiryDate" TEXT,
    "mileageUpdatedAt" TEXT,
    "order" INTEGER,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLogEntry" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "workshop" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mileage" INTEGER,

    CONSTRAINT "ServiceLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "nextRenewalDate" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedDate" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPayment" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sienkiewicza" DOUBLE PRECISION,
    "szczesliwa" DOUBLE PRECISION,
    "sienkiewiczaNote" TEXT NOT NULL DEFAULT '',
    "szczesliwaNote" TEXT NOT NULL DEFAULT '',
    "transferDate" TEXT,

    CONSTRAINT "TaxPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "notes" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'P2',
    "propertyId" TEXT,
    "vehicleId" TEXT,
    "completions" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Chore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cost" (
    "month" TEXT NOT NULL,
    "zus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accounting" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Cost_pkey" PRIMARY KEY ("month")
);

-- CreateIndex
CREATE INDEX "ManualFile_protocolId_idx" ON "ManualFile"("protocolId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenancy_propertyId_key" ON "Tenancy"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyComment_propertyId_idx" ON "PropertyComment"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyExpense_propertyId_idx" ON "PropertyExpense"("propertyId");

-- CreateIndex
CREATE INDEX "ServiceLogEntry_vehicleId_idx" ON "ServiceLogEntry"("vehicleId");

-- AddForeignKey
ALTER TABLE "ManualFile" ADD CONSTRAINT "ManualFile_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "Protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyComment" ADD CONSTRAINT "PropertyComment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLogEntry" ADD CONSTRAINT "ServiceLogEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
