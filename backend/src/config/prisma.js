const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const globalForPrisma = global;

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const max = Number(process.env.DATABASE_POOL_MAX || 10);
  if (!Number.isInteger(max) || max < 1 || max > 50) {
    throw new Error('DATABASE_POOL_MAX deve ser um inteiro entre 1 e 50.');
  }
  // O adapter administra o pool e o encerra em $disconnect.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max, connectionTimeoutMillis: 5000 });

  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}

module.exports = getPrismaClient();
