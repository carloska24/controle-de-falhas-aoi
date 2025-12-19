const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Tenta carregar bcrypt e imprime erro detalhado se falhar
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  console.error('Falha ao carregar bcrypt:', e);
  process.exit(1);
}

const dbPath = path.resolve(__dirname, 'aoi.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, err => {
  if (err) {
    console.error('Erro ao abrir banco:', err.message);
    process.exit(1);
  }
});

async function run() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('123456', salt);
    console.log('Novo hash gerado com sucesso.');

    db.run(
      "UPDATE users SET password_hash = ? WHERE username = 'DevAdmin'",
      [hash],
      function (err) {
        if (err) {
          console.error('Erro no UPDATE:', err.message);
        } else {
          console.log(`Senha atualizada com sucesso. Linhas afetadas: ${this.changes}`);
        }
        db.close();
      }
    );
  } catch (e) {
    console.error('Erro na geração do hash:', e);
    db.close();
  }
}

run();
