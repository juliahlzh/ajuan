'use client';

import { useState } from 'react';
import { Save, RotateCcw, Send } from 'lucide-react';
import type { AjuanView } from '@/lib/types';
import { parseAttachmentLinks } from '@/lib/attachments';
import { paymentStatusOptions, statusLpjOptions } from '@/lib/options';
import { CurrencyInput } from './CurrencyInput';

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  ajuan?: AjuanView | null;
  divisiOptions: string[];
  mode: 'create' | 'edit';
  allowPaymentStatus?: boolean;
  allowLegacyBypass?: boolean;
};

function valueDate(value?: string | Date | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export function AjuanForm({ action, ajuan, divisiOptions, mode, allowPaymentStatus = false, allowLegacyBypass = mode === 'create' }: Props) {
  const memoLinks = parseAttachmentLinks(ajuan?.link_memo_ajuan);
  const [skipDirkeuApproval, setSkipDirkeuApproval] = useState(false);
  const canEditPaymentStatus = allowPaymentStatus || (allowLegacyBypass && skipDirkeuApproval);

  return (
    <form action={action} className="space-y-6 pb-28">
      <section className="panel p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="section-title">Data Ajuan</h2>
            <p className="section-note">Pisahkan nama pengaju dan atas nama rekening supaya rekap tidak tertukar.</p>
          </div>
          <div className="panel-muted max-w-sm">
            {mode === 'create' ? 'Lengkapi data inti lebih dulu, lalu lanjut ke LPJ dan lampiran.' : 'Periksa ulang status Dirkeu sebelum mengubah data utama ajuan.'}
          </div>
        </div>
        {ajuan ? (
          <div className="panel-muted mt-4">
            Status Dirkeu saat ini: <span className="font-black text-slate-900">{ajuan.review_status_dirkeu}</span>
            {ajuan.review_note_dirkeu ? ` | Catatan: ${ajuan.review_note_dirkeu}` : ''}
          </div>
        ) : (
          <div className="panel-muted mt-4 border-teal-100 bg-teal-50 text-teal-900">
            Ajuan baru akan disimpan sebagai draft, lalu diajukan ke Dirkeu setelah dicek admin.
          </div>
        )}
        {!allowPaymentStatus && allowLegacyBypass ? (
          <label className="panel-muted mt-4 flex items-start gap-3 border-amber-100 bg-amber-50 text-amber-950">
            <input
              className="mt-1 h-4 w-4 rounded border-slate-300"
              type="checkbox"
              name="skip_dirkeu_approval"
              checked={skipDirkeuApproval}
              onChange={(event) => setSkipDirkeuApproval(event.target.checked)}
            />
            <span className="text-sm font-semibold">
              Centang jika ini <span className="font-black">data yang sudah ditransfer Dirkeu / tidak perlu diajukan lagi</span>.
              Saat dicentang, Admin bisa langsung memilih status pembayaran dan ajuan akan masuk sebagai data finance/manual.
            </span>
          </label>
        ) : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">Tanggal Ajuan</span>
            <input className="field" type="date" name="tanggal_ajuan" required defaultValue={valueDate(ajuan?.tanggal_ajuan)} />
          </label>
          <label>
            <span className="label">Nama Pengaju</span>
            <input className="field" name="nama_pengaju" required defaultValue={ajuan?.nama_pengaju || ''} placeholder="Contoh: Andi" />
          </label>
          <label>
            <span className="label">Atas Nama Rekening</span>
            <input className="field" name="nama_penerima_dana" defaultValue={ajuan?.nama_penerima_dana || ''} placeholder="Nama penerima dana / rekening" />
          </label>
          <label>
            <span className="label">Bank</span>
            <input className="field" name="nama_bank" defaultValue={ajuan?.nama_bank || ''} placeholder="Contoh: BCA / Mandiri / BNI" />
          </label>
          <label>
            <span className="label">Nomor Rekening</span>
            <input className="field" name="nomor_rekening" defaultValue={ajuan?.nomor_rekening || ''} placeholder="Contoh: 1234567890" inputMode="numeric" />
          </label>
          <label>
            <span className="label">Nomor Memo</span>
            <input className="field" name="nomor_memo" defaultValue={ajuan?.nomor_memo || ''} placeholder="Contoh: 204/S.Pm/Div.MCX/SA/II/2026" />
          </label>
          <label>
            <span className="label">Perihal</span>
            <input className="field" name="perihal" defaultValue={ajuan?.perihal || ''} placeholder="Contoh: Pengajuan Revenue Sharing" />
          </label>
          <label>
            <span className="label">Divisi / Cabang</span>
            <input className="field" name="divisi_cabang" list="divisi-list" required defaultValue={ajuan?.divisi_cabang || ''} placeholder="Pilih dari list atau ketik manual" />
            <datalist id="divisi-list">
              {divisiOptions.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
          <label>
            <span className="label">Jenis Ajuan</span>
            <input className="field" name="jenis_ajuan" required defaultValue={ajuan?.jenis_ajuan || ''} placeholder="Contoh: Reimburse / Kegiatan" />
          </label>
          <label>
            <span className="label">Nominal Ajuan</span>
            <CurrencyInput name="nominal" required defaultValue={ajuan?.nominal || 0} />
          </label>
          <label>
            <span className="label">Status Pembayaran</span>
            <select
              className="field"
              name="status"
              defaultValue={ajuan?.status || 'Menunggu Pembayaran'}
              disabled={!canEditPaymentStatus}
            >
              {paymentStatusOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            {!canEditPaymentStatus ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">Status pembayaran baru bisa diubah setelah ajuan masuk ke tahap finance, atau centang opsi data sudah dibayar di atas.</p>
            ) : !allowPaymentStatus && allowLegacyBypass && skipDirkeuApproval ? (
              <p className="mt-2 text-xs font-semibold text-amber-700">Ajuan ini akan disimpan sebagai data finance/manual dan tidak perlu diajukan ke Dirkeu.</p>
            ) : null}
          </label>
          <label className="md:col-span-2">
            <span className="label">Keterangan</span>
            <textarea className="field min-h-28" name="keterangan" defaultValue={ajuan?.keterangan || ''} placeholder="Tambahkan detail ajuan bila perlu" />
          </label>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="section-title">LPJ dan Realisasi</h2>
        <p className="section-note">Realisasi boleh diisi sekarang atau saat upload LPJ nanti. Selisih dihitung otomatis.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">Wajib LPJ</span>
            <select className="field" name="wajib_lpj" defaultValue={ajuan?.wajib_lpj === false ? 'false' : 'true'}>
              <option value="true">Ya</option>
              <option value="false">Tidak</option>
            </select>
          </label>
          <label>
            <span className="label">Tanggal Jatuh Tempo LPJ</span>
            <input className="field" type="date" name="tanggal_jatuh_tempo_lpj" defaultValue={valueDate(ajuan?.tanggal_jatuh_tempo_lpj)} />
          </label>
          <label>
            <span className="label">Status LPJ</span>
            <select className="field" name="status_lpj" defaultValue={ajuan?.status_lpj || 'Belum Upload'}>
              {statusLpjOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Total Dana Digunakan</span>
            <CurrencyInput name="nominal_realisasi" defaultValue={ajuan?.nominal_realisasi ?? ''} placeholder="Opsional" />
          </label>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="section-title">Lampiran</h2>
        <p className="section-note">Upload memo jpg/png/pdf. Bisa pilih lebih dari satu file untuk memo yang terdiri dari beberapa halaman.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">Upload Foto Memo Ajuan</span>
            <input className="field" type="file" name="memo" accept=".jpg,.jpeg,.png,.pdf" multiple />
            <p className="mt-2 text-xs font-semibold text-slate-500">Boleh pilih banyak file sekaligus. Sistem akan menyimpan semua halaman memo.</p>
          </label>
          {memoLinks.length ? (
            <div>
              <span className="label">Memo Saat Ini</span>
              <div className="flex flex-wrap gap-2">
                {memoLinks.map((link, index) => (
                  <a key={`${link}-${index}`} className="btn-secondary" href={link} target="_blank" rel="noreferrer">
                    Memo {index + 1}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[color:var(--line)] bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold text-[color:var(--muted)]">
            {mode === 'create' ? 'Simpan ajuan setelah semua kolom wajib terisi.' : 'Perubahan akan langsung memperbarui data ajuan yang aktif.'}
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" type="reset"><RotateCcw size={17} /> Reset</button>
            {mode === 'create' && !skipDirkeuApproval ? (
              <button className="btn-secondary" type="submit" name="submit_intent" value="submit_dirkeu">
                <Send size={17} /> Simpan & Kirim ke Dirkeu
              </button>
            ) : null}
            <button className="btn-primary" type="submit" name="submit_intent" value="save_draft">
              <Save size={17} /> {mode === 'create' ? 'Simpan Ajuan' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
