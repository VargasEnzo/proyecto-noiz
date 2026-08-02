const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const formTitle = document.getElementById('form-title');
const toggleToRegister = document.getElementById('toggle-to-register');
const toggleToLogin = document.getElementById('toggle-to-login');

function showLogin() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    toggleToRegister.classList.remove('hidden');
    toggleToLogin.classList.add('hidden');
    formTitle.textContent = 'Iniciar sesión';
}

function showRegister() {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    toggleToLogin.classList.remove('hidden');
    toggleToRegister.classList.add('hidden');
    formTitle.textContent = 'Crear cuenta';
}

toggleToRegister.querySelector('a').addEventListener('click', (e) => {
    e.preventDefault();
    showRegister();
});

toggleToLogin.querySelector('a').addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
});

async function submitJSON(url, data) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok) {
        throw new Error(body.error || 'Ocurrió un error.');
    }
    return body;
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    try {
        await submitJSON('/api/login', {
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value,
        });
        window.location.href = 'dashboard.html';
    } catch (err) {
        loginError.textContent = err.message;
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    try {
        await submitJSON('/api/register', {
            nombre: document.getElementById('register-nombre').value,
            apellido: document.getElementById('register-apellido').value,
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value,
            repetirPassword: document.getElementById('register-repetir').value,
        });
        window.location.href = 'dashboard.html';
    } catch (err) {
        registerError.textContent = err.message;
    }
});
