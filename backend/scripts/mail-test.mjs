// Checks the email setup end to end and sends one real test email.
//   node scripts/mail-test.mjs [recipient]       (default recipient: the sender itself)
import 'dotenv/config';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
const to = process.argv[2] || SMTP_USER;
console.log(`Server: ${SMTP_HOST}:${SMTP_PORT || 587}   User: ${SMTP_USER || '(none)'}   From: ${MAIL_FROM}`);
if (!SMTP_HOST || !SMTP_USER) { console.log('FAIL: SMTP_HOST and SMTP_USER must be set in backend/.env'); process.exit(1); }
if (!SMTP_PASS) {
  console.log('FAIL: SMTP_PASS is empty.');
  console.log('  Gmail needs an App Password (not your normal password):');
  console.log('  1. Google Account > Security > turn on 2-Step Verification');
  console.log('  2. Google Account > Security > App passwords > create one named "ClubFlow"');
  console.log('  3. Put the 16 characters in backend/.env as SMTP_PASS="xxxx xxxx xxxx xxxx" and restart the backend');
  process.exit(1);
}
const transport = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: Number(SMTP_PORT) === 465, auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s+/g, '') } });
try {
  await transport.verify();
  console.log('OK: logged in to the mail server.');
  const info = await transport.sendMail({ from: MAIL_FROM, to, subject: 'ClubFlow email test', text: 'If you can read this, ClubFlow can send email.\nOrder and ticket QR emails will now be delivered.' });
  console.log(`OK: test email sent to ${to} (id ${info.messageId}). Check the inbox (and spam).`);
} catch (error) {
  console.log(`FAIL: ${error.message}`);
  if (/535|Invalid login|Username and Password/i.test(error.message)) console.log('  Gmail rejected the login: use an App Password (2-Step Verification must be on), not the account password.');
  process.exit(1);
}
