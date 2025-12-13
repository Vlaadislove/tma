/*
  Warnings:

  - You are about to drop the column `callStatus` on the `PhoneVerification` table. All the data in the column will be lost.
  - Added the required column `confirmationNumber` to the `PhoneVerification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PhoneVerification" DROP COLUMN "callStatus",
ADD COLUMN     "confirmationNumber" TEXT NOT NULL;
