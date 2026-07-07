import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { parseImportWorkbook } from './importer';

async function workbookFile(workbook: ExcelJS.Workbook, name = 'import.xlsx') {
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('parseImportWorkbook', () => {
  it('mapping sheet Kegiatan: nama rekening menjadi penerima dana, bukan pengaju', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Kegiatan');
    sheet.addRow(['Tanggal', 'Divisi/Departemen', 'Keterangan', 'Ajuan', 'Nominal', 'Rekening an.', 'Bukti TF']);
    sheet.addRow(['2026-03-09', 'MCX', 'Revenue Sharing', 'https://memo.example/a', 1500000, 'Ujang Awaluddin', '']);

    const rows = await parseImportWorkbook(await workbookFile(workbook));

    expect(rows).toHaveLength(1);
    expect(rows[0].nama_pengaju).toBe('-');
    expect(rows[0].nama_penerima_dana).toBe('Ujang Awaluddin');
    expect(rows[0].link_memo_ajuan).toBe('https://memo.example/a');
  });

  it('mendeteksi layout KPI lama', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('KPI Audit');
    sheet.addRow(['Tanggal Ajuan', 'Keterangan', 'Ajuan', 'Tanggal TF', 'Nama', 'Realisasi', 'Tanggal LPJ', 'Wilayah']);
    sheet.addRow(['2025-01-10', 'Operasional', 900000, '2025-01-11', 'PT Contoh', 850000, '', 'Jakarta']);

    const rows = await parseImportWorkbook(await workbookFile(workbook, 'kpi.xlsx'));

    expect(rows).toHaveLength(1);
    expect(rows[0].jenis_ajuan).toBe('KPI Audit');
    expect(rows[0].nama_penerima_dana).toBe('PT Contoh');
    expect(rows[0].status).toBe('Selesai Dibayar');
    expect(rows[0].nominal_realisasi).toBe(850000);
  });
});
