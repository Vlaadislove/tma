/*
  Warnings:

  - The values [RESERVED] on the enum `CellStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[cellId]` on the table `Item` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CellStatus_new" AS ENUM ('FREE', 'OCCUPIED', 'DISABLED');
ALTER TABLE "public"."Cell" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Cell" ALTER COLUMN "status" TYPE "CellStatus_new" USING ("status"::text::"CellStatus_new");
ALTER TYPE "CellStatus" RENAME TO "CellStatus_old";
ALTER TYPE "CellStatus_new" RENAME TO "CellStatus";
DROP TYPE "public"."CellStatus_old";
ALTER TABLE "Cell" ALTER COLUMN "status" SET DEFAULT 'FREE';
COMMIT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "cellId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Item_cellId_key" ON "Item"("cellId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;
