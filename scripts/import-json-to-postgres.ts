import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDatabase, sql } from '../src/lib/db';

type LegacyAjuan = Record<string, any>;
type LegacyAudit = Record<string, any>;

function value<T>(row: LegacyAjuan, key: string, fallback: T): T {
  const current = row[key];
  return current === undefined || current === '' ? fallback : current;
}

function boolValue(input: unknown) {
  return ['1', 'true', 'ya', 'wajib', 'yes'].includes(String(input ?? '').trim().toLowerCase());
}

async function main() {
  await ensureDatabase();
  const file = process.argv[2] || path.join(process.cwd(), 'migration-export-ajuan.json');
  const payload = JSON.parse(await fs.readFile(file, 'utf-8')) as { ajuan: LegacyAjuan[]; audit_logs?: LegacyAudit[] };

  for (const row of payload.ajuan || []) {
    await sql`
      INSERT INTO ajuan (
        id_ajuan, tanggal_ajuan, nama_pengaju, nama_penerima_dana, nama_bank, nomor_rekening, nomor_memo, perihal,
        divisi_cabang, jenis_ajuan, nominal, keterangan, status, link_bukti_transfer,
        link_memo_ajuan, wajib_lpj, tanggal_jatuh_tempo_lpj, status_lpj, link_lpj,
        nominal_realisasi, created_at, updated_at
      )
      VALUES (
        ${value(row, 'id_ajuan', '')}, ${value(row, 'tanggal_ajuan', new Date().toISOString().slice(0, 10))},
        ${value(row, 'nama_pengaju', '-')}, ${value(row, 'nama_penerima_dana', null)},
        ${value(row, 'nama_bank', null)}, ${value(row, 'nomor_rekening', null)},
        ${value(row, 'nomor_memo', null)}, ${value(row, 'perihal', null)},
        ${value(row, 'divisi_cabang', '-')}, ${value(row, 'jenis_ajuan', '-')},
        ${Number(value(row, 'nominal', 0))}, ${value(row, 'keterangan', null)},
        ${value(row, 'status', 'Menunggu Pembayaran')}, ${value(row, 'link_bukti_transfer', null)},
        ${value(row, 'link_memo_ajuan', null)}, ${boolValue(value(row, 'wajib_lpj', true))},
        ${value(row, 'tanggal_jatuh_tempo_lpj', null)}, ${value(row, 'status_lpj', 'Belum Upload')},
        ${value(row, 'link_lpj', null)}, ${row.nominal_realisasi === '' ? null : value(row, 'nominal_realisasi', null)},
        ${value(row, 'created_at', new Date().toISOString())}, ${value(row, 'updated_at', new Date().toISOString())}
      )
      ON CONFLICT (id_ajuan) DO UPDATE SET
        tanggal_ajuan=EXCLUDED.tanggal_ajuan,
        nama_pengaju=EXCLUDED.nama_pengaju,
        nama_penerima_dana=EXCLUDED.nama_penerima_dana,
        nama_bank=EXCLUDED.nama_bank,
        nomor_rekening=EXCLUDED.nomor_rekening,
        divisi_cabang=EXCLUDED.divisi_cabang,
        jenis_ajuan=EXCLUDED.jenis_ajuan,
        nominal=EXCLUDED.nominal,
        status=EXCLUDED.status,
        link_bukti_transfer=EXCLUDED.link_bukti_transfer,
        link_memo_ajuan=EXCLUDED.link_memo_ajuan,
        status_lpj=EXCLUDED.status_lpj,
        link_lpj=EXCLUDED.link_lpj,
        nominal_realisasi=EXCLUDED.nominal_realisasi,
        updated_at=NOW()
    `;
  }

  for (const log of payload.audit_logs || []) {
    if (!log.id_ajuan) continue;
    await sql`
      INSERT INTO ajuan_audit_log (id_ajuan, action, changed_fields, created_at)
      VALUES (${log.id_ajuan}, ${log.action || 'LEGACY_IMPORT'}, ${JSON.stringify(log.changed_fields || {})}::jsonb, ${log.created_at || new Date().toISOString()})
      ON CONFLICT DO NOTHING
    `;
  }

  console.log(`Import selesai. Total ajuan: ${(payload.ajuan || []).length}`);
  await sql.end();
}

main().catch(async (error) => {
  console.error('Import JSON gagal:', error);
  await sql.end();
  process.exit(1);
});
