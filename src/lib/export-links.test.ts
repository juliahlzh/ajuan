import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { exportAttachmentLinks, setAttachmentHyperlink } from './export-links';

describe('Excel attachment links', () => {
  it('resolves private file paths to the application and keeps external links', () => {
    expect(exportAttachmentLinks('["/api/files/ajuan-files/memo/file%20one.pdf","https://example.com/lpj.pdf"]', 'https://ajuan-pembayaran.vercel.app'))
      .toEqual(['https://ajuan-pembayaran.vercel.app/api/files/ajuan-files/memo/file%20one.pdf', 'https://example.com/lpj.pdf']);
    expect(exportAttachmentLinks(null, 'https://ajuan-pembayaran.vercel.app')).toEqual([]);
    expect(exportAttachmentLinks('javascript:alert(1)', 'https://ajuan-pembayaran.vercel.app')).toEqual([]);
  });

  it('retains clickable hyperlinks after XLSX serialization and reopening', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Rekap Ajuan');
    const url = 'https://ajuan-pembayaran.vercel.app/api/files/ajuan-files/memo/file.jpeg';
    setAttachmentHyperlink(sheet.getCell('A1'), url, 'Buka Memo');
    const exported = await workbook.xlsx.writeBuffer();
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(exported);
    const cell = reopened.getWorksheet('Rekap Ajuan')!.getCell('A1');
    expect(cell.hyperlink).toBe(url);
    expect(cell.text).toBe('Buka Memo');
    expect(cell.font.underline).toBe(true);
  });
});
