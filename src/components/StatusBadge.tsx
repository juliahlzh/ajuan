import clsx from 'clsx';

const paymentTone: Record<string, string> = {
  'Menunggu Pembayaran': 'bg-amber-100 text-amber-800 ring-amber-200',
  Diproses: 'bg-blue-100 text-blue-800 ring-blue-200',
  'Selesai Dibayar': 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'Dibayar Tanpa Bukti TF': 'bg-cyan-100 text-cyan-800 ring-cyan-200'
};

const lpjTone: Record<string, string> = {
  'Belum Upload': 'bg-slate-100 text-slate-700 ring-slate-200',
  'Sudah Upload': 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'Tidak Wajib': 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  Terlambat: 'bg-red-100 text-red-800 ring-red-200',
  'Jatuh Tempo': 'bg-amber-100 text-amber-800 ring-amber-200',
  'Belum Jatuh Tempo': 'bg-blue-100 text-blue-800 ring-blue-200'
};

const fundTone: Record<string, string> = {
  Surplus: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Defisit: 'bg-red-100 text-red-800 ring-red-200',
  Sesuai: 'bg-blue-100 text-blue-800 ring-blue-200',
  'Belum Input Realisasi': 'bg-slate-100 text-slate-700 ring-slate-200'
};

const reviewTone: Record<string, string> = {
  'Belum Diajukan': 'bg-slate-100 text-slate-700 ring-slate-200',
  'Menunggu Review Dirkeu': 'bg-amber-100 text-amber-800 ring-amber-200',
  'Disetujui Dirkeu': 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'Ditolak Dirkeu': 'bg-red-100 text-red-800 ring-red-200',
  'Perlu Revisi': 'bg-orange-100 text-orange-800 ring-orange-200',
  'Legacy Finance': 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  'Selesai Dibayar': 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  'Dibayar Tanpa Bukti TF': 'bg-cyan-100 text-cyan-800 ring-cyan-200'
};

export function StatusBadge({ value, type = 'payment' }: { value: string; type?: 'payment' | 'lpj' | 'fund' | 'review' }) {
  const tone = type === 'lpj' ? lpjTone[value] : type === 'fund' ? fundTone[value] : type === 'review' ? reviewTone[value] : paymentTone[value];
  return (
    <span className={clsx('inline-flex max-w-[9rem] items-center justify-center rounded-full px-3 py-1 text-center text-[11px] font-black leading-tight ring-1', tone || 'bg-slate-100 text-slate-700 ring-slate-200')}>
      {value}
    </span>
  );
}
