# PRD Ajuan Pembayaran

## Tujuan

Memastikan Admin dapat mencatat dan mengelola ajuan pembayaran, sementara Direktur Keuangan dapat memisahkan pekerjaan yang membutuhkan keputusan dari seluruh data yang pernah diinput Admin.

## Peran

- **Admin** menginput, memperbaiki, mengajukan, mengarsipkan, dan melengkapi LPJ.
- **Dirkeu** melihat seluruh data Admin, memutuskan ajuan yang sudah diajukan, dan melengkapi bukti pembayaran.

## Tampilan Dirkeu

Halaman `/review-dirkeu` memiliki dua konteks yang tidak boleh tercampur:

1. **Menunggu Review** hanya berisi ajuan aktif dengan tahap `submitted` dan status `Menunggu Review Dirkeu`. Tombolnya mengarahkan Dirkeu untuk mengambil keputusan.
2. **Semua Input Admin** berisi seluruh data aktif maupun arsip yang diinput Admin, termasuk draft, revisi, ditolak, disetujui, legacy finance, dan antrean review. Setiap baris harus diberi penanda apakah masih memerlukan approval, hanya riwayat, atau sudah menjadi arsip.

Filter tahun, cabang, rentang tanggal, kata kunci, dan pagination harus tetap berlaku di kedua konteks.

Dashboard Dirkeu juga menampilkan ringkasan keuangan keseluruhan yang mencakup data aktif dan arsip sesuai filter: jumlah seluruh ajuan beserta total nominalnya, jumlah LPJ terunggah, serta total dan jumlah ajuan yang sudah memiliki realisasi.

Setiap daftar ajuan pada tampilan Dirkeu menampilkan total hasil sesuai filter. Setiap baris memperlihatkan status `Sudah LPJ`, `Belum LPJ`, atau `LPJ Tidak Wajib`, serta nominal ajuan dan nominal realisasi. Realisasi yang belum diinput harus ditulis `Belum diisi`, bukan dianggap nol.

## Kriteria Penerimaan

- Dirkeu dapat membuka `Semua Input Admin` dari kartu ringkasan maupun filter Data.
- Jumlah pada kartu `Semua Input Admin` mencakup data aktif dan arsip sesuai filter halaman.
- Ringkasan Dirkeu menampilkan total seluruh ajuan dan total nominalnya.
- Ringkasan Dirkeu menampilkan jumlah LPJ dengan status `Sudah Upload`.
- Ringkasan Dirkeu menampilkan total nominal realisasi dan jumlah ajuan yang sudah mengisi realisasi.
- Kepala daftar menampilkan total ajuan sesuai konteks dan filter aktif.
- Setiap baris ajuan menampilkan status LPJ yang eksplisit.
- Setiap baris ajuan menampilkan nominal realisasi atau keterangan `Belum diisi`.
- Ajuan yang menunggu keputusan diberi label `Perlu Approval Dirkeu` dan tombol `Buka Detail Review`.
- Data yang tidak menunggu keputusan diberi label `Riwayat Input Admin`.
- Data arsip diberi label `Arsip Admin`.
- Tampilan default tetap `Menunggu Review` agar pekerjaan approval tidak tertutup oleh riwayat.
- Login, pembatasan role, detail review, upload bukti, dan fitur Admin tidak berubah.
