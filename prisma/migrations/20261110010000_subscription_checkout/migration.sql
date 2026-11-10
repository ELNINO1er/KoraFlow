ALTER TABLE `organization` ADD COLUMN `subscriptionEndsAt` DATETIME(3) NULL;

CREATE TABLE `subscription_payment` (
    `reference` VARCHAR(80) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `pendingOrgId` VARCHAR(191) NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NULL,
    `checkoutUrl` TEXT NULL,
    `transactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,
    PRIMARY KEY (`reference`),
    UNIQUE INDEX `subscription_payment_pendingOrgId_key` (`pendingOrgId`),
    UNIQUE INDEX `subscription_payment_providerId_key` (`providerId`),
    UNIQUE INDEX `subscription_payment_transactionId_key` (`transactionId`),
    INDEX `subscription_payment_organizationId_idx` (`organizationId`),
    CONSTRAINT `subscription_payment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
