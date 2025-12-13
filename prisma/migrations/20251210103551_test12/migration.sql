-- CreateEnum
CREATE TYPE "CommandAction" AS ENUM ('ACTIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "Command" ADD COLUMN     "action" "CommandAction" NOT NULL DEFAULT 'ACTIVE';
