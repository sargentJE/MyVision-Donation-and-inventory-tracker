-- CreateEnum
CREATE TYPE "AcquisitionType" AS ENUM ('PURCHASED', 'DONATED_DEMO', 'DONATED_GIVEABLE');

-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('AVAILABLE_FOR_LOAN', 'RESERVED', 'ON_LOAN', 'ALLOCATED_OUT', 'AVAILABLE_FOR_DEMO', 'ON_DEMO_VISIT', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "DeviceCategory" AS ENUM ('DIGITAL_MAGNIFIER', 'CCTV_MAGNIFIER', 'TEXT_TO_SPEECH', 'SMARTPHONE', 'TABLET', 'MONITOR', 'OTHER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "AuditEvent" AS ENUM ('ITEM_CREATED', 'ITEM_EDITED', 'ACQUISITION_RECLASSIFIED', 'RESERVED', 'RESERVATION_CANCELLED', 'LOAN_ISSUED', 'LOAN_RETURNED', 'LOAN_CONVERTED_TO_ALLOCATION', 'ALLOCATED_DIRECTLY', 'DEMO_VISIT_STARTED', 'DEMO_VISIT_RETURNED', 'DECOMMISSIONED', 'ARCHIVED', 'ARCHIVE_RESTORED', 'SALE_FLAGGED', 'SALE_FLAG_REMOVED', 'USER_CREATED', 'USER_DEACTIVATED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOAN_OVERDUE', 'RESERVATION_EXPIRED', 'DEMO_VISIT_OVERDUE');

-- CreateEnum
CREATE TYPE "ReservationCloseReason" AS ENUM ('CONVERTED_TO_LOAN', 'CANCELLED', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "LoanCloseReason" AS ENUM ('RETURNED', 'CONVERTED_TO_ALLOCATION', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "DemoVisitCloseReason" AS ENUM ('RETURNED', 'DECOMMISSIONED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "donorName" TEXT NOT NULL,
    "donorOrg" TEXT,
    "donatedAt" DATE NOT NULL,
    "acknowledgementSent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "deviceCategory" "DeviceCategory" NOT NULL,
    "acquisitionType" "AcquisitionType" NOT NULL,
    "status" "OperationalStatus" NOT NULL,
    "condition" "Condition" NOT NULL DEFAULT 'GOOD',
    "conditionNotes" TEXT,
    "acquiredAt" DATE NOT NULL,
    "notes" TEXT,
    "isForSale" BOOLEAN NOT NULL DEFAULT false,
    "purchasePrice" DECIMAL(10,2),
    "supplier" TEXT,
    "warrantyExpiry" DATE,
    "decommissionedAt" TIMESTAMP(3),
    "decommissionedByUserId" TEXT,
    "decommissionReason" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedByUserId" TEXT,
    "archiveReason" TEXT,
    "donationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "charitylogId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isAnonymised" BOOLEAN NOT NULL DEFAULT false,
    "anonymisedAt" TIMESTAMP(3),
    "anonymisedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reservedByUserId" TEXT NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATE,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedReason" "ReservationCloseReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "originatingReservationId" TEXT,
    "loanedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturn" DATE,
    "returnedAt" TIMESTAMP(3),
    "conditionAtLoan" "Condition",
    "conditionAtLoanNotes" TEXT,
    "conditionAtReturn" "Condition",
    "conditionAtReturnNotes" TEXT,
    "closedReason" "LoanCloseReason",
    "closedByUserId" TEXT,
    "notes" TEXT,
    "receiptGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocations" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "allocatedByUserId" TEXT NOT NULL,
    "originatingLoanId" TEXT,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_visits" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "startedByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destination" TEXT,
    "expectedReturn" DATE,
    "returnedAt" TIMESTAMP(3),
    "returnedByUserId" TEXT,
    "conditionOnReturn" "Condition",
    "conditionOnReturnNotes" TEXT,
    "closedReason" "DemoVisitCloseReason",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT,
    "targetUserId" TEXT,
    "event" "AuditEvent" NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "relatedEquipmentId" TEXT,
    "relatedLoanId" TEXT,
    "relatedReservationId" TEXT,
    "relatedDemoVisitId" TEXT,
    "message" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_reads" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_revokedAt_idx" ON "refresh_tokens"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_serialNumber_key" ON "equipment"("serialNumber");

-- CreateIndex
CREATE INDEX "equipment_status_idx" ON "equipment"("status");

-- CreateIndex
CREATE INDEX "equipment_acquisitionType_idx" ON "equipment"("acquisitionType");

-- CreateIndex
CREATE INDEX "equipment_isArchived_idx" ON "equipment"("isArchived");

-- CreateIndex
CREATE INDEX "equipment_isForSale_idx" ON "equipment"("isForSale");

-- CreateIndex
CREATE INDEX "equipment_status_isArchived_idx" ON "equipment"("status", "isArchived");

-- CreateIndex
CREATE INDEX "equipment_acquisitionType_isForSale_idx" ON "equipment"("acquisitionType", "isForSale");

-- CreateIndex
CREATE UNIQUE INDEX "clients_charitylogId_key" ON "clients"("charitylogId");

-- CreateIndex
CREATE INDEX "clients_isAnonymised_idx" ON "clients"("isAnonymised");

-- CreateIndex
CREATE INDEX "reservations_equipmentId_idx" ON "reservations"("equipmentId");

-- CreateIndex
CREATE INDEX "reservations_clientId_idx" ON "reservations"("clientId");

-- CreateIndex
CREATE INDEX "reservations_equipmentId_closedAt_idx" ON "reservations"("equipmentId", "closedAt");

-- CreateIndex
CREATE INDEX "reservations_expiresAt_idx" ON "reservations"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "loans_originatingReservationId_key" ON "loans"("originatingReservationId");

-- CreateIndex
CREATE INDEX "loans_equipmentId_idx" ON "loans"("equipmentId");

-- CreateIndex
CREATE INDEX "loans_clientId_idx" ON "loans"("clientId");

-- CreateIndex
CREATE INDEX "loans_equipmentId_returnedAt_idx" ON "loans"("equipmentId", "returnedAt");

-- CreateIndex
CREATE INDEX "loans_expectedReturn_idx" ON "loans"("expectedReturn");

-- CreateIndex
CREATE UNIQUE INDEX "allocations_equipmentId_key" ON "allocations"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "allocations_originatingLoanId_key" ON "allocations"("originatingLoanId");

-- CreateIndex
CREATE INDEX "allocations_clientId_idx" ON "allocations"("clientId");

-- CreateIndex
CREATE INDEX "demo_visits_equipmentId_idx" ON "demo_visits"("equipmentId");

-- CreateIndex
CREATE INDEX "demo_visits_equipmentId_returnedAt_idx" ON "demo_visits"("equipmentId", "returnedAt");

-- CreateIndex
CREATE INDEX "demo_visits_expectedReturn_idx" ON "demo_visits"("expectedReturn");

-- CreateIndex
CREATE INDEX "audit_entries_equipmentId_changedAt_idx" ON "audit_entries"("equipmentId", "changedAt");

-- CreateIndex
CREATE INDEX "audit_entries_changedByUserId_idx" ON "audit_entries"("changedByUserId");

-- CreateIndex
CREATE INDEX "audit_entries_event_idx" ON "audit_entries"("event");

-- CreateIndex
CREATE INDEX "audit_entries_targetUserId_idx" ON "audit_entries"("targetUserId");

-- CreateIndex
CREATE INDEX "notifications_type_relatedLoanId_resolvedAt_idx" ON "notifications"("type", "relatedLoanId", "resolvedAt");

-- CreateIndex
CREATE INDEX "notifications_type_relatedReservationId_resolvedAt_idx" ON "notifications"("type", "relatedReservationId", "resolvedAt");

-- CreateIndex
CREATE INDEX "notifications_type_relatedDemoVisitId_resolvedAt_idx" ON "notifications"("type", "relatedDemoVisitId", "resolvedAt");

-- CreateIndex
CREATE INDEX "notifications_resolvedAt_idx" ON "notifications"("resolvedAt");

-- CreateIndex
CREATE INDEX "notification_reads_userId_idx" ON "notification_reads"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_reads_notificationId_userId_key" ON "notification_reads"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_decommissionedByUserId_fkey" FOREIGN KEY ("decommissionedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_anonymisedByUserId_fkey" FOREIGN KEY ("anonymisedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_reservedByUserId_fkey" FOREIGN KEY ("reservedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_originatingReservationId_fkey" FOREIGN KEY ("originatingReservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_allocatedByUserId_fkey" FOREIGN KEY ("allocatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_originatingLoanId_fkey" FOREIGN KEY ("originatingLoanId") REFERENCES "loans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_visits" ADD CONSTRAINT "demo_visits_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_visits" ADD CONSTRAINT "demo_visits_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_visits" ADD CONSTRAINT "demo_visits_returnedByUserId_fkey" FOREIGN KEY ("returnedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_relatedEquipmentId_fkey" FOREIGN KEY ("relatedEquipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_relatedLoanId_fkey" FOREIGN KEY ("relatedLoanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_relatedReservationId_fkey" FOREIGN KEY ("relatedReservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_relatedDemoVisitId_fkey" FOREIGN KEY ("relatedDemoVisitId") REFERENCES "demo_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
