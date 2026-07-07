import type { StatusLpj, StatusPembayaran } from './types';

export const paymentStatusOptions: StatusPembayaran[] = [
  'Menunggu Pembayaran',
  'Diproses',
  'Selesai Dibayar',
  'Dibayar Tanpa Bukti TF'
];

export const statusLpjOptions: StatusLpj[] = ['Belum Upload', 'Sudah Upload', 'Tidak Wajib'];
