/*
  Warnings:

  - Made the column `gpioPin` on table `Cell` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Cell_terminalId_gpioPin_key";

-- AlterTable
ALTER TABLE "Cell" ALTER COLUMN "gpioPin" SET NOT NULL;
