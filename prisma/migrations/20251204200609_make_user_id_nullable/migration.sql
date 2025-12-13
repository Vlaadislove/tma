-- DropForeignKey
ALTER TABLE "PhoneVerification" DROP CONSTRAINT "PhoneVerification_userId_fkey";

-- AlterTable
ALTER TABLE "PhoneVerification" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PhoneVerification" ADD CONSTRAINT "PhoneVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
