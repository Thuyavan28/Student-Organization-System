import crypto from 'node:crypto';

// 18 random bytes encode to 24 url-safe characters. The token carries no personal data.
export function generateTicketToken() {
  return crypto.randomBytes(18).toString('base64url');
}
