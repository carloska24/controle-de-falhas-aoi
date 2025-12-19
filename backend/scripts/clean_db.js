const database = require('../src/config/database');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const isProduction = process.env.NODE_ENV === 'production';

async function clearByOM(omNumber) {
  if (!omNumber) {
    console.error('Erro: Número da OM é obrigatório.');
    return;
  }
  console.log(`\n--- Excluindo OM: ${omNumber} ---`);
  await database.initializeDatabase();

  try {
    const omsPausadas = await database.dbRun('DELETE FROM oms_pausadas WHERE omNumber = ?', [
      omNumber,
    ]);
    console.log(`- oms_pausadas removidos: ${omsPausadas.changes}`);

    const omsFinalizadas = await database.dbRun('DELETE FROM oms_finalizadas WHERE omNumber = ?', [
      omNumber,
    ]);
    console.log(`- oms_finalizadas removidos: ${omsFinalizadas.changes}`);

    const registros = await database.dbRun('DELETE FROM registros WHERE om = ?', [omNumber]);
    console.log(`- registros removidos: ${registros.changes}`);

    const requisicoes = await database.dbRun('DELETE FROM requisicoes WHERE om = ?', [omNumber]);
    console.log(`- requisicoes removidas: ${requisicoes.changes}`);

    console.log('\nExclusão de OM concluída com sucesso.');
  } catch (e) {
    console.error('Erro ao excluir OM:', e);
  }
}

async function clearAll() {
  console.log('\n--- ATENÇÃO: LIMPANDO BANCO DE DADOS COMPLETO ---');
  console.log('Isso apagará TODOS os registros, requisições e apontamentos.');
  console.log(
    'Usuários ADMIN e OPERADORES NÃO serão apagados por segurança padrão, mas todo o restante sim.'
  );

  await database.initializeDatabase();

  try {
    await database.dbRun('DELETE FROM oms_pausadas');
    console.log('- Tabela oms_pausadas limpa.');

    await database.dbRun('DELETE FROM oms_finalizadas');
    console.log('- Tabela oms_finalizadas limpa.');

    await database.dbRun('DELETE FROM registros');
    console.log('- Tabela registros limpa.');

    await database.dbRun('DELETE FROM requisicoes');
    console.log('- Tabela requisicoes limpa.');

    // Opcionally clear non-admin users if requested, but let's stick to data.
    console.log('\nLimpeza completa realizada com sucesso.');
  } catch (e) {
    console.error('Erro ao limpar banco de dados:', e);
  }
}

async function main() {
  // Process arguments: node scripts/clean_db.js [om <OM_NUMBER> | all]
  const args = process.argv.slice(2);
  const command = args[0];
  const item = args[1];

  if (command === 'om') {
    if (!item) {
      console.log('Uso: node scripts/clean_db.js om <NUMERO_DA_OM>');
      process.exit(1);
    }
    await clearByOM(item);
    process.exit(0);
  } else if (command === 'all') {
    rl.question('Tem certeza que deseja apagar TUDO? (s/N): ', async answer => {
      if (answer.toLowerCase() === 's') {
        await clearAll();
      } else {
        console.log('Operação cancelada.');
      }
      process.exit(0);
    });
  } else {
    console.log('Modo de uso:');
    console.log('  1. Apagar OM específica: node scripts/clean_db.js om <NUMERO_DA_OM>');
    console.log('  2. Apagar TUDO:          node scripts/clean_db.js all');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { clearByOM, clearAll };
