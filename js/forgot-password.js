const forgotForm = document.getElementById('forgot-form');
const forgotError = document.getElementById('forgot-error');
const forgotSuccess = document.getElementById('forgot-success');

forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    forgotError.textContent = '';
    forgotSuccess.classList.add('hidden');

    const email = document.getElementById('forgot-email').value;

    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Ocurrió un error.');
        }

        forgotForm.reset();
        forgotSuccess.textContent = body.message;
        forgotSuccess.classList.remove('hidden');
    } catch (err) {
        forgotError.textContent = err.message;
    }
});