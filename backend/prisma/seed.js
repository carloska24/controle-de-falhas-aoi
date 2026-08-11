/**
 * Seed script - cria o usuário admin inicial no banco PostgreSQL
 * Executado automaticamente durante o build no Render
 */
require('dotenv').config();
const bcrypt = require('bcrypt');

// Usa o prisma direto sem o adapter (mais simples para scripts)
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('[Seed] Iniciando seed do banco de dados...');

  const users = [
    { username: 'DevNaPratica', name: 'Dev Na Pratica', password: '123456', role: 'admin' },
    { username: 'admin', name: 'Administrador', password: 'admin123', role: 'admin' },
    { username: 'DevAdmin', name: 'Dev Admin', password: '123456', role: 'admin' },
  ];

  for (const userData of users) {
    const existing = await prisma.users.findUnique({
      where: { username: userData.username },
    });

    if (existing) {
      console.log(`[Seed] Usuário "${userData.username}" já existe, pulando.`);
      continue;
    }

    const password_hash = await bcrypt.hash(userData.password, 10);
    await prisma.users.create({
      data: {
        name: userData.name,
        username: userData.username,
        password_hash,
        role: userData.role,
      },
    });
    console.log(`[Seed] Usuário "${userData.username}" criado com sucesso!`);
  }

  console.log('[Seed] Seed concluído!');
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error('[Seed] Erro ao executar seed:', err);
  process.exit(1);
});
