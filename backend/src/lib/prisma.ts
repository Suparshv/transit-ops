import { PrismaClient } from '@prisma/client';

// Single shared Prisma client instance — import this everywhere.
// Never instantiate PrismaClient directly in controllers.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export default prisma;
