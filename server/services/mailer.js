async function sendPasswordResetEmail(to, resetUrl) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'Noiz <onboarding@resend.dev>',
            to,
            subject: 'Recuperar contraseña - Noiz',
            html: `
                <p>Pediste restablecer tu contraseña en Noiz.</p>
                <p><a href="${resetUrl}">Hacé click acá para crear una nueva contraseña</a></p>
                <p>Este link vence en 1 hora. Si no fuiste vos, ignorá este email.</p>
            `,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`No se pudo enviar el email: ${body}`);
    }
}

module.exports = { sendPasswordResetEmail };