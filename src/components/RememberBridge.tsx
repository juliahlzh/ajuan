'use client';

import { useEffect } from 'react';

const clientCookieName = 'ajuan_client_session_v2';

function clearClientCookie() {
  document.cookie = `${clientCookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readCookie(name: string) {
  const needle = `${name}=`;
  return document.cookie
    .split('; ')
    .find((item) => item.startsWith(needle))
    ?.slice(needle.length) || '';
}

export function RememberBridge({ nextPath }: { nextPath?: string }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const logout = url.searchParams.get('logout');
    if (logout) {
      clearClientCookie();
      url.searchParams.delete('logout');
      window.history.replaceState({}, '', url.toString());
      return;
    }

    const token = readCookie(clientCookieName);
    if (token && window.location.pathname === '/login') {
      const target = nextPath || url.searchParams.get('next') || '/cek-ajuan';
      window.location.replace(target);
    }
  }, [nextPath]);

  return null;
}
