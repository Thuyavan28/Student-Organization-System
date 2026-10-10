import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

// One email to one recipient, optionally with attachments (used for inline QR codes).
// Never throws: a mail problem must not undo a purchase. Same status values as sendBulkEmail.
export async function sendEmail({ to, subject, text, html, attachments }) {
  const smtp = getTransporter();
  if (!smtp) {
    if (env.NODE_ENV !== 'test') console.log(`[mailer] SMTP not configured, would email ${to}: ${subject}`);
    return { status: 'LOGGED' };
  }
  try {
    await smtp.sendMail({ from: env.MAIL_FROM, to, subject, text, html, attachments });
    return { status: 'SENT' };
  } catch (err) {
    console.error('[mailer] delivery failed:', err.message);
    return { status: 'FAILED' };
  }
}

// Returns SENT when SMTP delivered, LOGGED when SMTP is not configured, FAILED on a delivery error.
export async function sendBulkEmail({ to, subject, text }) {
  const count = to.length;
  const smtp = getTransporter();
  if (!smtp) {
    if (env.NODE_ENV !== 'test') console.log(`[mailer] would send to ${count} recipients: ${subject}`);
    return { status: 'LOGGED', count };
  }
  if (count === 0) return { status: 'SENT', count };
  try {
    await smtp.sendMail({ from: env.MAIL_FROM, to: env.MAIL_FROM, bcc: to, subject, text });
    return { status: 'SENT', count };
  } catch (err) {
    console.error('[mailer] delivery failed:', err.message);
    return { status: 'FAILED', count };
  }
}
