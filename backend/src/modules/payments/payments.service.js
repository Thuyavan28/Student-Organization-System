import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { notFound, badRequest } from '../../utils/apiError.js';

// In-memory sessions map for local mobile scan-and-pay flow
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function generateVerificationCode() {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `CF-${digits}`;
}

export const paymentsService = {
  createSession({ amount, title = 'ClubFlow Payment', note = '', payeeName = 'ClubFlow Skyline', type = 'PAYMENT', metadata = {} }) {
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
    const session = sessions.get(id);
    if (!session) throw notFound('Payment session not found or expired');
    return session;
  },

  approve(id) {
    const session = sessions.get(id);
    if (!session) throw notFound('Payment session not found or expired');
    if (session.status !== 'PENDING') throw badRequest('SESSION_CLOSED', `Payment session is already ${session.status.toLowerCase()}`);

    session.status = 'APPROVED';
    session.approvedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();
    sessions.set(id, session);
    return session;
  },

  reject(id) {
    const session = sessions.get(id);
    if (!session) throw notFound('Payment session not found or expired');
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
