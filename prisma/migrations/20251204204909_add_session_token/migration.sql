/*
  Warnings:

  - A unique constraint covering the columns `[sessionToken]` on the table `PhoneVerification` will be added. If there are existing duplicate values, this will fail.
  - The required column `sessionToken` was added to the `PhoneVerification` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "PhoneVerification" ADD COLUMN     "sessionToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PhoneVerification_sessionToken_key" ON "PhoneVerification"("sessionToken");
