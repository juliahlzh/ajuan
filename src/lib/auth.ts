import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const sessionCookieName = 'ajuan_session_v4';
export const clientSessionCookieName = 'ajuan_client_session_v2';
export const legacySessionCookieName = 'ajuan_session';
export const previousSessionCookieName = 'ajuan_session_v3';

export type UserRole = 'admin' | 'dirkeu';

export type AuthAccount = {
  role: UserRole;
  username: string;
  password: string;
  displayName: string;
};

export type AuthSession = {
  role: UserRole;
  username: string;
  displayName: string;
};

function accountSecretFragment(account: AuthAccount) {
  return `${account.role}:${account.username}:${account.password}`;
}

export function getAuthAccounts(): AuthAccount[] {
  const accounts: AuthAccount[] = [];

  const adminUsername = process.env.APP_ADMIN_USER || process.env.APP_BASIC_AUTH_USER || '';
  const adminPassword = process.env.APP_ADMIN_PASS || process.env.APP_BASIC_AUTH_PASS || '';
  if (adminUsername && adminPassword) {
    accounts.push({
      role: 'admin',
      username: adminUsername,
      password: adminPassword,
      displayName: 'Admin'
    });
  }

  const dirkeuUsername = process.env.APP_DIRKEU_USER || '';
  const dirkeuPassword = process.env.APP_DIRKEU_PASS || '';
  if (dirkeuUsername && dirkeuPassword) {
    accounts.push({
      role: 'dirkeu',
      username: dirkeuUsername,
      password: dirkeuPassword,
      displayName: 'Dirkeu'
    });
  }

  return accounts;
}

export function authEnabled() {
  return getAuthAccounts().length > 0;
}

function expectedSessionSecret() {
  const explicit = process.env.APP_SESSION_TOKEN;
  if (explicit) return explicit;
  return `${getAuthAccounts().map(accountSecretFragment).join('::')}:v4`;
}

export function createSessionToken(account: AuthAccount) {
  return `${account.role}|${encodeURIComponent(account.username)}|${encodeURIComponent(expectedSessionSecret())}`;
}

export function expectedSessionToken() {
  const [firstAccount] = getAuthAccounts();
  return firstAccount ? createSessionToken(firstAccount) : '';
}

export function getSessionFromToken(token?: string | null): AuthSession | null {
  if (!token) return null;
  const [role, encodedUsername, encodedSecret] = token.split('|');
  if (!role || !encodedUsername || !encodedSecret) return null;

  const username = decodeURIComponent(encodedUsername);
  const secret = decodeURIComponent(encodedSecret);
  if (secret !== expectedSessionSecret()) return null;

  const account = getAuthAccounts().find((item) => item.role === role && item.username === username);
  if (!account) return null;

  return {
    role: account.role,
    username: account.username,
    displayName: account.displayName
  };
}

export function authenticateCredentials(username: string, password: string) {
  return getAuthAccounts().find((account) => account.username === username && account.password === password) || null;
}

export function getDefaultRouteForRole(role: UserRole) {
  return role === 'dirkeu' ? '/review-dirkeu' : '/cek-ajuan';
}

export async function getSession(): Promise<AuthSession | null> {
  const store = await cookies();
  return getSessionFromToken(store.get(sessionCookieName)?.value || store.get(clientSessionCookieName)?.value || null);
}

export async function requireRole(roles: UserRole[]) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!roles.includes(session.role)) redirect(getDefaultRouteForRole(session.role));
  return session;
}

