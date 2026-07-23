import nodemailer from 'nodemailer';
import {
  clearResolvedEmailAuthCache,
  emailTlsOptions,
  resolveEmailAuth,
  resolveEmailFrom,
} from '../email-env';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;
  const auth = await resolveEmailAuth();
  transporter = nodemailer.createTransport({
    host: auth.host,
    port: auth.port,
    secure: auth.secure,
    auth: {
      user: auth.user,
      pass: auth.pass,
    },
    tls: emailTlsOptions(),
  });
  return transporter;
}

export function resetEmailServiceTransport(): void {
  transporter = null;
  clearResolvedEmailAuthCache();
}

export const sendEmail = async ({
  to,
  subject,
  html,
  attachments = [],
}: {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: unknown[];
}) => {
  try {
    const auth = await resolveEmailAuth();
    const transport = await getTransporter();
    const from = await resolveEmailFrom('Portal ABZ');
    const info = await transport.sendMail({
      from,
      to,
      subject,
      html,
      attachments,
      replyTo: auth.replyTo,
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};
