const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'ajuan-files';

function requireSupabase() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi untuk production.');
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ''), serviceKey };
}

export async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await supabaseFetch(path, init);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function supabaseFetch(path: string, init: RequestInit = {}) {
  const cfg = requireSupabase();
  const response = await fetch(`${cfg.supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: cfg.serviceKey,
      Authorization: `Bearer ${cfg.serviceKey}`,
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request gagal (${response.status}): ${text}`);
  }
  return response;
}

export function hasSupabaseRest() {
  return Boolean(supabaseUrl && serviceKey);
}
