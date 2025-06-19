/*
  Warnings:

  - Added the required column `expired_at` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `orders` ADD COLUMN `expired_at` DATETIME(3) NOT NULL;
