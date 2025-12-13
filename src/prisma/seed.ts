// prisma/seed.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Очистим старые данные для выбранного терминала/sku
  await prisma.rent.deleteMany({
    where: { cell: { terminal: { code: 'TMA-001' } } },
  });
  await prisma.cell.deleteMany({ where: { terminal: { code: 'TMA-001' } } });
  await prisma.terminal.deleteMany({ where: { code: 'TMA-001' } });
  await prisma.item.deleteMany({ where: { sku: 'BOX-001' } });

  const terminal = await prisma.terminal.create({
    data: {
      code: 'TMA-001',
      name: 'Терминал 1',
      location: 'Офис',
    },
  });

  await prisma.cell.createMany({
    data: [
      { terminalId: terminal.id, index: 1, gpioPin: 18, label: 'Ячейка 1', status: 'OCCUPIED' },
      { terminalId: terminal.id, index: 2, gpioPin: 23, label: 'Ячейка 2', status: 'FREE' },
    ],
  });

  const cells = await prisma.cell.findMany({
    where: { terminalId: terminal.id },
    orderBy: { index: 'asc' },
  });

  const item = await prisma.item.create({
    data: { name: 'Коробка', sku: 'BOX-001' },
  });

  const rent = await prisma.rent.create({
    data: {
      cellId: cells[0].id,
      itemId: item.id,
      status: 'ACTIVE',
    },
  });

  await prisma.cell.update({
    where: { id: cells[0].id },
    data: { currentRentId: rent.id, status: 'OCCUPIED' },
  });


}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

