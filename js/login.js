const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const loginSuccess = document.getElementById('login-success');
const registerError = document.getElementById('register-error');
const registerSuccess = document.getElementById('register-success');
const formTitle = document.getElementById('form-title');
const toggleToRegister = document.getElementById('toggle-to-register');
const toggleToLogin = document.getElementById('toggle-to-login');
const resendWrap = document.getElementById('resend-verification-wrap');
const resendLink = document.getElementById('resend-verification-link');

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
        const error = new Error(body.error || 'Ocurrió un error.');
        error.unverified = !!body.unverified;
        throw error;
    }
    return body;
}

let ultimoEmailIntentado = '';

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    loginSuccess.classList.add('hidden');
    resendWrap.classList.add('hidden');

    const email = document.getElementById('login-email').value;
    ultimoEmailIntentado = email;

    try {
        await submitJSON('/api/login', {
            email,
            password: document.getElementById('login-password').value,
        });
        window.location.href = 'dashboard.html';
    } catch (err) {
        loginError.textContent = err.message;
        if (err.unverified) {
            resendWrap.classList.remove('hidden');
        }
    }
});

resendLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const body = await submitJSON('/api/resend-verification', { email: ultimoEmailIntentado });
        loginError.textContent = '';
        loginSuccess.textContent = body.message;
        loginSuccess.classList.remove('hidden');
        resendWrap.classList.add('hidden');
    } catch (err) {
        loginError.textContent = err.message;
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    registerSuccess.classList.add('hidden');
    try {
        const body = await submitJSON('/api/register', {
            nombre: document.getElementById('register-nombre').value,
            apellido: document.getElementById('register-apellido').value,
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value,
            repetirPassword: document.getElementById('register-repetir').value,
        });
        registerForm.reset();
        registerSuccess.textContent = body.message;
        registerSuccess.classList.remove('hidden');
    } catch (err) {
        registerError.textContent = err.message;
    }
});

// Si venimos del link del mail de verificación (GET /api/verify-email redirige acá)
const params = new URLSearchParams(window.location.search);
if (params.has('verified')) {
    if (params.get('verified') === '1') {
        loginSuccess.textContent = 'Tu cuenta fue confirmada. Ya podés iniciar sesión.';
        loginSuccess.classList.remove('hidden');
    } else {
        loginError.textContent = 'El link no es válido o venció. Pedí uno nuevo iniciando sesión.';
    }
    window.history.replaceState({}, '', window.location.pathname);
}
