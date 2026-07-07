import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { parseAttachmentLinks, serializeAttachmentLinks } from './attachments';
import { requireRole } from './auth';
import { sql } from './db';
import { canSubmitToDirkeu, toView } from './domain';
import { parseImportWorkbook } from './importer';
import { paymentStatusOptions, statusLpjOptions } from './options';
import { saveUpload } from './storage';
import { hasSupabaseRest, supabaseRequest } from './supabase';
import { hasDatabaseUrl } from './db';
import type { Ajuan, AjuanFilters, ReviewLog, StatusLpj, StatusPembayaran } from './types';

export const statuses: StatusPembayaran[] = paymentStatusOptions;
export const reviewStatusOptions = ['Belum Diajukan', 'Menunggu Review Dirkeu', 'Disetujui Dirkeu', 'Ditolak Dirkeu', 'Perlu Revisi', 'Legacy Finance'];
const restPageSize = 1000;

function jakartaDateId() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
  return parts.replaceAll('-', '');
}

const ajuanSchema = z.object({
  tanggal_ajuan: z.string().min(1),
  nama_pengaju: z.string().min(1),
  nama_penerima_dana: z.string().optional(),
  nama_bank: z.string().optional(),
  nomor_rekening: z.string().optional(),
  nomor_memo: z.string().optional(),
  perihal: z.string().optional(),
  divisi_cabang: z.string().min(1),
  jenis_ajuan: z.string().min(1),
  nominal: z.coerce.number().min(0),
  keterangan: z.string().optional(),
  status: z.enum(['Menunggu Pembayaran', 'Diproses', 'Selesai Dibayar', 'Dibayar Tanpa Bukti TF']).default('Menunggu Pembayaran'),
  wajib_lpj: z.coerce.boolean().default(true),
  tanggal_jatuh_tempo_lpj: z.string().optional(),
  status_lpj: z.enum(['Belum Upload', 'Sudah Upload', 'Tidak Wajib']).default('Belum Upload'),
  nominal_realisasi: z.union([z.coerce.number().min(0), z.literal(''), z.null()]).optional()
});

function normalizeForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return ajuanSchema.parse({
    ...raw,
    wajib_lpj: raw.wajib_lpj === 'on' || raw.wajib_lpj === 'true' || raw.wajib_lpj === '1',
    nominal_realisasi: raw.nominal_realisasi === '' ? null : raw.nominal_realisasi
  });
}

function restHeaders(prefer = 'return=minimal') {
  return {
    'Content-Type': 'application/json',
    Prefer: prefer
  };
}

function optionalNonNegativeNumber(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function saveUploadOrRedirect(file: File, folder: string, errorPath: string) {
  try {
    return await saveUpload(file, folder);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload file gagal.';
    redirect(`${errorPath}?error=${encodeURIComponent(message)}`);
  }
}

function matchesFilters(row: Ajuan, filters: AjuanFilters) {
  const keyword = (filters.keyword || '').toLowerCase();
  const view = toView(row);
  const haystack = [
    row.id_ajuan,
    row.nama_pengaju,
    row.nama_penerima_dana || '',
    row.divisi_cabang,
    row.perihal || '',
    row.keterangan || '',
    row.review_note_dirkeu || '',
    row.review_status_dirkeu || ''
  ].join(' ').toLowerCase();
  if (keyword && !haystack.includes(keyword)) return false;
  if (filters.cabang && !row.divisi_cabang.toLowerCase().includes(filters.cabang.toLowerCase())) return false;
  if (filters.tahun && String(row.tanggal_ajuan).slice(0, 4) !== filters.tahun) return false;
  if (filters.tanggal_awal && String(row.tanggal_ajuan).slice(0, 10) < filters.tanggal_awal) return false;
  if (filters.tanggal_akhir && String(row.tanggal_ajuan).slice(0, 10) > filters.tanggal_akhir) return false;
  if (filters.status && row.status !== filters.status) return false;
  if (filters.review_status_dirkeu && row.review_status_dirkeu !== filters.review_status_dirkeu) return false;
  if (filters.status_lpj && view.status_lpj_turunan !== filters.status_lpj) return false;
  if (filters.status_dana && view.status_dana !== filters.status_dana) return false;
  if (filters.archived === '1' && !row.is_archived) return false;
  if (filters.archived === '0' && row.is_archived) return false;
  return true;
}

function sortAjuanViews<T extends ReturnType<typeof toView>>(rows: T[], sort = 'tanggal_desc') {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === 'tanggal_asc') return String(a.tanggal_ajuan).localeCompare(String(b.tanggal_ajuan));
    if (sort === 'nominal_desc') return b.nominal - a.nominal;
    if (sort === 'nominal_asc') return a.nominal - b.nominal;
    if (sort === 'pengaju_asc') return a.nama_pengaju.localeCompare(b.nama_pengaju);
    if (sort === 'pengaju_desc') return b.nama_pengaju.localeCompare(a.nama_pengaju);
    if (sort === 'cabang_asc') return a.divisi_cabang.localeCompare(b.divisi_cabang);
    if (sort === 'cabang_desc') return b.divisi_cabang.localeCompare(a.divisi_cabang);
    if (sort === 'status_asc') return a.status.localeCompare(b.status);
    if (sort === 'status_desc') return b.status.localeCompare(a.status);
    if (sort === 'review_asc') return a.review_status_dirkeu.localeCompare(b.review_status_dirkeu);
    if (sort === 'review_desc') return b.review_status_dirkeu.localeCompare(a.review_status_dirkeu);
    if (sort === 'lpj_asc') return a.status_lpj_turunan.localeCompare(b.status_lpj_turunan);
    if (sort === 'lpj_desc') return b.status_lpj_turunan.localeCompare(a.status_lpj_turunan);
    if (sort === 'dana_asc') return a.status_dana.localeCompare(b.status_dana);
    if (sort === 'dana_desc') return b.status_dana.localeCompare(a.status_dana);
    return String(b.tanggal_ajuan).localeCompare(String(a.tanggal_ajuan));
  });
  return copy;
}

async function supabaseRequestPaged<T>(basePath: string) {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const joiner = basePath.includes('?') ? '&' : '?';
    const page = await supabaseRequest<T[]>(`${basePath}${joiner}limit=${restPageSize}&offset=${offset}`);
    rows.push(...page);
    if (page.length < restPageSize) break;
    offset += restPageSize;
  }

  return rows;
}

async function restAjuan(filters: AjuanFilters = {}) {
  const rows = await supabaseRequestPaged<Ajuan>('/rest/v1/ajuan?select=*&order=tanggal_ajuan.desc');
  return sortAjuanViews(rows.filter((row) => matchesFilters(row, filters)).map(toView), filters.sort);
}

function buildWhereFragments(filters: AjuanFilters) {
  const keyword = filters.keyword || '';
  return {
    keyword,
    cabang: filters.cabang || '',
    tahun: filters.tahun || '',
    tanggalAwal: filters.tanggal_awal || '',
    tanggalAkhir: filters.tanggal_akhir || '',
    status: filters.status || '',
    reviewStatus: filters.review_status_dirkeu || '',
    statusLpj: filters.status_lpj || '',
    statusDana: filters.status_dana || '',
    archivedFlag: filters.archived === '1' ? true : filters.archived === '0' ? false : null
  };
}

export async function generateAjuanId() {
  const prefix = `AJN-${jakartaDateId()}`;
  if (hasSupabaseRest()) {
    const rows = await supabaseRequest<{ id_ajuan: string }[]>(`/rest/v1/ajuan?select=id_ajuan&id_ajuan=like.${prefix}*&order=id_ajuan.desc&limit=1`);
    const lastSequence = Number(rows[0]?.id_ajuan.split('-').pop() || '0');
    return `${prefix}-${String(lastSequence + 1).padStart(4, '0')}`;
  }
  const rows = await sql<{ total: number }[]>`SELECT COUNT(1)::int AS total FROM ajuan WHERE id_ajuan LIKE ${prefix + '%'}`;
  return `${prefix}-${String((rows[0]?.total || 0) + 1).padStart(4, '0')}`;
}

export async function listAjuan(filters: AjuanFilters = {}) {
  if (hasDatabaseUrl()) {
    const fragments = buildWhereFragments(filters);
    const rows = await sql<Ajuan[]>`
      SELECT *
      FROM ajuan
      WHERE (${fragments.keyword || null}::text IS NULL
        OR id_ajuan ILIKE ${`%${fragments.keyword}%`}
        OR nama_pengaju ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(nama_penerima_dana, '') ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(perihal, '') ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(keterangan, '') ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(review_note_dirkeu, '') ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(review_status_dirkeu, '') ILIKE ${`%${fragments.keyword}%`})
        AND (${fragments.cabang || null}::text IS NULL OR divisi_cabang ILIKE ${`%${fragments.cabang}%`})
        AND (${fragments.tahun || null}::text IS NULL OR to_char(tanggal_ajuan, 'YYYY') = ${fragments.tahun})
        AND (${fragments.tanggalAwal || null}::date IS NULL OR tanggal_ajuan >= ${fragments.tanggalAwal || null})
        AND (${fragments.tanggalAkhir || null}::date IS NULL OR tanggal_ajuan <= ${fragments.tanggalAkhir || null})
        AND (${fragments.archivedFlag}::boolean IS NULL OR is_archived = ${fragments.archivedFlag})
      ORDER BY tanggal_ajuan DESC, created_at DESC
    `;
    const views = rows.map(toView);
    const filtered = views.filter((row) => {
      if (filters.status && row.status !== filters.status) return false;
      if (filters.review_status_dirkeu && row.review_status_dirkeu !== filters.review_status_dirkeu) return false;
      if (filters.status_lpj && row.status_lpj_turunan !== filters.status_lpj) return false;
      if (filters.status_dana && row.status_dana !== filters.status_dana) return false;
      return true;
    });
    return sortAjuanViews(filtered, filters.sort);
  }
  if (hasSupabaseRest()) return restAjuan(filters);
  const archivedFlag = filters.archived === '1' ? true : filters.archived === '0' ? false : null;
  const rows = await sql<Ajuan[]>`
    SELECT *
    FROM ajuan
    WHERE (${filters.keyword || null}::text IS NULL
      OR id_ajuan ILIKE ${`%${filters.keyword || ''}%`}
      OR nama_pengaju ILIKE ${`%${filters.keyword || ''}%`}
      OR COALESCE(nama_penerima_dana, '') ILIKE ${`%${filters.keyword || ''}%`}
      OR COALESCE(perihal, '') ILIKE ${`%${filters.keyword || ''}%`}
      OR COALESCE(keterangan, '') ILIKE ${`%${filters.keyword || ''}%`}
      OR COALESCE(review_note_dirkeu, '') ILIKE ${`%${filters.keyword || ''}%`}
      OR COALESCE(review_status_dirkeu, '') ILIKE ${`%${filters.keyword || ''}%`})
      AND (${filters.cabang || null}::text IS NULL OR divisi_cabang ILIKE ${`%${filters.cabang || ''}%`})
      AND (${filters.tahun || null}::text IS NULL OR to_char(tanggal_ajuan, 'YYYY') = ${filters.tahun || ''})
      AND (${filters.tanggal_awal || null}::date IS NULL OR tanggal_ajuan >= ${filters.tanggal_awal || null})
      AND (${filters.tanggal_akhir || null}::date IS NULL OR tanggal_ajuan <= ${filters.tanggal_akhir || null})
      AND (${archivedFlag}::boolean IS NULL OR is_archived = ${archivedFlag})
    ORDER BY tanggal_ajuan DESC, created_at DESC
  `;
  const views = rows.map(toView);
  const filtered = views.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (filters.review_status_dirkeu && row.review_status_dirkeu !== filters.review_status_dirkeu) return false;
    if (filters.status_lpj && row.status_lpj_turunan !== filters.status_lpj) return false;
    if (filters.status_dana && row.status_dana !== filters.status_dana) return false;
    return true;
  });
  return sortAjuanViews(filtered, filters.sort);
}

export async function getAjuan(id: string) {
  if (hasDatabaseUrl()) {
    const rows = await sql<Ajuan[]>`SELECT * FROM ajuan WHERE id_ajuan = ${id} LIMIT 1`;
    return rows[0] ? toView(rows[0]) : null;
  }
  if (hasSupabaseRest()) {
    const rows = await supabaseRequest<Ajuan[]>(`/rest/v1/ajuan?select=*&id_ajuan=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? toView(rows[0]) : null;
  }
  const rows = await sql<Ajuan[]>`SELECT * FROM ajuan WHERE id_ajuan = ${id} LIMIT 1`;
  return rows[0] ? toView(rows[0]) : null;
}

export async function listYears() {
  if (hasDatabaseUrl()) {
    const rows = await sql<{ tahun: string }[]>`
      SELECT to_char(tanggal_ajuan, 'YYYY') AS tahun
      FROM ajuan
      GROUP BY tahun
      ORDER BY tahun DESC
    `;
    return rows.map((r) => r.tahun);
  }
  if (hasSupabaseRest()) {
    const rows = await supabaseRequestPaged<{ tanggal_ajuan: string }>('/rest/v1/ajuan?select=tanggal_ajuan&order=tanggal_ajuan.desc');
    return [...new Set(rows.map((row) => String(row.tanggal_ajuan).slice(0, 4)).filter(Boolean))];
  }
  const rows = await sql<{ tahun: string }[]>`
    SELECT to_char(tanggal_ajuan, 'YYYY') AS tahun
    FROM ajuan
    GROUP BY tahun
    ORDER BY tahun DESC
  `;
  return rows.map((r) => r.tahun);
}

export async function listDivisi() {
  if (hasDatabaseUrl()) {
    const rows = await sql<{ divisi_cabang: string }[]>`
      SELECT DISTINCT divisi_cabang FROM ajuan WHERE divisi_cabang <> '' ORDER BY divisi_cabang ASC
    `;
    return rows.map((r) => r.divisi_cabang);
  }
  if (hasSupabaseRest()) {
    const rows = await supabaseRequestPaged<{ divisi_cabang: string }>('/rest/v1/ajuan?select=divisi_cabang&order=divisi_cabang.asc');
    return [...new Set(rows.map((row) => row.divisi_cabang).filter(Boolean))];
  }
  const rows = await sql<{ divisi_cabang: string }[]>`
    SELECT DISTINCT divisi_cabang FROM ajuan WHERE divisi_cabang <> '' ORDER BY divisi_cabang ASC
  `;
  return rows.map((r) => r.divisi_cabang);
}

export async function listAuditLogs(id: string) {
  if (hasDatabaseUrl()) {
    return sql<{ action: string; changed_fields: unknown; created_at: string }[]>`
      SELECT action, changed_fields, created_at
      FROM ajuan_audit_log
      WHERE id_ajuan = ${id}
      ORDER BY id DESC
      LIMIT 40
    `;
  }
  if (hasSupabaseRest()) {
    return supabaseRequest<{ action: string; changed_fields: unknown; created_at: string }[]>(
      `/rest/v1/ajuan_audit_log?select=action,changed_fields,created_at&id_ajuan=eq.${encodeURIComponent(id)}&order=id.desc&limit=40`
    );
  }
  return sql<{ action: string; changed_fields: unknown; created_at: string }[]>`
    SELECT action, changed_fields, created_at
    FROM ajuan_audit_log
    WHERE id_ajuan = ${id}
    ORDER BY id DESC
    LIMIT 40
  `;
}

export async function listReviewLogs(id: string) {
  if (hasDatabaseUrl()) {
    return sql<ReviewLog[]>`
      SELECT id, id_ajuan, reviewer_role, reviewer_name, action, note, created_at
      FROM ajuan_reviews
      WHERE id_ajuan = ${id}
      ORDER BY id DESC
      LIMIT 40
    `;
  }
  if (hasSupabaseRest()) {
    return supabaseRequest<ReviewLog[]>(
      `/rest/v1/ajuan_reviews?select=id,id_ajuan,reviewer_role,reviewer_name,action,note,created_at&id_ajuan=eq.${encodeURIComponent(id)}&order=id.desc&limit=40`
    );
  }
  return sql<ReviewLog[]>`
    SELECT id, id_ajuan, reviewer_role, reviewer_name, action, note, created_at
    FROM ajuan_reviews
    WHERE id_ajuan = ${id}
    ORDER BY id DESC
    LIMIT 40
  `;
}

export async function getReviewDashboardSummary(filters: AjuanFilters = {}) {
  const fragments = buildWhereFragments(filters);
  if (hasDatabaseUrl()) {
    const rows = await sql<
      {
        total: number;
        pending: number;
        revision: number;
        rejected: number;
        approved: number;
        archived: number;
        nominal_total: string | number | null;
      }[]
    >`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE review_status_dirkeu = 'Menunggu Review Dirkeu')::int AS pending,
        COUNT(*) FILTER (WHERE review_status_dirkeu = 'Perlu Revisi')::int AS revision,
        COUNT(*) FILTER (WHERE review_status_dirkeu = 'Ditolak Dirkeu')::int AS rejected,
        COUNT(*) FILTER (WHERE review_status_dirkeu = 'Disetujui Dirkeu')::int AS approved,
        COUNT(*) FILTER (WHERE is_archived = TRUE)::int AS archived,
        COALESCE(SUM(nominal), 0) AS nominal_total
      FROM ajuan
      WHERE (${fragments.keyword || null}::text IS NULL
        OR id_ajuan ILIKE ${`%${fragments.keyword}%`}
        OR nama_pengaju ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(nama_penerima_dana, '') ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(perihal, '') ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(keterangan, '') ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(review_note_dirkeu, '') ILIKE ${`%${fragments.keyword}%`}
        OR COALESCE(review_status_dirkeu, '') ILIKE ${`%${fragments.keyword}%`})
        AND (${fragments.cabang || null}::text IS NULL OR divisi_cabang ILIKE ${`%${fragments.cabang}%`})
        AND (${fragments.tahun || null}::text IS NULL OR to_char(tanggal_ajuan, 'YYYY') = ${fragments.tahun})
        AND (${fragments.tanggalAwal || null}::date IS NULL OR tanggal_ajuan >= ${fragments.tanggalAwal || null})
        AND (${fragments.tanggalAkhir || null}::date IS NULL OR tanggal_ajuan <= ${fragments.tanggalAkhir || null})
        AND (${fragments.archivedFlag}::boolean IS NULL OR is_archived = ${fragments.archivedFlag})
    `;
    const row = rows[0] || { total: 0, pending: 0, revision: 0, rejected: 0, approved: 0, archived: 0, nominal_total: 0 };
    return {
      total: Number(row.total || 0),
      pending: Number(row.pending || 0),
      revision: Number(row.revision || 0),
      rejected: Number(row.rejected || 0),
      approved: Number(row.approved || 0),
      archived: Number(row.archived || 0),
      nominalTotal: Number(row.nominal_total || 0)
    };
  }

  const rows = await listAjuan(filters);
  return {
    total: rows.length,
    pending: rows.filter((row) => row.review_status_dirkeu === 'Menunggu Review Dirkeu').length,
    revision: rows.filter((row) => row.review_status_dirkeu === 'Perlu Revisi').length,
    rejected: rows.filter((row) => row.review_status_dirkeu === 'Ditolak Dirkeu').length,
    approved: rows.filter((row) => row.review_status_dirkeu === 'Disetujui Dirkeu').length,
    archived: rows.filter((row) => row.is_archived).length,
    nominalTotal: rows.reduce((sum, row) => sum + Number(row.nominal || 0), 0)
  };
}

export async function getDirkeuNotificationSummary() {
  if (hasDatabaseUrl()) {
    const rows = await sql<
      {
        unread_count: number;
        pending_count: number;
        action_needed_count: number;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (
          WHERE review_status_dirkeu = 'Menunggu Review Dirkeu'
            AND (dirkeu_seen_at IS NULL OR dirkeu_seen_at < COALESCE(submitted_to_dirkeu_at, created_at))
        )::int AS unread_count,
        COUNT(*) FILTER (
          WHERE review_status_dirkeu = 'Menunggu Review Dirkeu'
        )::int AS pending_count,
        COUNT(*) FILTER (
          WHERE review_status_dirkeu IN ('Menunggu Review Dirkeu', 'Perlu Revisi')
        )::int AS action_needed_count
      FROM ajuan
      WHERE is_archived = FALSE
    `;
    const row = rows[0] || { unread_count: 0, pending_count: 0, action_needed_count: 0 };
    return {
      unreadCount: Number(row.unread_count || 0),
      pendingCount: Number(row.pending_count || 0),
      actionNeededCount: Number(row.action_needed_count || 0)
    };
  }

  const rows = await listAjuan({ archived: '0' });
  const unreadCount = rows.filter((row) => row.review_status_dirkeu === 'Menunggu Review Dirkeu' && (!row.dirkeu_seen_at || (row.submitted_to_dirkeu_at && row.dirkeu_seen_at < row.submitted_to_dirkeu_at))).length;
  const pendingCount = rows.filter((row) => row.review_status_dirkeu === 'Menunggu Review Dirkeu').length;
  const actionNeededCount = rows.filter((row) => row.review_status_dirkeu === 'Menunggu Review Dirkeu' || row.review_status_dirkeu === 'Perlu Revisi').length;
  return { unreadCount, pendingCount, actionNeededCount };
}

export async function markDirkeuSeen(id: string, role = 'dirkeu') {
  if (hasDatabaseUrl()) {
    await sql`
      UPDATE ajuan
      SET dirkeu_seen_at = NOW(), last_action_by_role = ${role}, updated_at = NOW()
      WHERE id_ajuan = ${id}
    `;
    await addAudit(id, 'DIRKEU_VIEWED_AJUAN', { role, seen_at: new Date().toISOString() });
    return;
  }
  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: restHeaders(),
      body: JSON.stringify({
        dirkeu_seen_at: new Date().toISOString(),
        last_action_by_role: role,
        updated_at: new Date().toISOString()
      })
    });
    await addAudit(id, 'DIRKEU_VIEWED_AJUAN', { role, seen_at: new Date().toISOString() });
  }
}

export async function toggleArchiveAjuanAction(id: string, archived: boolean) {
  'use server';
  await requireRole(['admin']);
  if (hasDatabaseUrl()) {
    await sql`
      UPDATE ajuan
      SET is_archived = ${archived}, updated_at = NOW()
      WHERE id_ajuan = ${id}
    `;
    await addAudit(id, archived ? 'ARCHIVE_AJUAN' : 'UNARCHIVE_AJUAN', { role: 'admin', archived });
    revalidatePath('/cek-ajuan');
    revalidatePath('/review-dirkeu');
    redirect(`/ajuan/${id}/edit?success=${archived ? 'archived' : 'unarchived'}`);
  }
}

async function addAudit(id: string, action: string, changed: unknown = {}) {
  if (hasSupabaseRest()) {
    await supabaseRequest('/rest/v1/ajuan_audit_log', {
      method: 'POST',
      headers: restHeaders(),
      body: JSON.stringify({ id_ajuan: id, action, changed_fields: changed })
    });
    return;
  }
  await sql`
    INSERT INTO ajuan_audit_log (id_ajuan, action, changed_fields)
    VALUES (${id}, ${action}, ${JSON.stringify(changed)}::jsonb)
  `;
}

async function addReviewLog(id: string, reviewerRole: string, reviewerName: string, action: string, note?: string | null) {
  if (hasSupabaseRest()) {
    await supabaseRequest('/rest/v1/ajuan_reviews', {
      method: 'POST',
      headers: restHeaders(),
      body: JSON.stringify({ id_ajuan: id, reviewer_role: reviewerRole, reviewer_name: reviewerName, action, note: note || null })
    });
    return;
  }
  await sql`
    INSERT INTO ajuan_reviews (id_ajuan, reviewer_role, reviewer_name, action, note)
    VALUES (${id}, ${reviewerRole}, ${reviewerName}, ${action}, ${note || null})
  `;
}

export async function createAjuanAction(formData: FormData) {
  'use server';
  const session = await requireRole(['admin']);
  const payload = normalizeForm(formData);
  const skipDirkeuApproval = String(formData.get('skip_dirkeu_approval') || '') === 'on';
  const submitIntent = String(formData.get('submit_intent') || 'save_draft');
  const submitToDirkeu = submitIntent === 'submit_dirkeu' && !skipDirkeuApproval;
  const id = await generateAjuanId();
  const memoFiles = formData.getAll('memo').filter((item): item is File => item instanceof File && item.size > 0);
  const memoUrls = [];
  for (const memoFile of memoFiles) {
    memoUrls.push(await saveUploadOrRedirect(memoFile, `memo/${id}`, '/ajuan/new'));
  }
  const memoUrl = serializeAttachmentLinks(memoUrls);

  const body = {
    id_ajuan: id,
    tanggal_ajuan: payload.tanggal_ajuan,
    nama_pengaju: payload.nama_pengaju,
    nama_penerima_dana: payload.nama_penerima_dana || null,
    nama_bank: payload.nama_bank || null,
    nomor_rekening: payload.nomor_rekening || null,
    nomor_memo: payload.nomor_memo || null,
    perihal: payload.perihal || null,
    divisi_cabang: payload.divisi_cabang,
    jenis_ajuan: payload.jenis_ajuan,
    nominal: payload.nominal,
    keterangan: payload.keterangan || null,
    status: skipDirkeuApproval ? payload.status : 'Menunggu Pembayaran',
    link_memo_ajuan: memoUrl,
    wajib_lpj: payload.wajib_lpj,
    tanggal_jatuh_tempo_lpj: payload.tanggal_jatuh_tempo_lpj || null,
    status_lpj: payload.wajib_lpj ? payload.status_lpj : 'Tidak Wajib',
    nominal_realisasi: payload.nominal_realisasi ?? null,
    created_by_role: session.role,
    approval_stage: skipDirkeuApproval ? 'finance' : submitToDirkeu ? 'submitted' : 'draft',
    review_status_dirkeu: skipDirkeuApproval ? 'Legacy Finance' : submitToDirkeu ? 'Menunggu Review Dirkeu' : 'Belum Diajukan',
    submitted_to_dirkeu_at: submitToDirkeu ? new Date().toISOString() : null,
    last_action_by_role: session.role
  };
  if (hasSupabaseRest()) {
    await supabaseRequest('/rest/v1/ajuan', {
      method: 'POST',
      headers: restHeaders(),
      body: JSON.stringify(body)
    });
    await addAudit(id, 'CREATE_AJUAN', {
      source: 'next_form',
      role: session.role,
      approval_stage: skipDirkeuApproval ? 'finance' : submitToDirkeu ? 'submitted' : 'draft'
    });
    if (skipDirkeuApproval) {
      await addAudit(id, 'MARK_AS_LEGACY_FINANCE', { role: session.role, status: payload.status });
    }
    if (submitToDirkeu) {
      await addReviewLog(id, session.role, session.username, 'SUBMIT_TO_DIRKEU', null);
      await addAudit(id, 'SUBMIT_TO_DIRKEU', { role: session.role, source: 'create_form' });
    }
    revalidatePath('/cek-ajuan');
    redirect(`/ajuan/new?success=${submitToDirkeu ? 'submitted' : 'created'}&id=${encodeURIComponent(id)}`);
  }

  await sql`
    INSERT INTO ajuan (
      id_ajuan, tanggal_ajuan, nama_pengaju, nama_penerima_dana, nama_bank, nomor_rekening, nomor_memo, perihal,
      divisi_cabang, jenis_ajuan, nominal, keterangan, status, link_memo_ajuan,
      wajib_lpj, tanggal_jatuh_tempo_lpj, status_lpj, nominal_realisasi,
      submitted_to_dirkeu_at,
      created_by_role, approval_stage, review_status_dirkeu, last_action_by_role
    )
    VALUES (
      ${id}, ${payload.tanggal_ajuan}, ${payload.nama_pengaju}, ${payload.nama_penerima_dana || null},
      ${payload.nama_bank || null}, ${payload.nomor_rekening || null},
      ${payload.nomor_memo || null}, ${payload.perihal || null}, ${payload.divisi_cabang},
      ${payload.jenis_ajuan}, ${payload.nominal}, ${payload.keterangan || null}, ${skipDirkeuApproval ? payload.status : 'Menunggu Pembayaran'},
      ${memoUrl}, ${payload.wajib_lpj}, ${payload.tanggal_jatuh_tempo_lpj || null},
      ${payload.wajib_lpj ? payload.status_lpj : 'Tidak Wajib'}, ${payload.nominal_realisasi ?? null},
      ${submitToDirkeu ? new Date().toISOString() : null},
      ${session.role}, ${skipDirkeuApproval ? 'finance' : submitToDirkeu ? 'submitted' : 'draft'}, ${skipDirkeuApproval ? 'Legacy Finance' : submitToDirkeu ? 'Menunggu Review Dirkeu' : 'Belum Diajukan'}, ${session.role}
    )
  `;
  await addAudit(id, 'CREATE_AJUAN', {
    source: 'next_form',
    role: session.role,
    approval_stage: skipDirkeuApproval ? 'finance' : submitToDirkeu ? 'submitted' : 'draft'
  });
  if (skipDirkeuApproval) {
    await addAudit(id, 'MARK_AS_LEGACY_FINANCE', { role: session.role, status: payload.status });
  }
  if (submitToDirkeu) {
    await addReviewLog(id, session.role, session.username, 'SUBMIT_TO_DIRKEU', null);
    await addAudit(id, 'SUBMIT_TO_DIRKEU', { role: session.role, source: 'create_form' });
  }
  revalidatePath('/cek-ajuan');
  redirect(`/ajuan/new?success=${submitToDirkeu ? 'submitted' : 'created'}&id=${encodeURIComponent(id)}`);
}

export async function updateAjuanAction(id: string, formData: FormData) {
  'use server';
  const session = await requireRole(['admin']);
  const before = await getAjuan(id);
  if (!before) redirect('/cek-ajuan');
  const payload = normalizeForm(formData);
  const skipDirkeuApproval = String(formData.get('skip_dirkeu_approval') || '') === 'on';
  const canUseLegacyBypass = skipDirkeuApproval && before.approval_stage !== 'submitted';
  const currentMemoLinks = parseAttachmentLinks(before.link_memo_ajuan);
  const memoFiles = formData.getAll('memo').filter((item): item is File => item instanceof File && item.size > 0);
  const nextMemoLinks = [...currentMemoLinks];
  for (const memoFile of memoFiles) {
    nextMemoLinks.push(await saveUploadOrRedirect(memoFile, `memo/${id}`, `/ajuan/${id}/edit`));
  }
  const memoUrl = serializeAttachmentLinks(nextMemoLinks);
  const nextStatus = before.finance_ready || canUseLegacyBypass ? payload.status : before.status;
  const nextApprovalStage = canUseLegacyBypass ? 'finance' : before.approval_stage;
  const nextReviewStatus = canUseLegacyBypass ? 'Legacy Finance' : before.review_status_dirkeu;

  const body = {
    tanggal_ajuan: payload.tanggal_ajuan,
    nama_pengaju: payload.nama_pengaju,
    nama_penerima_dana: payload.nama_penerima_dana || null,
    nama_bank: payload.nama_bank || null,
    nomor_rekening: payload.nomor_rekening || null,
    nomor_memo: payload.nomor_memo || null,
    perihal: payload.perihal || null,
    divisi_cabang: payload.divisi_cabang,
    jenis_ajuan: payload.jenis_ajuan,
    nominal: payload.nominal,
    keterangan: payload.keterangan || null,
    status: nextStatus,
    approval_stage: nextApprovalStage,
    review_status_dirkeu: nextReviewStatus,
    link_memo_ajuan: memoUrl,
    wajib_lpj: payload.wajib_lpj,
    tanggal_jatuh_tempo_lpj: payload.wajib_lpj ? payload.tanggal_jatuh_tempo_lpj || null : null,
    status_lpj: payload.wajib_lpj ? payload.status_lpj : 'Tidak Wajib',
    nominal_realisasi: payload.nominal_realisasi ?? null,
    last_action_by_role: session.role,
    updated_at: new Date().toISOString()
  };
  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: restHeaders(),
      body: JSON.stringify(body)
    });
    await addAudit(id, 'EDIT_AJUAN', {
      before,
      after: { ...payload, status: nextStatus, approval_stage: nextApprovalStage, review_status_dirkeu: nextReviewStatus },
      role: session.role
    });
    if (canUseLegacyBypass) {
      await addAudit(id, 'MARK_AS_LEGACY_FINANCE', { role: session.role, status: nextStatus });
    }
    revalidatePath('/cek-ajuan');
    revalidatePath('/review-dirkeu');
    redirect(`/ajuan/${id}/edit?success=updated`);
  }

  await sql`
    UPDATE ajuan
    SET tanggal_ajuan=${payload.tanggal_ajuan}, nama_pengaju=${payload.nama_pengaju},
      nama_penerima_dana=${payload.nama_penerima_dana || null}, nama_bank=${payload.nama_bank || null},
      nomor_rekening=${payload.nomor_rekening || null}, nomor_memo=${payload.nomor_memo || null},
      perihal=${payload.perihal || null}, divisi_cabang=${payload.divisi_cabang},
      jenis_ajuan=${payload.jenis_ajuan}, nominal=${payload.nominal}, keterangan=${payload.keterangan || null},
      status=${nextStatus}, approval_stage=${nextApprovalStage}, review_status_dirkeu=${nextReviewStatus},
      link_memo_ajuan=${memoUrl}, wajib_lpj=${payload.wajib_lpj},
      tanggal_jatuh_tempo_lpj=${payload.wajib_lpj ? payload.tanggal_jatuh_tempo_lpj || null : null},
      status_lpj=${payload.wajib_lpj ? payload.status_lpj : 'Tidak Wajib'},
      nominal_realisasi=${payload.nominal_realisasi ?? null}, last_action_by_role=${session.role}, updated_at=NOW()
    WHERE id_ajuan=${id}
  `;
  await addAudit(id, 'EDIT_AJUAN', {
    before,
    after: { ...payload, status: nextStatus, approval_stage: nextApprovalStage, review_status_dirkeu: nextReviewStatus },
    role: session.role
  });
  if (canUseLegacyBypass) {
    await addAudit(id, 'MARK_AS_LEGACY_FINANCE', { role: session.role, status: nextStatus });
  }
  revalidatePath('/cek-ajuan');
  revalidatePath('/review-dirkeu');
  redirect(`/ajuan/${id}/edit?success=updated`);
}

export async function deleteAjuanAction(id: string) {
  'use server';
  await requireRole(['admin']);
  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: restHeaders()
    });
    revalidatePath('/cek-ajuan');
    redirect('/cek-ajuan?success=deleted');
  }
  await sql`DELETE FROM ajuan WHERE id_ajuan=${id}`;
  revalidatePath('/cek-ajuan');
  redirect('/cek-ajuan?success=deleted');
}

export async function submitAjuanToDirkeuAction(id: string) {
  'use server';
  const session = await requireRole(['admin']);
  const existing = await getAjuan(id);
  if (!existing) redirect('/cek-ajuan?error=ajuan-tidak-ditemukan');
  if (!canSubmitToDirkeu(existing)) redirect(`/ajuan/${id}/edit?error=ajuan-tidak-bisa-diajukan`);

  const body = {
    approval_stage: 'submitted',
    review_status_dirkeu: 'Menunggu Review Dirkeu',
    submitted_to_dirkeu_at: new Date().toISOString(),
    review_note_dirkeu: existing.review_status_dirkeu === 'Belum Diajukan' ? null : existing.review_note_dirkeu,
    last_action_by_role: session.role,
    updated_at: new Date().toISOString()
  };

  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: restHeaders(),
      body: JSON.stringify(body)
    });
  } else {
    await sql`
      UPDATE ajuan
      SET approval_stage='submitted',
        review_status_dirkeu='Menunggu Review Dirkeu',
        submitted_to_dirkeu_at=NOW(),
        last_action_by_role=${session.role},
        updated_at=NOW()
      WHERE id_ajuan=${id}
    `;
  }

  await addReviewLog(id, session.role, session.username, 'SUBMIT_TO_DIRKEU', existing.review_note_dirkeu);
  await addAudit(id, 'SUBMIT_TO_DIRKEU', { role: session.role });
  revalidatePath('/cek-ajuan');
  revalidatePath('/review-dirkeu');
  redirect(`/ajuan/${id}/edit?success=submitted`);
}

export async function reviewAjuanDirkeuAction(formData: FormData) {
  'use server';
  const session = await requireRole(['dirkeu']);
  const id = String(formData.get('id_ajuan') || '');
  const action = String(formData.get('review_action') || '');
  const note = String(formData.get('review_note') || '').trim();
  const proofFile = formData.get('bukti_tf') as File | null;
  const paidWithoutProof = String(formData.get('paid_without_proof') || '') === 'on';
  if (!id || !action) redirect('/review-dirkeu?error=review-tidak-lengkap');

  const existing = await getAjuan(id);
  if (!existing) redirect('/review-dirkeu?error=ajuan-tidak-ditemukan');
  if (existing.approval_stage !== 'submitted') redirect(`/review-dirkeu/${id}?error=ajuan-sudah-berubah`);

  const nextMap = {
    approve: { approval_stage: 'finance', review_status_dirkeu: 'Disetujui Dirkeu' },
    reject: { approval_stage: 'rejected', review_status_dirkeu: 'Ditolak Dirkeu' },
    revise: { approval_stage: 'revision_requested', review_status_dirkeu: 'Perlu Revisi' }
  } as const;
  const next = nextMap[action as keyof typeof nextMap];
  if (!next) redirect(`/review-dirkeu/${id}?error=aksi-review-tidak-valid`);
  if ((action === 'reject' || action === 'revise') && !note) redirect(`/review-dirkeu/${id}?error=Catatan%20review%20wajib%20diisi%20untuk%20tolak%20atau%20revisi`);
  if (action !== 'approve' && proofFile?.size) redirect(`/review-dirkeu/${id}?error=Upload%20bukti%20TF%20hanya%20bisa%20dipakai%20saat%20approval`);
  if (action !== 'approve' && paidWithoutProof) redirect(`/review-dirkeu/${id}?error=Opsi%20dibayar%20tanpa%20bukti%20hanya%20bisa%20dipakai%20saat%20approval`);
  if (action === 'approve' && proofFile?.size && paidWithoutProof) {
    redirect(`/review-dirkeu/${id}?error=Pilih%20salah%20satu:%20upload%20bukti%20TF%20atau%20tandai%20tanpa%20bukti`);
  }

  let buktiUrl: string | null = existing.link_bukti_transfer || null;
  let paymentStatus: StatusPembayaran = existing.status;
  if (action === 'approve') {
    if (proofFile?.size) {
      buktiUrl = await saveUploadOrRedirect(proofFile, `bukti/${id}`, `/review-dirkeu/${id}`);
      paymentStatus = 'Selesai Dibayar';
    } else if (paidWithoutProof) {
      buktiUrl = null;
      paymentStatus = 'Dibayar Tanpa Bukti TF';
    } else {
      buktiUrl = null;
      paymentStatus = 'Dibayar Tanpa Bukti TF';
    }
  }

  const body = {
    approval_stage: next.approval_stage,
    review_status_dirkeu: next.review_status_dirkeu,
    review_note_dirkeu: note || null,
    link_bukti_transfer: buktiUrl,
    status: paymentStatus,
    reviewed_by: session.username,
    reviewed_at: new Date().toISOString(),
    last_action_by_role: session.role,
    updated_at: new Date().toISOString()
  };

  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: restHeaders(),
      body: JSON.stringify(body)
    });
  } else {
    await sql`
      UPDATE ajuan
      SET approval_stage=${next.approval_stage},
        review_status_dirkeu=${next.review_status_dirkeu},
        review_note_dirkeu=${note || null},
        link_bukti_transfer=${buktiUrl},
        status=${paymentStatus},
        reviewed_by=${session.username},
        reviewed_at=NOW(),
        last_action_by_role=${session.role},
        updated_at=NOW()
      WHERE id_ajuan=${id}
    `;
  }

  await addReviewLog(id, session.role, session.username, action.toUpperCase(), note || null);
  await addAudit(id, 'DIRKEU_REVIEW', {
    action,
    note,
    reviewer: session.username,
    next_stage: next.approval_stage,
    payment_status: paymentStatus,
    link_bukti_transfer: buktiUrl
  });
  revalidatePath('/cek-ajuan');
  revalidatePath('/review-dirkeu');
  revalidatePath('/upload-bukti');
  redirect(`/review-dirkeu/${id}?success=${action}`);
}

export async function uploadBuktiAction(formData: FormData) {
  'use server';
  const session = await requireRole(['dirkeu']);
  const id = String(formData.get('id_ajuan') || '');
  const file = formData.get('bukti') as File | null;
  if (!id || !file?.size) redirect('/upload-bukti?error=missing');
  const existing = await getAjuan(id);
  if (!existing?.finance_ready) redirect('/upload-bukti?error=ajuan-belum-disetujui');
  const url = await saveUploadOrRedirect(file, `bukti/${id}`, '/upload-bukti');
  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: restHeaders(),
      body: JSON.stringify({ link_bukti_transfer: url, status: 'Selesai Dibayar', last_action_by_role: session.role, updated_at: new Date().toISOString() })
    });
    await addAudit(id, 'UPLOAD_BUKTI_TF', { url, role: session.role });
    revalidatePath('/cek-ajuan');
    revalidatePath('/review-dirkeu');
    redirect('/upload-bukti?success=1');
  }
  await sql`UPDATE ajuan SET link_bukti_transfer=${url}, status='Selesai Dibayar', last_action_by_role=${session.role}, updated_at=NOW() WHERE id_ajuan=${id}`;
  await addAudit(id, 'UPLOAD_BUKTI_TF', { url, role: session.role });
  revalidatePath('/cek-ajuan');
  revalidatePath('/review-dirkeu');
  redirect('/upload-bukti?success=1');
}

export async function markPaidWithoutProofAction(formData: FormData) {
  'use server';
  const session = await requireRole(['dirkeu']);
  const id = String(formData.get('id_ajuan') || '');
  if (!id) redirect('/upload-bukti?error=missing-id');
  const existing = await getAjuan(id);
  if (!existing?.finance_ready) redirect('/upload-bukti?error=ajuan-belum-disetujui');

  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: restHeaders(),
      body: JSON.stringify({
        status: 'Dibayar Tanpa Bukti TF',
        link_bukti_transfer: null,
        last_action_by_role: session.role,
        updated_at: new Date().toISOString()
      })
    });
    await addAudit(id, 'MARK_PAID_WITHOUT_PROOF', { role: session.role });
    revalidatePath('/cek-ajuan');
    revalidatePath('/review-dirkeu');
    redirect('/upload-bukti?success=without-proof');
  }

  await sql`
    UPDATE ajuan
    SET status='Dibayar Tanpa Bukti TF',
      link_bukti_transfer=NULL,
      last_action_by_role=${session.role},
      updated_at=NOW()
    WHERE id_ajuan=${id}
  `;
  await addAudit(id, 'MARK_PAID_WITHOUT_PROOF', { role: session.role });
  revalidatePath('/cek-ajuan');
  revalidatePath('/review-dirkeu');
  redirect('/upload-bukti?success=without-proof');
}

export async function uploadLpjAction(formData: FormData) {
  'use server';
  await requireRole(['admin']);
  const id = String(formData.get('id_ajuan') || '');
  const file = formData.get('lpj') as File | null;
  const lpjUrl = String(formData.get('lpj_url') || '').trim();
  const realisasiRaw = String(formData.get('nominal_realisasi') || '');
  if (!id || (!file?.size && !lpjUrl)) redirect('/upload-lpj?error=missing');
  const existing = await getAjuan(id);
  if (!existing) redirect('/upload-lpj?error=invalid-id');
  if (!existing.finance_ready) redirect('/upload-lpj?error=ajuan-belum-disetujui');
  const realisasi = optionalNonNegativeNumber(realisasiRaw);
  if (realisasiRaw && realisasi === null) redirect('/upload-lpj?error=invalid-realisasi');
  if (lpjUrl) {
    try {
      const parsed = new URL(lpjUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
    } catch {
      redirect('/upload-lpj?error=invalid-url');
    }
  }
  const nextLinks = parseAttachmentLinks(existing.link_lpj);
  if (file?.size) {
    nextLinks.push(await saveUploadOrRedirect(file, `lpj/${id}`, '/upload-lpj'));
  }
  if (lpjUrl) nextLinks.push(lpjUrl);
  const mergedLinks = [...new Set(nextLinks)];
  const lpjValue = serializeAttachmentLinks(mergedLinks);
  if (hasSupabaseRest()) {
    await supabaseRequest(`/rest/v1/ajuan?id_ajuan=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: restHeaders(),
      body: JSON.stringify({
        link_lpj: lpjValue,
        status_lpj: 'Sudah Upload',
        nominal_realisasi: realisasi,
        updated_at: new Date().toISOString()
      })
    });
    await addAudit(id, 'UPLOAD_LPJ', { links: mergedLinks, nominal_realisasi: realisasiRaw });
    revalidatePath('/cek-ajuan');
    redirect('/upload-lpj?success=1');
  }
  await sql`
    UPDATE ajuan SET link_lpj=${lpjValue}, status_lpj='Sudah Upload',
      nominal_realisasi=${realisasi}, updated_at=NOW()
    WHERE id_ajuan=${id}
  `;
  await addAudit(id, 'UPLOAD_LPJ', { links: mergedLinks, nominal_realisasi: realisasiRaw });
  revalidatePath('/cek-ajuan');
  redirect('/upload-lpj?success=1');
}

export async function importAjuanAction(formData: FormData) {
  'use server';
  await requireRole(['admin']);
  const file = formData.get('file') as File | null;
  if (!file?.size) redirect('/import-sheet?error=missing');
  const rows = await parseImportWorkbook(file);
  for (const row of rows) {
    const id = row.id_ajuan || (await generateAjuanId());
    if (hasSupabaseRest()) {
      await supabaseRequest('/rest/v1/ajuan?on_conflict=id_ajuan', {
        method: 'POST',
        headers: restHeaders('resolution=merge-duplicates,return=minimal'),
        body: JSON.stringify({
          id_ajuan: id,
          tanggal_ajuan: row.tanggal_ajuan,
          nama_pengaju: row.nama_pengaju || '-',
          nama_penerima_dana: row.nama_penerima_dana || null,
          nama_bank: row.nama_bank || null,
          nomor_rekening: row.nomor_rekening || null,
          nomor_memo: row.nomor_memo || null,
          perihal: row.perihal || null,
          divisi_cabang: row.divisi_cabang,
          jenis_ajuan: row.jenis_ajuan,
          nominal: row.nominal,
          keterangan: row.keterangan || null,
          status: row.status || 'Menunggu Pembayaran',
          link_bukti_transfer: row.link_bukti_transfer || null,
          link_memo_ajuan: row.link_memo_ajuan || null,
          wajib_lpj: row.wajib_lpj ?? true,
          tanggal_jatuh_tempo_lpj: row.tanggal_jatuh_tempo_lpj || null,
          status_lpj: row.status_lpj || 'Belum Upload',
          link_lpj: row.link_lpj || null,
          nominal_realisasi: row.nominal_realisasi ?? null,
          created_by_role: 'admin',
          approval_stage: 'finance',
          review_status_dirkeu: 'Legacy Finance',
          last_action_by_role: 'admin'
        })
      });
      await addAudit(id, 'IMPORT_AJUAN', { file: file.name });
      continue;
    }
    await sql`
      INSERT INTO ajuan (
        id_ajuan, tanggal_ajuan, nama_pengaju, nama_penerima_dana, nama_bank, nomor_rekening, nomor_memo, perihal,
        divisi_cabang, jenis_ajuan, nominal, keterangan, status, link_bukti_transfer,
        link_memo_ajuan, wajib_lpj, tanggal_jatuh_tempo_lpj, status_lpj, link_lpj, nominal_realisasi,
        created_by_role, approval_stage, review_status_dirkeu, last_action_by_role
      )
      VALUES (
        ${id}, ${row.tanggal_ajuan}, ${row.nama_pengaju || '-'}, ${row.nama_penerima_dana || null},
        ${row.nama_bank || null}, ${row.nomor_rekening || null},
        ${row.nomor_memo || null}, ${row.perihal || null}, ${row.divisi_cabang}, ${row.jenis_ajuan},
        ${row.nominal}, ${row.keterangan || null}, ${row.status || 'Menunggu Pembayaran'},
        ${row.link_bukti_transfer || null}, ${row.link_memo_ajuan || null}, ${row.wajib_lpj ?? true},
        ${row.tanggal_jatuh_tempo_lpj || null}, ${row.status_lpj || 'Belum Upload'},
        ${row.link_lpj || null}, ${row.nominal_realisasi ?? null},
        ${'admin'}, ${'finance'}, ${'Legacy Finance'}, ${'admin'}
      )
      ON CONFLICT (id_ajuan) DO UPDATE SET
        tanggal_ajuan=EXCLUDED.tanggal_ajuan,
        nama_pengaju=EXCLUDED.nama_pengaju,
        nama_penerima_dana=EXCLUDED.nama_penerima_dana,
        nama_bank=EXCLUDED.nama_bank,
        nomor_rekening=EXCLUDED.nomor_rekening,
        nomor_memo=EXCLUDED.nomor_memo,
        perihal=EXCLUDED.perihal,
        divisi_cabang=EXCLUDED.divisi_cabang,
        jenis_ajuan=EXCLUDED.jenis_ajuan,
        nominal=EXCLUDED.nominal,
        keterangan=EXCLUDED.keterangan,
        status=EXCLUDED.status,
        link_bukti_transfer=EXCLUDED.link_bukti_transfer,
        link_memo_ajuan=EXCLUDED.link_memo_ajuan,
        wajib_lpj=EXCLUDED.wajib_lpj,
        tanggal_jatuh_tempo_lpj=EXCLUDED.tanggal_jatuh_tempo_lpj,
        status_lpj=EXCLUDED.status_lpj,
        link_lpj=EXCLUDED.link_lpj,
        nominal_realisasi=EXCLUDED.nominal_realisasi,
        created_by_role=COALESCE(ajuan.created_by_role, EXCLUDED.created_by_role),
        approval_stage=COALESCE(ajuan.approval_stage, EXCLUDED.approval_stage),
        review_status_dirkeu=COALESCE(ajuan.review_status_dirkeu, EXCLUDED.review_status_dirkeu),
        last_action_by_role=COALESCE(ajuan.last_action_by_role, EXCLUDED.last_action_by_role),
        updated_at=NOW()
    `;
    await addAudit(id, 'IMPORT_AJUAN', { file: file.name });
  }
  revalidatePath('/cek-ajuan');
  redirect(`/import-sheet?success=${rows.length}`);
}
