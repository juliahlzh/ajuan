import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSharedFileUrl, fileLinkLifetimeSeconds, verifySharedFileToken } from './shared-file-links';

afterEach(() => vi.unstubAllEnvs());
describe('30-day attachment access', () => {
  const origin = 'https://ajuan-pembayaran.vercel.app';
  const path = '/api/files/ajuan-files/memo/file%20one.pdf';
  const now = 1_800_000_000;
  function token() {
    vi.stubEnv('APP_FILE_LINK_SECRET', 'test-secret-used-only-in-tests');
    return new URL(createSharedFileUrl(path, origin, now)).searchParams.get('token')!;
  }
  it('works up to 30 days and expires at the exact deadline', () => {
    const value = token();
    expect(verifySharedFileToken(value, now)).toBe(path);
    expect(verifySharedFileToken(value, now + fileLinkLifetimeSeconds - 1)).toBe(path);
    expect(verifySharedFileToken(value, now + fileLinkLifetimeSeconds)).toBeNull();
  });
  it('rejects modified paths, modified signatures and missing tokens', () => {
    const value = token();
    const [payload, signature] = value.split('.');
    const content = JSON.parse(Buffer.from(payload, 'base64url').toString());
    content.path = '/api/files/ajuan-files/memo/other.pdf';
    expect(verifySharedFileToken(`${Buffer.from(JSON.stringify(content)).toString('base64url')}.${signature}`, now)).toBeNull();
    expect(verifySharedFileToken(`${payload}.invalid`, now)).toBeNull();
    expect(verifySharedFileToken(null, now)).toBeNull();
  });
  it('keeps external links and rejects traversal', () => {
    token();
    expect(createSharedFileUrl('https://example.com/file.pdf', origin, now)).toBe('https://example.com/file.pdf');
    expect(() => createSharedFileUrl('/api/files/bucket/%2Fsecret', origin, now)).toThrow();
  });
});
