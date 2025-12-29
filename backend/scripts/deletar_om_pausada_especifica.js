// Deleta OMs pausadas específicas da tabela oms_pausadas
// Uso: node deletar_om_pausada_especifica.js 35084 35370

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(
    '❌ Uso: node deletar_om_pausada_especifica.js <numero_om> [numero_om2] [numero_om3] ...'
  );
  console.log('   Exemplo: node deletar_om_pausada_especifica.js 35084');
  console.log('   Exemplo: node deletar_om_pausada_especifica.js 35084 35370');
  process.exit(1);
}

const dbPath = path.join(__dirname, '../aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, err => {
  if (err) {
    console.error('Erro ao abrir o banco:', err.message);
    process.exit(1);
  }
});

let totalRemovidas = 0;
let processadas = 0;

args.forEach(omNumber => {
  db.run('DELETE FROM oms_pausadas WHERE omNumber = ?', [omNumber], function (err) {
    processadas++;
    if (err) {
      console.error(`❌ Erro ao deletar OM ${omNumber}:`, err.message);
    } else if (this.changes > 0) {
      totalRemovidas += this.changes;
      console.log(`✅ OM ${omNumber} removida com sucesso.`);
    } else {
      console.log(`⚠️  OM ${omNumber} não encontrada na tabela de pausadas.`);
    }

    if (processadas === args.length) {
      console.log(`\n📊 Total de OMs removidas: ${totalRemovidas}`);
      if (totalRemovidas > 0) {
        console.log('⚠️  IMPORTANTE: Reinicie o backend para aplicar as mudanças!');
      }
      db.close();
    }
  });
});
