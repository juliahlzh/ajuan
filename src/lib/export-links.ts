import type ExcelJS from 'exceljs';
import { parseAttachmentLinks } from './attachments';

export function exportAttachmentLinks(value: string | null | undefined, origin: string) {
  return parseAttachmentLinks(value).flatMap((link) => {
    try {
      const url = new URL(link.trim(), origin);
      return ['http:', 'https:'].includes(url.protocol) ? [url.href] : [];
    } catch {
      return [];
    }
  });
}

export function setAttachmentHyperlink(cell: ExcelJS.Cell, url: string, text: string) {
  cell.value = { text, hyperlink: url, tooltip: 'Klik untuk membuka lampiran di browser' };
  cell.font = { color: { argb: 'FF2563EB' }, underline: true };
}
