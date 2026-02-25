const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

async function listUsers(req, res) {
  try {
    const users = await prisma.users.findMany({
      select: { id: true, name: true, username: true, role: true },
      orderBy: { id: 'asc' },
    });
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

    const newUser = await prisma.users.create({
      data: { name, username, password_hash, role },
    });

    res
      .status(201)
      .json({ id: newUser.id, name: newUser.name, username: newUser.username, role: newUser.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Nome de usuário já cadastrado ou erro no servidor.' });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name, username, role, password } = req.body;

  try {
    const data = { name, username, role };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password_hash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id, 10) },
      data,
      select: { id: true, name: true, username: true, role: true },
    });

    res.json(updatedUser);
  } catch (err) {
    // Se o prisma não achar o registro, cai no catch // P2025 record to update not found
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
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
    await prisma.users.delete({ where: { id: parseInt(id, 10) } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
}

// Rota de debug (opcional, pode ser removida se quiser limpar 100%)
async function debugUsers(req, res) {
  try {
    const users = await prisma.users.findMany({
      select: { id: true, name: true, username: true, role: true },
      orderBy: { id: 'asc' },
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser, debugUsers };
