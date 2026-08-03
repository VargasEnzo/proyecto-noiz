const SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send';

async function sendPasswordResetEmail(to, resetUrl) {
    const response = await fetch(SENDGRID_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'Noiz' },
            subject: 'Recuperar contraseña - Noiz',
            content: [
                {
                    type: 'text/html',
                    value: `
                        <p>Pediste restablecer tu contraseña en Noiz.</p>
                        <p><a href="${resetUrl}">Hacé click acá para crear una nueva contraseña</a></p>
                        <p>Este link vence en 1 hora. Si no fuiste vos, ignorá este email.</p>
                    `,
                },
            ],
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`No se pudo enviar el email: ${body}`);
    }
}

module.exports = { sendPasswordResetEmail };
