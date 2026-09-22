-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('PROSPECT', 'CLIENT');

-- CreateEnum
CREATE TYPE "ContactStage" AS ENUM ('NEW_REQUEST', 'TO_CONTACT', 'APPOINTMENT_SCHEDULED', 'QUOTE_IN_PREPARATION', 'QUOTE_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "ContactActivityType" AS ENUM ('CREATED', 'NOTE', 'STAGE_CHANGED', 'CALL', 'EMAIL', 'TASK');

-- CreateTable
CREATE TABLE "contact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL DEFAULT 'PROSPECT',
    "stage" "ContactStage" NOT NULL DEFAULT 'NEW_REQUEST',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "ContactActivityType" NOT NULL,
    "content" TEXT,
    "metadata" JSONB,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_organizationId_stage_idx" ON "contact"("organizationId", "stage");

-- CreateIndex
CREATE INDEX "contact_organizationId_type_idx" ON "contact"("organizationId", "type");

-- CreateIndex
CREATE INDEX "contact_organizationId_createdAt_idx" ON "contact"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_organizationId_ownerId_idx" ON "contact"("organizationId", "ownerId");

-- CreateIndex
CREATE INDEX "contact_activity_organizationId_contactId_createdAt_idx" ON "contact_activity"("organizationId", "contactId", "createdAt");

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_activity" ADD CONSTRAINT "contact_activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_activity" ADD CONSTRAINT "contact_activity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_activity" ADD CONSTRAINT "contact_activity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
