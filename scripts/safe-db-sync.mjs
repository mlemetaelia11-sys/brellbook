import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "imageKey" TEXT');
  console.log('BrellBook safe schema sync complete.');
} finally {
  await prisma.$disconnect();
}
