-- CreateTable
CREATE TABLE "Command" (
    "id" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "rentId" TEXT,
    "userId" TEXT,
    "itemId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Command_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Command_commandId_key" ON "Command"("commandId");

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Command" ADD CONSTRAINT "Command_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "Cell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
