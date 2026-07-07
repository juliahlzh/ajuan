import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { sql } from '@/lib/db';
import { saveUpload } from '@/lib/storage';
import { hasSupabaseRest, supabaseRequest } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole(['dirkeu']);
  const { id } = await params;
  const form = await request.formData();
  const file = (form.get('file') || form.get('bukti')) as File | null;
  if (!file?.size) {
    return NextResponse.json({ error: 'File bukti wajib diupload.' }, { status: 400 });
  }

  let url: string;
  try {
    url = await saveUpload(file, `bukti/${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload file gagal.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ link_bukti_transfer: url, status: 'Selesai Dibayar', updated_at: new Date().toISOString() })
    });
    await supabaseRequest('/rest/v1/ajuan_audit_log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ id_ajuan: id, action: 'API_UPLOAD_BUKTI_TF', changed_fields: { url } })
    });
    return NextResponse.json({ ok: true, id_ajuan: id, link_bukti_transfer: url, status: 'Selesai Dibayar' });
  }
  await sql`UPDATE ajuan SET link_bukti_transfer=${url}, status='Selesai Dibayar', updated_at=NOW() WHERE id_ajuan=${id}`;
  await sql`INSERT INTO ajuan_audit_log (id_ajuan, action, changed_fields) VALUES (${id}, 'API_UPLOAD_BUKTI_TF', ${JSON.stringify({ url })}::jsonb)`;
  return NextResponse.json({ ok: true, id_ajuan: id, link_bukti_transfer: url, status: 'Selesai Dibayar' });
}
