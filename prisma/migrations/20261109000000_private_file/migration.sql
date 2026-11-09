-- CreateTable
CREATE TABLE `private_file` (
    `key` VARCHAR(255) NOT NULL,
    `bytes` LONGBLOB NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
