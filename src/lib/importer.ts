import ExcelJS from 'exceljs';

type ImportRow = {
  id_ajuan?: string;
  tanggal_ajuan: string;
  nama_pengaju: string;
  nama_penerima_dana?: string;
  nama_bank?: string;
  nomor_rekening?: string;
  nomor_memo?: string;
  perihal?: string;
  divisi_cabang: string;
  jenis_ajuan: string;
  nominal: number;
  keterangan?: string;
  status?: string;
  link_bukti_transfer?: string;
  link_memo_ajuan?: string;
  wajib_lpj?: boolean;
  tanggal_jatuh_tempo_lpj?: string;
  status_lpj?: string;
  link_lpj?: string;
  nominal_realisasi?: number | null;
};

const SKIP_KPI_SHEETS = new Set(['Rekap', 'Lokasi', 'Sheet4', 'Sheet12', 'Sheet2', 'Promas_detail', 'ART', 'ART PUSAT']);

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'text' in value) return String((value as { text: unknown }).text || '');
  if (typeof value === 'object' && 'hyperlink' in value) return String((value as { hyperlink: unknown }).hyperlink || '');
  if (typeof value === 'object' && 'result' in value) return cellText((value as { result: unknown }).result);
  return String(value).trim();
}

function toIsoDate(value: unknown) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = cellText(value);
  if (!text) return '';
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return value;
  return Number(cellText(value).replaceAll(',', '')) || 0;
}

function rowValues(row: ExcelJS.Row) {
  const values: unknown[] = [];
  for (let i = 1; i <= row.cellCount; i += 1) values.push(row.getCell(i).value);
  return values;
}

function rowsAsObjects(sheet: ExcelJS.Worksheet) {
  const header = rowValues(sheet.getRow(1)).map(cellText);
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item: Record<string, unknown> = {};
    let hasValue = false;
    header.forEach((key, index) => {
      if (!key) return;
      const value = row.getCell(index + 1).value;
      if (cellText(value)) hasValue = true;
      item[key] = value;
    });
    if (hasValue) rows.push(item);
  });
  return rows;
}

function parseKegiatan(sheet: ExcelJS.Worksheet): ImportRow[] {
  const rows = rowsAsObjects(sheet);
  let lastTanggal = '';
  let lastDivisi = '';
  return rows
    .map((r) => {
      const tanggal = toIsoDate(r.Tanggal) || lastTanggal;
      const divisi = cellText(r['Divisi/Departemen']) || lastDivisi;
      if (tanggal) lastTanggal = tanggal;
      if (divisi) lastDivisi = divisi;
      return {
        tanggal_ajuan: tanggal,
        nama_pengaju: '-',
        nama_penerima_dana: cellText(r['Rekening an.']),
        divisi_cabang: divisi || cellText(r.Wilayah) || '-',
        jenis_ajuan: 'Kegiatan',
        nominal: numberValue(r.Nominal),
        perihal: cellText(r.Keterangan),
        keterangan: cellText(r.Keterangan),
        link_memo_ajuan: cellText(r.Ajuan),
        link_bukti_transfer: cellText(r['Bukti TF']),
        wajib_lpj: true,
        status_lpj: 'Belum Upload'
      };
    })
    .filter((r) => r.tanggal_ajuan && r.nominal > 0);
}

function parseKpiWorkbook(workbook: ExcelJS.Workbook): ImportRow[] {
  const result: ImportRow[] = [];
  const seen = new Set<string>();

  workbook.worksheets.forEach((sheet) => {
    if (SKIP_KPI_SHEETS.has(sheet.name)) return;
    for (let r = 1; r <= Math.min(sheet.rowCount, 80); r += 1) {
      const row = sheet.getRow(r);
      for (let c = 1; c <= Math.min(row.cellCount, 80); c += 1) {
        const first = cellText(row.getCell(c).value).toLowerCase();
        const second = cellText(row.getCell(c + 1).value).toLowerCase();
        const third = cellText(row.getCell(c + 2).value).toLowerCase();
        if (first !== 'tanggal ajuan' || second !== 'keterangan' || third !== 'ajuan') continue;

        let lastTanggal = '';
        let emptyStreak = 0;
        for (let body = r + 1; body <= sheet.rowCount; body += 1) {
          const bodyRow = sheet.getRow(body);
          const tanggalRaw = bodyRow.getCell(c).value;
          const ketRaw = bodyRow.getCell(c + 1).value;
          const nominalRaw = bodyRow.getCell(c + 2).value;
          const tglTfRaw = bodyRow.getCell(c + 3).value;
          const namaRaw = bodyRow.getCell(c + 4).value;
          const realisasiRaw = bodyRow.getCell(c + 5).value;
          const wilayahRaw = bodyRow.getCell(c + 7).value;
          if (![tanggalRaw, ketRaw, nominalRaw, namaRaw, wilayahRaw].some((value) => cellText(value))) {
            emptyStreak += 1;
            if (emptyStreak >= 25) break;
            continue;
          }
          emptyStreak = 0;
          const tanggal = toIsoDate(tanggalRaw) || lastTanggal;
          if (tanggal) lastTanggal = tanggal;
          const keterangan = cellText(ketRaw);
          const nominal = numberValue(nominalRaw);
          const namaPenerima = cellText(namaRaw);
          const divisi = cellText(wilayahRaw) || sheet.name;
          if (!tanggal || (!keterangan && !nominal)) continue;
          const key = [tanggal, keterangan, nominal, divisi, namaPenerima].join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          result.push({
            tanggal_ajuan: tanggal,
            nama_pengaju: '-',
            nama_penerima_dana: namaPenerima,
            divisi_cabang: divisi,
            jenis_ajuan: sheet.name,
            nominal,
            perihal: keterangan,
            keterangan,
            status: toIsoDate(tglTfRaw) ? 'Selesai Dibayar' : 'Menunggu Pembayaran',
            nominal_realisasi: cellText(realisasiRaw) ? numberValue(realisasiRaw) : null,
            wajib_lpj: true,
            status_lpj: 'Belum Upload'
          });
        }
      }
    }
  });

  return result;
}

function parseGeneric(sheet: ExcelJS.Worksheet): ImportRow[] {
  return rowsAsObjects(sheet)
    .map((r) => ({
      id_ajuan: cellText(r.id_ajuan),
      tanggal_ajuan: toIsoDate(r.tanggal_ajuan),
      nama_pengaju: cellText(r.nama_pengaju) || '-',
      nama_penerima_dana: cellText(r.nama_penerima_dana) || cellText(r.atas_nama_rekening),
      nama_bank: cellText(r.nama_bank) || cellText(r.bank),
      nomor_rekening: cellText(r.nomor_rekening) || cellText(r.norek),
      divisi_cabang: cellText(r.divisi_cabang),
      jenis_ajuan: cellText(r.jenis_ajuan),
      nominal: numberValue(r.nominal),
      keterangan: cellText(r.keterangan),
      status: cellText(r.status) || 'Menunggu Pembayaran',
      link_bukti_transfer: cellText(r.link_bukti_transfer),
      link_memo_ajuan: cellText(r.link_memo_ajuan),
      wajib_lpj: cellText(r.wajib_lpj || '1') !== '0',
      tanggal_jatuh_tempo_lpj: toIsoDate(r.tanggal_jatuh_tempo_lpj),
      status_lpj: cellText(r.status_lpj) || 'Belum Upload',
      link_lpj: cellText(r.link_lpj),
      nominal_realisasi: cellText(r.nominal_realisasi) ? numberValue(r.nominal_realisasi) : null
    }))
    .filter((r) => r.tanggal_ajuan && r.divisi_cabang && r.jenis_ajuan);
}

async function parseCsv(file: File): Promise<ImportRow[]> {
  const text = await file.text();
  const [headerLine, ...lines] = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map((item) => item.trim());
  const rows = lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('CSV');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(headers.map((header) => row[header])));
  return parseGeneric(sheet);
}

export async function parseImportWorkbook(file: File): Promise<ImportRow[]> {
  if (file.name.toLowerCase().endsWith('.csv')) return parseCsv(file);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await file.arrayBuffer()) as any);
  const kegiatan = workbook.getWorksheet('Kegiatan');
  if (kegiatan) {
    const parsed = parseKegiatan(kegiatan);
    if (parsed.length) return parsed;
  }
  const kpiRows = parseKpiWorkbook(workbook);
  if (kpiRows.length) return kpiRows;
  return parseGeneric(workbook.worksheets[0]);
}
