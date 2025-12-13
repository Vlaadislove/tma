/*
  Warnings:

  - You are about to drop the column `cellId` on the `Item` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[itemId]` on the table `Cell` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_cellId_fkey";

-- DropIndex
DROP INDEX "Item_cellId_key";

-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "itemId" TEXT;

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "cellId";

-- CreateIndex
CREATE UNIQUE INDEX "Cell_itemId_key" ON "Cell"("itemId");

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
