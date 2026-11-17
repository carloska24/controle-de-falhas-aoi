// Bootstrap explícito: não redefine contas existentes nem roda durante o build.
const bcrypt = require('bcrypt');

function getAdminCredentials(env) {
  const username = (env.ADMIN_USERNAME || '').trim();
  const name = (env.ADMIN_NAME || '').trim();
  const password = env.ADMIN_PASSWORD || '';
  if (!username || !name || password.trim().length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Defina ADMIN_USERNAME, ADMIN_NAME e ADMIN_PASSWORD (mínimo 12 caracteres e máximo 72 bytes).');
  }
  return { username, name, password };
}

async function createAdmin(prisma, env) {
  const { username, name, password } = getAdminCredentials(env);
  const existing = await prisma.users.findUnique({ where: { username } });
  if (existing) {
    throw new Error('Usuário já existe. Nenhuma senha ou permissão foi alterada.');
  }
  const password_hash = await bcrypt.hash(password, 12);
  await prisma.users.create({ data: { username, name, password_hash, role: 'admin' } });
}

async function main() {
  require('dotenv').config();
  getAdminCredentials(process.env); // Valida antes de criar conexão com o banco.
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL é obrigatório.');
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await createAdmin(prisma, process.env);
    console.log('Administrador criado com sucesso.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(() => {
    console.error('Falha ao criar administrador. Verifique as variáveis ADMIN_*, a conexão e se o usuário já existe.');
    process.exitCode = 1;
  });
}

module.exports = { createAdmin };
