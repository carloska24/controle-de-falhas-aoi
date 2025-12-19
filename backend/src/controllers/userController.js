const bcrypt = require('bcrypt');
const database = require('../config/database');

async function listUsers(req, res) {
  try {
    const users = await database.dbAll('SELECT id, name, username, role FROM users ORDER BY id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createUser(req, res) {
  const { name, username, password, role = 'operator' } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    // Nota: dbRun configurado no database.js já devolve lastID corretamente para PG e SQLite
    const result = await database.dbRun(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id',
      [name, username, password_hash, role]
    );

    // Ajuste para pegar ID independentemente do driver
    const newId = result.lastID;

    // Se por acaso lastID vier nulo (driver antigo), tenta buscar pelo username
    let newUser;
    if (newId) {
      newUser = await database.dbGet('SELECT id, name, username, role FROM users WHERE id = ?', [
        newId,
      ]);
    } else {
      newUser = await database.dbGet(
        'SELECT id, name, username, role FROM users WHERE username = ?',
        [username]
      );
    }

    if (!newUser) throw new Error('Falha ao recuperar o usuário recém-criado.');
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Nome de usuário já cadastrado ou erro no servidor.' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name, username, role, password } = req.body;

  try {
    let result;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      result = await database.dbRun(
        'UPDATE users SET name = ?, username = ?, role = ?, password_hash = ? WHERE id = ?',
        [name, username, role, password_hash, id]
      );
    } else {
      result = await database.dbRun(
        'UPDATE users SET name = ?, username = ?, role = ? WHERE id = ?',
        [name, username, role, id]
      );
    }
    if (result.changes === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
    const updatedUser = await database.dbGet(
      'SELECT id, name, username, role FROM users WHERE id = ?',
      [id]
    );
    res.json(updatedUser);
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Erro ao atualizar usuário. O nome de usuário pode já estar em uso.' });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;
  const adminId = req.user.id;
  if (parseInt(id, 10) === adminId) {
    return res
      .status(400)
      .json({ error: 'Você não pode excluir sua própria conta de administrador.' });
  }
  try {
    await database.dbRun('DELETE FROM users WHERE id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
}

// Rota de debug (opcional, pode ser removida se quiser limpar 100%)
async function debugUsers(req, res) {
  try {
    const users = await database.dbAll('SELECT id, name, username, role FROM users ORDER BY id');
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser, debugUsers };
