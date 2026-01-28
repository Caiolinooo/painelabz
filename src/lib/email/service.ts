import nodemailer from 'nodemailer';

const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_SECURE !== 'false',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
};

export const transporter = nodemailer.createTransport(emailConfig);

export const sendEmail = async ({
    to,
    subject,
    html,
    attachments = []
}: {
    to: string | string[];
    subject: string;
    html: string;
    attachments?: any[];
}) => {
    try {
        const info = await transporter.sendMail({
            from: `"Portal ABZ" <${emailConfig.auth.user}>`,
            to,
            subject,
            html,
            attachments
        });
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
};
