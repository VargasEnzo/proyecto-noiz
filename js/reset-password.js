const resetForm = document.getElementById('reset-form');
const resetError = document.getElementById('reset-error');

const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
    resetError.textContent = 'El link no es válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".';
    resetForm.querySelector('button').disabled = true;
}

resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetError.textContent = '';

    const password = document.getElementById('reset-password').value;
    const repetirPassword = document.getElementById('reset-repetir').value;

    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password, repetirPassword }),
        });
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Ocurrió un error.');
        }

        window.location.href = 'login.html';
    } catch (err) {
        resetError.textContent = err.message;
    }
});