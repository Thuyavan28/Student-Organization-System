import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

// Mail is only "configured" when there is a server and, if a user name is set, its password too. Without the password every
// send would fail, so the app behaves as if mail were off (and says why once) instead of failing on every purchase.
let warned = false;
export function isMailConfigured() {
  if (!env.SMTP_HOST) return false;
  if (env.SMTP_USER && !env.SMTP_PASS) {
    if (!warned) {
      warned = true;
      console.warn(`[mailer] SMTP_USER is set (${env.SMTP_USER}) but SMTP_PASS is empty: emails are NOT being sent. For Gmail, create an App Password and put it in backend/.env.`);
    }
    return false;
  }
  return true;
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS.replace(/\s+/g, '') } : undefined,
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
