import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { ApiError, notFound, badRequest } from '../../utils/apiError.js';

// In-memory sessions map for local mobile scan-and-pay flow
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function generateVerificationCode() {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `CF-${digits}`;
}

// Sessions older than their expiry are removed, so the map cannot grow forever and expired sessions cannot be approved.
function sweepExpired() {
  const now = Date.now();
  for (const [id, session] of sessions) if (new Date(session.expiresAt).getTime() <= now) sessions.delete(id);
}
setInterval(sweepExpired, 5 * 60 * 1000).unref();

function liveSession(id) {
  const session = sessions.get(id);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    sessions.delete(id);
    throw notFound('Payment session not found or expired');
  }
  return session;
}

const paymentError = (code, message) => new ApiError(402, code, message);

// Server-side proof that a purchase was paid for. A purchase presents a payment session id; the server only accepts it if
// the session is live, APPROVED (by the payer's phone), created by the same user, for EXACTLY the amount the server itself
// calculated, and not already used. `claim` marks it in use before the purchase is written (so two simultaneous requests
// cannot both spend it), `done` finishes it, and `fail` releases it if the purchase is refused (sold out, stock...).
// Zero-price purchases need no payment. Sessions live in this process's memory, which is fine for a single server.
function proofFor(sessionId, userId) {
  let claimed = null;
  return {
    required: env.REQUIRE_PAYMENT_PROOF,
    claim(amount) {
      if (!env.REQUIRE_PAYMENT_PROOF || amount <= 0) return;
      if (!sessionId) throw paymentError('PAYMENT_REQUIRED', 'Payment is required. Complete the payment before confirming.');
      const session = sessions.get(sessionId);
      if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
        throw paymentError('PAYMENT_EXPIRED', 'This payment session has expired. Please start the payment again.');
      }
      if (session.userId !== userId) throw paymentError('PAYMENT_NOT_YOURS', 'This payment session belongs to another account.');
      if (session.status === 'CONSUMED' || session.claimed) throw paymentError('PAYMENT_ALREADY_USED', 'This payment was already used for a purchase.');
      if (session.status !== 'APPROVED') throw paymentError('PAYMENT_NOT_APPROVED', 'The payment has not been approved yet.');
      if (session.amount !== amount) throw paymentError('PAYMENT_AMOUNT_MISMATCH', 'The paid amount does not match the price of this purchase.');
      session.claimed = true;
      claimed = session;
    },
    done() {
      if (claimed) { claimed.status = 'CONSUMED'; claimed.claimed = false; claimed.updatedAt = new Date().toISOString(); claimed = null; }
    },
    fail() {
      if (claimed) { claimed.claimed = false; claimed = null; }
    },
  };
}

export const paymentsService = {
  proofFor,

  createSession({ amount, title = 'ClubFlow Payment', note = '', payeeName = 'ClubFlow Skyline', type = 'PAYMENT', metadata = {} }, userId = null) {
    const id = `ps_${randomBytes(8).toString('hex')}`;
    const verificationCode = generateVerificationCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    const session = {
      id,
      amount: Number(amount) || 0,
      title,
      note,
      payeeName,
      type,
      metadata,
      userId,
      claimed: false,
      status: 'PENDING',
      verificationCode,
      ticketQrData: `CLUBFLOW:TICKET:${verificationCode}:${encodeURIComponent(title)}`,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      updatedAt: now.toISOString(),
    };

    sessions.set(id, session);
    return session;
  },

  getSession(id) {
    return liveSession(id);
  },

  approve(id) {
    const session = liveSession(id);
    if (session.status !== 'PENDING') throw badRequest('SESSION_CLOSED', `Payment session is already ${session.status.toLowerCase()}`);

    session.status = 'APPROVED';
    session.approvedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    return session;
  },

  reject(id) {
    const session = liveSession(id);
    if (session.status !== 'PENDING') throw badRequest('SESSION_CLOSED', `Payment session is already ${session.status.toLowerCase()}`);

    session.status = 'REJECTED';
    session.rejectedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    return session;
  },

  getLanIp() {
    const interfaces = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push({ interface: name, ip: net.address });
        }
      }
    }

    const preferredIp = ips[0]?.ip || 'localhost';
    return { ip: preferredIp, ips, port: 5173 };
  },
};
