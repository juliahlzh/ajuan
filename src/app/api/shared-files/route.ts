import { NextRequest, NextResponse } from 'next/server';
import { verifySharedFileToken } from '@/lib/shared-file-links';
import { GET as readPrivateFile } from '../files/[...pathname]/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const path = verifySharedFileToken(request.nextUrl.searchParams.get('token'));
  if (!path) return new NextResponse('Link tidak valid atau sudah kedaluwarsa. Silakan export Excel ulang dari aplikasi Ajuan.', { status: 403, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  try {
    const pathname = path.slice('/api/files/'.length).split('/').map(decodeURIComponent);
    const response = await readPrivateFile(request, { params: Promise.resolve({ pathname }) });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  } catch {
    return new NextResponse('File tidak ditemukan atau belum dapat dibuka.', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
}
