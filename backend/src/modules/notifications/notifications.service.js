import QRCode from 'qrcode';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { isMailConfigured, sendEmail } from '../../utils/mailer.js';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
const rupees = (paise) => `Rs ${(Number(paise ?? 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const when = (date) => new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const sizeLabel = (variant) => (variant.size === 'ONE_SIZE' ? '' : ` (${variant.size})`);

async function qrAttachment(value) {
  const content = await QRCode.toBuffer(value, { type: 'png', width: 280, margin: 1, errorCorrectionLevel: 'M' });
  return { filename: 'qr-code.png', content, cid: 'qrcode@clubflow', contentType: 'image/png' };
}

// Table based layout with inline styles: the only thing mail clients render reliably.
function layout({ heading, intro, rows, qrCaption, footer }) {
  const tableRows = rows
    .map(([label, value]) => `<tr><td style="padding:6px 0;color:#52525b">${esc(label)}</td><td style="padding:6px 0;text-align:right;font-weight:600">${value}</td></tr>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#09090b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid #09090b;border-radius:16px">
<tr><td style="padding:24px 28px 8px"><div style="font-size:18px;font-weight:700">ClubFlow</div></td></tr>
<tr><td style="padding:8px 28px"><h1 style="margin:0 0 8px;font-size:22px">${esc(heading)}</h1><p style="margin:0;color:#52525b;font-size:14px;line-height:1.5">${intro}</p></td></tr>
<tr><td style="padding:12px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-top:1px solid #e4e4e7">${tableRows}</table></td></tr>
<tr><td align="center" style="padding:12px 28px 4px"><img src="cid:qrcode@clubflow" width="200" height="200" alt="QR code" style="display:block;border:1px solid #e4e4e7;border-radius:12px"></td></tr>
<tr><td align="center" style="padding:4px 28px 20px;color:#52525b;font-size:12px">${esc(qrCaption)}</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

// Both methods catch everything and only log, so a mail problem can never fail a purchase.
export const notificationsService = {
  // `order` is the saved order including `user` and `items` (with variant and product).
  async orderPlaced(order) {
    if (!isMailConfigured()) return; // nothing would be sent, so skip the (CPU heavy) QR code and message building
    try {
      const { user, items } = order;
      if (!user?.email) return;
      const qrValue = `CLUBFLOW:ORDER:${order.id}`;
      const lineText = (item) => `${item.quantity} x ${item.variant.product.name}${sizeLabel(item.variant)}`;
      const text = [
        `Hi ${user.name},`,
        '',
        `Thanks for your order #${order.id}.`,
        ...items.map((item) => `- ${lineText(item)}`),
        `Total paid: ${rupees(order.total)}`,
        '',
        `Show this order number or the attached QR code when you collect your items (${qrValue}).`,
      ].join('\n');
      const rows = [
        ['Order number', `#${order.id}`],
        ...items.map((item) => [lineText(item), esc(rupees(item.unitPrice * item.quantity - item.discountApplied))]),
        ...(order.discountTotal > 0 ? [['Member discount', `-${esc(rupees(order.discountTotal))}`]] : []),
        ['Total paid', esc(rupees(order.total))],
      ];
      const html = layout({
        heading: 'Your order is confirmed',
        intro: `Hi ${esc(user.name)}, thanks for your order. Show the QR code below when you collect your items.`,
        rows,
        qrCaption: `Order #${order.id}`,
        footer: 'Thanks for supporting the club.',
      });
      await sendEmail({ to: user.email, subject: `Your ClubFlow order #${order.id}`, text, html, attachments: [await qrAttachment(qrValue)] });
    } catch (err) {
      console.error('[notifications] order email failed:', err.message);
    }
  },

  // `booking` and `ticket` are the rows created by the booking transaction. The QR carries only the ticket token.
  async ticketBooked({ booking, ticket }) {
    if (!isMailConfigured()) return;
    try {
      const [user, event] = await Promise.all([
        prisma.user.findUnique({ where: { id: booking.userId }, select: { name: true, email: true } }),
        prisma.event.findUnique({ where: { id: booking.eventId }, select: { title: true, venue: true, startAt: true } }),
      ]);
      if (!user?.email || !event) return;
      const text = [
        `Hi ${user.name},`,
        '',
        `Your ticket for ${event.title} is confirmed.`,
        `When: ${when(event.startAt)}`,
        `Where: ${event.venue}`,
        `Paid: ${rupees(booking.priceAtBooking)}`,
        '',
        'Show the attached QR code at the door.',
      ].join('\n');
      const html = layout({
        heading: 'Your ticket is confirmed',
        intro: `Hi ${esc(user.name)}, you are booked for <strong>${esc(event.title)}</strong>. Show the QR code below at the door.`,
        rows: [
          ['Event', esc(event.title)],
          ['When', esc(when(event.startAt))],
          ['Where', esc(event.venue)],
          ['Paid', esc(rupees(booking.priceAtBooking))],
          ['Booking', `#${booking.id}`],
        ],
        qrCaption: 'Scan at check-in. One ticket, one entry.',
        footer: `You can also open your ticket any time from My tickets at ${esc(env.CLIENT_ORIGIN)}/me/tickets.`,
      });
      await sendEmail({ to: user.email, subject: `Your ticket: ${event.title}`, text, html, attachments: [await qrAttachment(ticket.token)] });
    } catch (err) {
      console.error('[notifications] ticket email failed:', err.message);
    }
  },
};
