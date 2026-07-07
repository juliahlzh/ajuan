import { NextRequest, NextResponse } from 'next/server';
import { parseAttachmentLinks, serializeAttachmentLinks } from '@/lib/attachments';
import { sql } from '@/lib/db';
import { saveUpload } from '@/lib/storage';
import { hasSupabaseRest, supabaseRequest } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  const file = (form.get('file') || form.get('lpj')) as File | null;
  const lpjUrl = String(form.get('lpj_url') || '').trim();
  const nominalRealisasi = form.get('nominal_realisasi');
  if (!file?.size && !lpjUrl) {
    return NextResponse.json({ error: 'Isi minimal file LPJ atau link URL LPJ.' }, { status: 400 });
  }

  const realisasi = nominalRealisasi ? Number(nominalRealisasi) : null;
  if (realisasi !== null && (!Number.isFinite(realisasi) || realisasi < 0)) {
    return NextResponse.json({ error: 'Nominal realisasi harus berupa angka positif.' }, { status: 400 });
  }

  if (lpjUrl) {
    try {
      const parsed = new URL(lpjUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
    } catch {
      return NextResponse.json({ error: 'Link URL LPJ harus valid.' }, { status: 400 });
    }
  }

  let uploadedUrl: string | null = null;
  if (file?.size) {
    try {
      uploadedUrl = await saveUpload(file, `lpj/${id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload file gagal.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const currentLinks = hasSupabaseRest()
    ? await supabaseRequest<{ link_lpj: string | null }[]>(`/rest/v1/ajuan?select=link_lpj&id_ajuan=eq.${encodeURIComponent(id)}&limit=1`)
    : await sql<{ link_lpj: string | null }[]>`SELECT link_lpj FROM ajuan WHERE id_ajuan=${id} LIMIT 1`;
  const nextLinks = parseAttachmentLinks(currentLinks[0]?.link_lpj || null);
  if (uploadedUrl) nextLinks.push(uploadedUrl);
  if (lpjUrl) nextLinks.push(lpjUrl);
  const mergedLinks = [...new Set(nextLinks)];
  const lpjValue = serializeAttachmentLinks(mergedLinks);

  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ link_lpj: lpjValue, status_lpj: 'Sudah Upload', nominal_realisasi: realisasi, updated_at: new Date().toISOString() })
    });
    await supabaseRequest('/rest/v1/ajuan_audit_log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ id_ajuan: id, action: 'API_UPLOAD_LPJ', changed_fields: { links: mergedLinks, nominal_realisasi: realisasi } })
    });
    return NextResponse.json({ ok: true, id_ajuan: id, link_lpj: lpjValue, status_lpj: 'Sudah Upload', nominal_realisasi: realisasi });
  }
  await sql`
    UPDATE ajuan
    SET link_lpj=${lpjValue}, status_lpj='Sudah Upload', nominal_realisasi=${realisasi}, updated_at=NOW()
    WHERE id_ajuan=${id}
  `;
  await sql`INSERT INTO ajuan_audit_log (id_ajuan, action, changed_fields) VALUES (${id}, 'API_UPLOAD_LPJ', ${JSON.stringify({ links: mergedLinks, nominal_realisasi: realisasi })}::jsonb)`;
  return NextResponse.json({ ok: true, id_ajuan: id, link_lpj: lpjValue, status_lpj: 'Sudah Upload', nominal_realisasi: realisasi });
}
