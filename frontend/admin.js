// ... (código do topo permanece o mesmo)
async function fetchUsers() {
    try {
        const users = await fetchAutenticado(`${API_BASE_URL}/api/users`);
        usersTbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.username}</td>
                <td>${u.role}</td>
                <td>
                    <button class="btn-delete" data-id="${u.id}">Excluir</button>
                </td>
            </tr>
        `).join('');
    } catch (error) { /* ... */ }
}

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.querySelector('#name').value;
    const username = document.querySelector('#username').value;
    const password = document.querySelector('#password').value;
    try {
        await fetchAutenticado(`${API_BASE_URL}/api/users`, {
            method: 'POST',
            body: JSON.stringify({ name, username, password, role: 'operator' })
        });
        registerForm.reset();
        fetchUsers();
    } catch (error) { /* ... */ }
});

// --- NOVA LÓGICA DE EXCLUSÃO ---
usersTbody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-delete')) {
        const id = e.target.dataset.id;
        if (confirm(`Tem certeza que deseja excluir o usuário com ID ${id}?`)) {
            try {
                await fetchAutenticado(`${API_BASE_URL}/api/users/${id}`, {
                    method: 'DELETE'
                });
                fetchUsers(); // Atualiza a lista
            } catch (error) {
                alert(`Erro ao excluir usuário: ${error.message}`);
            }
        }
    }
});

fetchUsers();