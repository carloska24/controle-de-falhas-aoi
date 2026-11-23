const { Prisma } = require('@prisma/client');

// Requests and source edits must see the same locked occurrence before changing its demand.
async function lockRecords(tx, ids) {
  await tx.$queryRaw(Prisma.sql`
    SELECT id FROM registros WHERE id IN (${Prisma.join([...ids].sort())}) ORDER BY id FOR UPDATE
  `);
}

module.exports = { lockRecords };
