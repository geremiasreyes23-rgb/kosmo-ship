-- Kosmo Ship — vertical de paquetería y courier.
-- Casilleros (ShippingProfile 1:1 con Client), paquetes, historial de
-- estados, fotos, manifiestos y catálogos de destinos y tarifas.
-- Ver docs/kosmo-ship/modelo-de-datos.md.

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('PREALERTED', 'RECEIVED', 'ON_HOLD', 'CONSOLIDATED', 'DISPATCHED', 'IN_TRANSIT', 'IN_CUSTOMS', 'READY', 'DELIVERED');
CREATE TYPE "ShippingMode" AS ENUM ('AIR', 'OCEAN');
CREATE TYPE "ManifestStatus" AS ENUM ('OPEN', 'CLOSED', 'DISPATCHED', 'ARRIVED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "packageId" TEXT;

-- CreateTable
CREATE TABLE "ShippingDestination" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ShippingDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerLb" DECIMAL(8,2) NOT NULL,
    "minimumCharge" DECIMAL(8,2) NOT NULL,
    "volumetricDivisor" INTEGER NOT NULL DEFAULT 166,
    "insurancePercent" DECIMAL(5,2),
    "homeDeliveryFee" DECIMAL(8,2),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingProfile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lockerCode" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "rateId" TEXT,
    "deliveryAddress" TEXT,
    "notifyChannel" TEXT NOT NULL DEFAULT 'push',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShippingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manifest" (
    "id" TEXT NOT NULL,
    "manifestNumber" SERIAL NOT NULL,
    "mode" "ShippingMode" NOT NULL,
    "destinationId" TEXT NOT NULL,
    "masterTracking" TEXT,
    "departureDate" TIMESTAMP(3),
    "status" "ManifestStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "Manifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "packageNumber" SERIAL NOT NULL,
    "shippingProfileId" TEXT NOT NULL,
    "originTracking" TEXT,
    "originCarrier" TEXT,
    "description" TEXT,
    "declaredValue" DECIMAL(10,2),
    "weightLb" DECIMAL(8,2),
    "lengthIn" DECIMAL(6,2),
    "widthIn" DECIMAL(6,2),
    "heightIn" DECIMAL(6,2),
    "billableWeightLb" DECIMAL(8,2),
    "amount" DECIMAL(10,2),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "status" "PackageStatus" NOT NULL DEFAULT 'PREALERTED',
    "holdReason" TEXT,
    "manifestId" TEXT,
    "receivedById" TEXT,
    "receivedAt" TIMESTAMP(3),
    "deliveredById" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagePhoto" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "takenById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackagePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageEvent" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "fromStatus" "PackageStatus",
    "toStatus" "PackageStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShippingDestination_code_key" ON "ShippingDestination"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingProfile_clientId_key" ON "ShippingProfile"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingProfile_lockerCode_key" ON "ShippingProfile"("lockerCode");

-- CreateIndex
CREATE UNIQUE INDEX "Manifest_manifestNumber_key" ON "Manifest"("manifestNumber");

-- CreateIndex
CREATE INDEX "Manifest_status_destinationId_idx" ON "Manifest"("status", "destinationId");

-- CreateIndex
CREATE UNIQUE INDEX "Package_packageNumber_key" ON "Package"("packageNumber");

-- CreateIndex
CREATE INDEX "Package_shippingProfileId_status_idx" ON "Package"("shippingProfileId", "status");

-- CreateIndex
CREATE INDEX "Package_status_updatedAt_idx" ON "Package"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Package_originTracking_idx" ON "Package"("originTracking");

-- CreateIndex
CREATE INDEX "PackageEvent_packageId_changedAt_idx" ON "PackageEvent"("packageId", "changedAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingProfile" ADD CONSTRAINT "ShippingProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingProfile" ADD CONSTRAINT "ShippingProfile_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ShippingDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingProfile" ADD CONSTRAINT "ShippingProfile_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "ShippingRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_shippingProfileId_fkey" FOREIGN KEY ("shippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagePhoto" ADD CONSTRAINT "PackagePhoto_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageEvent" ADD CONSTRAINT "PackageEvent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "ShippingDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Permisos de Kosmo Ship (mismo reparto que prisma/seed.ts, para bases de
-- datos que ya tienen roles sembrados; en una base nueva lo hace el seed).
-- packages / manifests: Admin todo; Manager y Agent view/create/edit;
-- Viewer solo view. shipping:admin (destinos y tarifas): solo Admin.
-- (Super Admin no depende de esta tabla: tiene acceso total.)
INSERT INTO "Permission" ("id", "resource", "action")
SELECT gen_random_uuid()::text, r.resource, a.action
FROM (VALUES ('packages'), ('manifests')) AS r(resource)
CROSS JOIN (VALUES ('view'), ('create'), ('edit'), ('delete')) AS a(action)
ON CONFLICT ("resource", "action") DO NOTHING;

INSERT INTO "Permission" ("id", "resource", "action")
VALUES (gen_random_uuid()::text, 'shipping', 'admin')
ON CONFLICT ("resource", "action") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r
JOIN "Permission" p ON p."resource" IN ('packages', 'manifests', 'shipping')
WHERE r."name" IN ('Super Admin', 'Admin')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r
JOIN "Permission" p ON p."resource" IN ('packages', 'manifests') AND p."action" IN ('view', 'create', 'edit')
WHERE r."name" IN ('Manager', 'Agent')
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r
JOIN "Permission" p ON p."resource" IN ('packages', 'manifests') AND p."action" = 'view'
WHERE r."name" = 'Viewer'
ON CONFLICT DO NOTHING;
