const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });
    }
    return transporter;
}

async function sendPasswordResetEmail(to, resetUrl) {
    await getTransporter().sendMail({
        from: `"Noiz" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Recuperar contraseña - Noiz',
        html: `
            <p>Pediste restablecer tu contraseña en Noiz.</p>
            <p><a href="${resetUrl}">Hacé click acá para crear una nueva contraseña</a></p>
            <p>Este link vence en 1 hora. Si no fuiste vos, ignorá este email.</p>
        `,
    });
}

module.exports = { sendPasswordResetEmail };
