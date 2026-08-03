const statUsuarios = document.getElementById('stat-usuarios');
const statPlaylists = document.getElementById('stat-playlists');
const usersBody = document.getElementById('admin-users-body');

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchStats() {
    const response = await fetch('/api/admin/stats');
    if (!response.ok) return { totalUsuarios: 0, totalPlaylists: 0 };
    return response.json();
}

async function fetchUsers() {
    const response = await fetch('/api/admin/users');
    if (!response.ok) return [];
    return response.json();
}

async function fetchUserPlaylists(id) {
    const response = await fetch(`/api/admin/users/${id}/playlists`);
    if (!response.ok) return [];
    return response.json();
}

async function updateUserPlan(id, plan) {
    await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
    });
}

async function deleteUserRequest(id) {
    return fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
}

function formatFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Modal "Playlists del usuario" ---

const playlistsModal = document.createElement('div');
playlistsModal.id = 'admin-playlists-modal-overlay';
playlistsModal.style.display = 'none';
playlistsModal.innerHTML = `
    <div class="modal-card">
        <h3>Playlists</h3>
        <div id="admin-playlists-list"></div>
        <div class="modal-actions">
            <button type="button" class="modal-cancel-btn" id="admin-playlists-close-btn">Cerrar</button>
        </div>
    </div>
`;
document.body.appendChild(playlistsModal);

document.getElementById('admin-playlists-close-btn').addEventListener('click', () => {
    playlistsModal.style.display = 'none';
});

async function openPlaylistsModal(userId) {
    const playlists = await fetchUserPlaylists(userId);
    const lista = document.getElementById('admin-playlists-list');
    lista.innerHTML = playlists.length
        ? playlists
              .map(
                  (p) =>
                      `<p>${escapeHtml(p.nombre)} — ${p.cantidadCanciones} canción${p.cantidadCanciones === 1 ? '' : 'es'}</p>`
              )
              .join('')
        : '<p>Este usuario no tiene playlists.</p>';
    playlistsModal.style.display = 'flex';
}

// --- Tabla de usuarios ---

function renderUsers(users) {
    usersBody.innerHTML = users
        .map(
            (u) => `
        <tr data-user-id="${u.id}">
            <td>${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td>
                <select class="admin-plan-select" data-user-id="${u.id}">
                    <option value="Gratis" ${u.plan === 'Gratis' ? 'selected' : ''}>Gratis</option>
                    <option value="Premium" ${u.plan === 'Premium' ? 'selected' : ''}>Premium</option>
                </select>
            </td>
            <td>${formatFecha(u.created_at)}</td>
            <td>${u.cantidadPlaylists}</td>
            <td class="admin-actions-cell">
                <i class="bi bi-eye admin-view-btn" data-user-id="${u.id}" title="Ver playlists"></i>
                <i class="bi bi-trash admin-delete-btn" data-user-id="${u.id}" title="Eliminar cuenta"></i>
            </td>
        </tr>
    `
        )
        .join('');

    usersBody.querySelectorAll('.admin-plan-select').forEach((select) => {
        select.addEventListener('change', () => updateUserPlan(select.dataset.userId, select.value));
    });

    usersBody.querySelectorAll('.admin-view-btn').forEach((btn) => {
        btn.addEventListener('click', () => openPlaylistsModal(btn.dataset.userId));
    });

    usersBody.querySelectorAll('.admin-delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const fila = btn.closest('tr');
            const nombre = fila.children[0].textContent;
            if (!confirm(`¿Eliminar la cuenta de ${nombre}? Esta acción no se puede deshacer.`)) return;

            const response = await deleteUserRequest(btn.dataset.userId);
            if (!response.ok) {
                const { error } = await response.json();
                alert(error || 'No se pudo eliminar la cuenta.');
                return;
            }

            init();
        });
    });
}

async function init() {
    const [stats, users] = await Promise.all([fetchStats(), fetchUsers()]);
    statUsuarios.textContent = stats.totalUsuarios;
    statPlaylists.textContent = stats.totalPlaylists;
    renderUsers(users);
}

init();
