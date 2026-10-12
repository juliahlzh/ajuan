import { createHmac, timingSafeEqual } from 'node:crypto';

export const fileLinkLifetimeSeconds = 30 * 24 * 60 * 60;

function signingSecret() {
  const secret = process.env.APP_FILE_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.BLOB_READ_WRITE_TOKEN || process.env.APP_SESSION_TOKEN;
  if (!secret) throw new Error('Secret untuk link lampiran belum dikonfigurasi.');
  return secret;
}

function safeFilePath(path: string) {
  if (!path.startsWith('/api/files/') || path.length > 4096) return false;
  try {
    return path.slice('/api/files/'.length).split('/').every(part => {
      const decoded = decodeURIComponent(part);
      return decoded && decoded !== '.' && decoded !== '..' && !/[\\/\u0000-\u001f?#]/.test(decoded);
    });
  } catch { return false; }
}

export function createSharedFileUrl(url: string, origin: string, now = Math.floor(Date.now() / 1000)) {
  const file = new URL(url, origin);
  if (file.origin !== new URL(origin).origin || !file.pathname.startsWith('/api/files/')) return file.href;
  if (!safeFilePath(file.pathname)) throw new Error('Path lampiran tidak valid.');
  const payload = Buffer.from(JSON.stringify({ path: file.pathname, exp: now + fileLinkLifetimeSeconds })).toString('base64url');
  const signature = createHmac('sha256', signingSecret()).update(`ajuan-file-v1:${payload}`).digest('base64url');
  const shared = new URL('/api/shared-files', origin);
  shared.searchParams.set('token', `${payload}.${signature}`);
  return shared.href;
}

export function verifySharedFileToken(token: string | null, now = Math.floor(Date.now() / 1000)): string | null {
  if (!token || token.length > 8192) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const expected = createHmac('sha256', signingSecret()).update(`ajuan-file-v1:${parts[0]}`).digest();
    const actual = Buffer.from(parts[1], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (typeof value.path !== 'string' || !safeFilePath(value.path) || !Number.isSafeInteger(value.exp) || value.exp <= now || value.exp > now + fileLinkLifetimeSeconds) return null;
    return value.path;
  } catch { return null; }
}
