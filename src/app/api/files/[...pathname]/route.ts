import { get } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { hasSupabaseRest, supabaseFetch } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ pathname: string[] }> }) {
  const { pathname: parts } = await params;

  if (hasSupabaseRest()) {
    const [bucket, ...pathParts] = parts;
    const objectPath = pathParts.join('/');
    const response = await supabaseFetch(`/storage/v1/object/${bucket}/${objectPath}`, {
      method: 'GET'
    });
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new NextResponse('Private storage is not configured.', { status: 404 });
  }

  const pathname = parts.join('/');
  const result = await get(pathname, { access: 'private' });
  if (result?.statusCode !== 200) {
    return new NextResponse('File not found.', { status: 404 });
  }

  return NextResponse.redirect(result.blob.url, 302);
}
