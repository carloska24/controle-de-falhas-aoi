// ... (código do topo, requires, etc., permanecem iguais)
const setupDatabase = async () => {
  // ... (criação da tabela registros)
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'operator'
    );`;
  // ... (resto da função)
};
// ... (authenticateToken e isAdmin permanecem iguais)

// --- ROTAS DE AUTENTICAÇÃO ATUALIZADAS ---
app.post('/api/auth/register', async (req, res) => { /* ... Lógica agora usa 'name' e 'username' ... */ });
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        // ... (resto da lógica de login)
    } catch (err) { /* ... */ }
});

// --- ROTAS DE USUÁRIOS ATUALIZADAS ---
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => { /* ... */ });
// app.post('/api/users', authenticateToken, isAdmin, async (req, res) => { // Linha original comentada
app.post('/api/users', async (req, res) => { // Nova linha sem os seguranças /* ... Lógica agora usa 'name' e 'username' ... */ });

// --- NOVA ROTA PARA EXCLUIR USUÁRIO ---
app.delete('/api/users/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id; // Pega o ID do admin logado
    if (parseInt(id, 10) === adminId) {
        return res.status(400).json({ error: "Você não pode excluir sua própria conta de administrador." });
    }
    try {
        await pool.query("DELETE FROM users WHERE id = $1", [id]);
        res.status(204).send(); // 204 No Content = Sucesso sem corpo de resposta
    } catch (err) {
        res.status(500).json({ error: "Erro ao excluir usuário." });
    }
});

// ... (Rotas de /api/registros e o resto do arquivo permanecem iguais)