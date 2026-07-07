import { NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { listAjuan } from '@/lib/ajuan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rows = await listAjuan({
    keyword: params.get('keyword') || undefined,
    tahun: params.get('tahun') || undefined,
    cabang: params.get('cabang') || undefined,
    tanggal_awal: params.get('tanggal_awal') || undefined,
    tanggal_akhir: params.get('tanggal_akhir') || undefined,
    status: params.get('status') || undefined,
    review_status_dirkeu: params.get('review_status_dirkeu') || undefined,
    status_lpj: params.get('status_lpj') || undefined,
    status_dana: params.get('status_dana') || undefined,
    sort: params.get('sort') || undefined
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ajuan Pembayaran';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Rekap Ajuan');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 22 },
    { header: 'Tanggal Ajuan', key: 'tanggal', width: 15 },
    { header: 'Nama Pengaju', key: 'pengaju', width: 24 },
    { header: 'Atas Nama Rekening', key: 'rekening', width: 28 },
    { header: 'Bank', key: 'bank', width: 18 },
    { header: 'Nomor Rekening', key: 'nomor_rekening', width: 22 },
    { header: 'Nomor Memo', key: 'memo', width: 28 },
    { header: 'Perihal', key: 'perihal', width: 44 },
    { header: 'Divisi/Cabang', key: 'divisi', width: 28 },
    { header: 'Jenis Ajuan', key: 'jenis', width: 18 },
    { header: 'Nominal', key: 'nominal', width: 16 },
    { header: 'Status Dirkeu', key: 'status_dirkeu', width: 22 },
    { header: 'Catatan Dirkeu', key: 'catatan_dirkeu', width: 32 },
    { header: 'Status', key: 'status', width: 22 },
    { header: 'Status LPJ', key: 'status_lpj', width: 20 },
    { header: 'Realisasi', key: 'realisasi', width: 16 },
    { header: 'Selisih', key: 'selisih', width: 16 },
    { header: 'Status Dana', key: 'status_dana', width: 20 },
    { header: 'Link Bukti TF', key: 'bukti', width: 42 },
    { header: 'Link Memo', key: 'link_memo', width: 42 },
    { header: 'Link LPJ', key: 'link_lpj', width: 42 }
  ];
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = {
    from: 'A1',
    to: 'U1'
  };
  rows.forEach((row) => {
    sheet.addRow({
      id: row.id_ajuan,
      tanggal: new Date(row.tanggal_ajuan).toISOString().slice(0, 10),
      pengaju: row.nama_pengaju,
      rekening: row.nama_penerima_dana || '',
      bank: row.nama_bank || '',
      nomor_rekening: row.nomor_rekening || '',
      memo: row.nomor_memo || '',
      perihal: row.perihal || '',
      divisi: row.divisi_cabang,
      jenis: row.jenis_ajuan,
      nominal: row.nominal,
      status_dirkeu: row.review_status_dirkeu,
      catatan_dirkeu: row.review_note_dirkeu || '',
      status: row.status,
      status_lpj: row.status_lpj_turunan,
      realisasi: row.nominal_realisasi ?? '',
      selisih: row.selisih_dana,
      status_dana: row.status_dana,
      bukti: row.link_bukti_transfer || '',
      link_memo: row.link_memo_ajuan || '',
      link_lpj: row.link_lpj || ''
    });
  });
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).height = 24;
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F766E' }
  };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = { vertical: 'top', wrapText: true };
    });

    if (rowNumber > 1) {
      row.height = 30;
      const review = String(row.getCell('L').value || '');
      const status = String(row.getCell('N').value || '');
      const statusLpj = String(row.getCell('O').value || '');
      const statusDana = String(row.getCell('R').value || '');
      if (review.includes('Disetujui') || review.includes('Legacy')) row.getCell('L').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      if (review.includes('Menunggu')) row.getCell('L').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      if (review.includes('Tolak')) row.getCell('L').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      if (review.includes('Revisi')) row.getCell('L').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
      if (status.includes('Selesai') || status.includes('Tanpa Bukti')) row.getCell('N').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      if (status.includes('Menunggu')) row.getCell('N').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      if (statusLpj.includes('Sudah')) row.getCell('O').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      if (statusLpj.includes('Terlambat')) row.getCell('O').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      if (statusDana.includes('Defisit')) row.getCell('R').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      if (statusDana.includes('Surplus')) row.getCell('R').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    }
  });
  ['K', 'P', 'Q'].forEach((column) => {
    sheet.getColumn(column).numFmt = '"Rp" #,##0;[Red]-"Rp" #,##0';
  });
  ['S', 'T', 'U'].forEach((column) => {
    sheet.getColumn(column).font = { color: { argb: 'FF2563EB' }, underline: true };
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `rekap-ajuan-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
