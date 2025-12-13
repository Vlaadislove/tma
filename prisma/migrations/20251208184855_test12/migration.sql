/*
  Warnings:

  - A unique constraint covering the columns `[terminalId,index]` on the table `Cell` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[terminalId,gpioPin]` on the table `Cell` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "gpioPin" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Cell_terminalId_index_key" ON "Cell"("terminalId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Cell_terminalId_gpioPin_key" ON "Cell"("terminalId", "gpioPin");
