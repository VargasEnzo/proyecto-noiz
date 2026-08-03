import { state } from './state.js';
import { fetchCurrentUser, updateProfileRequest } from './api.js';

const greeting = document.getElementById('greeting'),
    openProfileBtn = document.getElementById('open-profile-btn'),
    sidebarAvatarIcon = document.getElementById('sidebar-avatar-icon'),
    sidebarAvatarImg = document.getElementById('sidebar-avatar-img'),
    navAdmin = document.getElementById('nav-admin');

export async function loadCurrentUser() {
    const user = await fetchCurrentUser();
    if (!user) return;
    state.currentUser = user;
    renderSidebarProfile();
}

export function renderSidebarProfile() {
    greeting.textContent = state.currentUser.nombre;
    if (state.currentUser.avatar) {
        sidebarAvatarImg.src = state.currentUser.avatar;
        sidebarAvatarImg.classList.remove('hidden');
        sidebarAvatarIcon.classList.add('hidden');
    } else {
        sidebarAvatarImg.classList.add('hidden');
        sidebarAvatarIcon.classList.remove('hidden');
    }
    navAdmin.classList.toggle('hidden', !state.currentUser.isAdmin);
}

// --- Modal "Mi perfil" ---

const profileModal = document.createElement('div');
profileModal.id = 'profile-modal-overlay';
profileModal.style.display = 'none';
profileModal.innerHTML = `
    <div class="modal-card profile-modal-card">
        <h3>Mi perfil</h3>

        <div class="profile-avatar-picker">
            <img src="" id="profile-avatar-preview" alt="">
            <i class="bi bi-person-circle" id="profile-avatar-preview-icon"></i>
            <button type="button" id="profile-avatar-change-btn">Cambiar foto</button>
            <input type="file" accept="image/*" id="profile-avatar-input" class="hidden">
        </div>

        <label class="profile-field-label">Nombre</label>
        <input type="text" id="profile-nombre-input">

        <label class="profile-field-label">Apellido</label>
        <input type="text" id="profile-apellido-input">

        <label class="profile-field-label">Email</label>
        <input type="text" id="profile-email-display" disabled>

        <div class="profile-meta-row">
            <span class="profile-plan-badge" id="profile-plan-badge"></span>
            <span class="profile-created-at" id="profile-created-at"></span>
        </div>

        <p class="form-error" id="profile-error"></p>

        <div class="modal-actions">
            <button type="button" class="modal-cancel-btn" id="profile-cancel-btn">Cancelar</button>
            <button type="button" class="modal-create-btn" id="profile-save-btn">Guardar</button>
        </div>
    </div>
`;
document.body.appendChild(profileModal);

const profileAvatarPreview = document.getElementById('profile-avatar-preview');
const profileAvatarPreviewIcon = document.getElementById('profile-avatar-preview-icon');
const profileAvatarInput = document.getElementById('profile-avatar-input');
const profileNombreInput = document.getElementById('profile-nombre-input');
const profileApellidoInput = document.getElementById('profile-apellido-input');
const profileEmailDisplay = document.getElementById('profile-email-display');
const profilePlanBadge = document.getElementById('profile-plan-badge');
const profileCreatedAt = document.getElementById('profile-created-at');
const profileError = document.getElementById('profile-error');

let pendingAvatar = null;

function showProfileAvatar(src) {
    if (src) {
        profileAvatarPreview.src = src;
        profileAvatarPreview.classList.remove('hidden');
        profileAvatarPreviewIcon.classList.add('hidden');
    } else {
        profileAvatarPreview.classList.add('hidden');
        profileAvatarPreviewIcon.classList.remove('hidden');
    }
}

function openProfileModal() {
    pendingAvatar = null;
    profileError.textContent = '';
    profileNombreInput.value = state.currentUser.nombre;
    profileApellidoInput.value = state.currentUser.apellido;
    profileEmailDisplay.value = state.currentUser.email;
    profilePlanBadge.textContent = state.currentUser.plan;
    profileCreatedAt.textContent = `Miembro desde el ${new Date(state.currentUser.created_at).toLocaleDateString(
        'es-AR',
        {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }
    )}`;
    showProfileAvatar(state.currentUser.avatar);
    profileModal.style.display = 'flex';
}

function closeProfileModal() {
    profileModal.style.display = 'none';
}

openProfileBtn.addEventListener('click', openProfileModal);
document.getElementById('profile-cancel-btn').addEventListener('click', closeProfileModal);
document.getElementById('profile-avatar-change-btn').addEventListener('click', () => profileAvatarInput.click());

profileAvatarInput.addEventListener('change', () => {
    const file = profileAvatarInput.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        const lado = Math.min(img.width, img.height);
        const sx = (img.width - lado) / 2;
        const sy = (img.height - lado) / 2;
        ctx.drawImage(img, sx, sy, lado, lado, 0, 0, 200, 200);

        pendingAvatar = canvas.toDataURL('image/jpeg', 0.8);
        showProfileAvatar(pendingAvatar);
    };
    img.src = URL.createObjectURL(file);
});

document.getElementById('profile-save-btn').addEventListener('click', async () => {
    const nombre = profileNombreInput.value.trim();
    const apellido = profileApellidoInput.value.trim();
    if (!nombre || !apellido) {
        profileError.textContent = 'Nombre y apellido son obligatorios.';
        return;
    }

    const datos = { nombre, apellido };
    if (pendingAvatar) datos.avatar = pendingAvatar;

    state.currentUser = await updateProfileRequest(datos);
    renderSidebarProfile();
    closeProfileModal();
});