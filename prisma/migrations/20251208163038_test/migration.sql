/*
  Warnings:

  - You are about to drop the `PhoneVerification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PhoneVerification" DROP CONSTRAINT "PhoneVerification_userId_fkey";

-- DropTable
DROP TABLE "PhoneVerification";

-- DropTable
DROP TABLE "User";
