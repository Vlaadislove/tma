/*
  Warnings:

  - Added the required column `tgId` to the `PhoneVerification` table without a default value. This is not possible if the table is not empty.
  - Made the column `tgId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PhoneVerification" ADD COLUMN     "tgId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "tgId" SET NOT NULL;
