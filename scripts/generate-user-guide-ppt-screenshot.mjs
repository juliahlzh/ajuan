import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.HOME = process.env.HOME || "C:/Users/LENOVO";

const projectRoot = "D:/Ajuan";
const workspaceDir = path.join(projectRoot, "outputs", "ppt-work", "panduan-ajuan-web");
const tmpDir = path.join(workspaceDir, "tmp");
const previewDir = path.join(tmpDir, "preview");
const layoutDir = path.join(tmpDir, "layout");
const qaDir = path.join(tmpDir, "qa");
const assetDir = path.join(tmpDir, "assets");
const outputPath = path.join(projectRoot, "outputs", "Panduan_Ajuan_Pembayaran_Admin_Dirkeu_Screenshot.pptx");

async function writeBlob(filePath, blob) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

function addText(slide, text, position, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position,
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 }
  });
  shape.text = text;
  shape.text.style = style;
  return shape;
}

function addCard(slide, position, options = {}) {
  return slide.shapes.add({
    geometry: "roundRect",
    position,
    fill: options.fill || "white",
    line: { style: "solid", fill: options.line || "#d7e1ea", width: 1 },
    borderRadius: options.radius || "rounded-2xl",
    shadow: options.shadow || "shadow-sm"
  });
}

function addBulletList(slide, items, left, top, width, color = "#0f766e") {
  let offset = top;
  for (const item of items) {
    slide.shapes.add({
      geometry: "ellipse",
      position: { left, top: offset + 7, width: 10, height: 10 },
      fill: item.color || color,
      line: { style: "solid", fill: item.color || color, width: 0 }
    });
    addText(
      slide,
      item.text,
      { left: left + 20, top: offset, width, height: item.height || 44 },
      { fontSize: item.fontSize || 18, color: item.textColor || "#334155", bold: false }
    );
    offset += item.gap || 48;
  }
}

function addFooter(slide, page, title = "Panduan Ajuan Pembayaran") {
  addText(
    slide,
    `${title} • Slide ${page}`,
    { left: 72, top: 684, width: 420, height: 18 },
    { fontSize: 11, color: "#64748b", bold: true }
  );
}

async function addShot(slide, imagePath, position, options = {}) {
  const image = slide.images.add({
    blob: await fs.readFile(imagePath),
    alt: options.alt || path.basename(imagePath),
    fit: options.fit || "contain",
    geometry: options.geometry || "roundRect",
    borderRadius: options.radius || "rounded-2xl",
    shadow: options.shadow || "shadow-sm"
  });
  image.position = position;
  return image;
}

function addSectionTitle(slide, eyebrow, title, subtitle) {
  addText(slide, eyebrow, { left: 72, top: 52, width: 320, height: 24 }, { fontSize: 12, bold: true, color: "#0f766e" });
  addText(slide, title, { left: 72, top: 80, width: 620, height: 54 }, { fontSize: 30, bold: true, color: "#0f172a" });
  if (subtitle) {
    addText(slide, subtitle, { left: 72, top: 128, width: 700, height: 34 }, { fontSize: 17, color: "#64748b" });
  }
}

async function main() {
  const utilsModule = await import(
    pathToFileURL(
      "C:/Users/LENOVO/.codex/plugins/cache/openai-primary-runtime/presentations/26.614.11602/skills/Presentations/scripts/artifact_tool_utils.mjs"
    ).href
  );
  const { ensureArtifactToolWorkspace, importArtifactTool } = utilsModule;

  await fs.mkdir(tmpDir, { recursive: true });
  await fs.mkdir(qaDir, { recursive: true });
  await fs.mkdir(previewDir, { recursive: true });
  await fs.mkdir(layoutDir, { recursive: true });

  const shots = {
    login: path.join(assetDir, "01-login.png"),
    adminDashboard: path.join(assetDir, "02-admin-dashboard.png"),
    adminInput: path.join(assetDir, "03-admin-input.png"),
    adminCekAjuan: path.join(assetDir, "04-admin-cek-ajuan.png"),
    adminUploadLpj: path.join(assetDir, "05-admin-upload-lpj.png"),
    dirkeuReview: path.join(assetDir, "06-dirkeu-review.png"),
    dirkeuDetail: path.join(assetDir, "07-dirkeu-detail.png"),
    dirkeuBukti: path.join(assetDir, "08-dirkeu-bukti.png")
  };

  await fs.writeFile(
    path.join(tmpDir, "source-notes.txt"),
    [
      "Sumber deck:",
      "1. Screenshot web production Ajuan Pembayaran pada 18 Juni 2026.",
      "2. URL aplikasi: https://ajuan-pembayaran.vercel.app",
      "3. Kredensial user yang diminta user untuk dicantumkan:",
      "   - Admin: finance / keuangannf",
      "   - Dirkeu: dirkeu / direkturkeuangan",
      "4. Workflow final:",
      "   - Admin input ajuan",
      "   - Admin ajukan ke Dirkeu",
      "   - Dirkeu review",
      "   - Jika disetujui, ajuan dianggap sudah dibayar",
      "   - Dirkeu dapat melengkapi bukti TF atau tandai tanpa bukti TF",
      "   - Admin upload LPJ dan realisasi bila diperlukan"
    ].join("\n"),
    "utf8"
  );

  await fs.writeFile(
    path.join(tmpDir, "slide-plan.txt"),
    [
      "Slide 1: Cover + highlight aplikasi",
      "Slide 2: Login + akun user",
      "Slide 3: Menu utama dan peran Admin",
      "Slide 4: Cara input ajuan Admin",
      "Slide 5: Cara cek ajuan, filter, edit, export",
      "Slide 6: Cara upload LPJ dan isi realisasi",
      "Slide 7: Menu utama dan peran Dirkeu",
      "Slide 8: Review Dirkeu dan kartu status klik",
      "Slide 9: Detail ajuan + keputusan Dirkeu",
      "Slide 10: Bukti transfer opsional + status akhir",
      "Slide 11: Ringkasan alur dan troubleshooting"
    ].join("\n"),
    "utf8"
  );

  await ensureArtifactToolWorkspace(workspaceDir);
  const { Presentation, PresentationFile } = await importArtifactTool(workspaceDir);

  const presentation = Presentation.create({
    slideSize: { width: 1280, height: 720 }
  });

  presentation.theme.colorScheme = {
    name: "Ajuan Guide Screenshot",
    themeColors: {
      accent1: "#0f766e",
      accent2: "#1d4ed8",
      accent3: "#f59e0b",
      accent4: "#dc2626",
      accent5: "#0891b2",
      accent6: "#8b5cf6",
      bg1: "#ffffff",
      bg2: "#eef6f7",
      tx1: "#0f172a",
      tx2: "#60708b",
      dk1: "#000000",
      dk2: "#1e293b",
      lt1: "#ffffff",
      lt2: "#d7e1ea",
      hlink: "#1d4ed8",
      folHlink: "#7c3aed"
    }
  };

  const slides = [];
  for (let i = 0; i < 11; i += 1) {
    const slide = presentation.slides.add();
    slide.background.fill = i === 0 ? "#f3fbfb" : "#f7fbfc";
    slides.push(slide);
  }

  // Slide 1
  addText(slides[0], "Panduan Lengkap\nAjuan Pembayaran", { left: 72, top: 72, width: 430, height: 110 }, { fontSize: 34, bold: true, color: "#0f172a" });
  addText(slides[0], "Tutorial user Admin dan Dirkeu\ndengan screenshot web terbaru", { left: 72, top: 190, width: 360, height: 60 }, { fontSize: 20, color: "#64748b" });
  addCard(slides[0], { left: 72, top: 286, width: 420, height: 160 }, { fill: "#ffffff", line: "#d8ebe6" });
  addText(slides[0], "Akun Login", { left: 102, top: 314, width: 200, height: 28 }, { fontSize: 22, bold: true, color: "#0f766e" });
  addBulletList(slides[0], [
    { text: "Admin: finance / keuangannf", height: 34, gap: 34 },
    { text: "Dirkeu: dirkeu / direkturkeuangan", height: 34, gap: 34 },
    { text: "Akses sesuai role masing-masing", height: 34 }
  ], 104, 354, 300, "#0f766e");
  await addShot(slides[0], shots.login, { left: 560, top: 72, width: 648, height: 576 }, { fit: "contain", radius: "rounded-3xl" });
  addFooter(slides[0], 1, "Panduan Ajuan Pembayaran Screenshot");

  // Slide 2
  addSectionTitle(slides[1], "MULAI DARI LOGIN", "1. Cara Masuk ke Aplikasi", "Login cukup sekali sesuai role. Centang opsi ingat login bila ingin tetap masuk di perangkat yang sama.");
  addCard(slides[1], { left: 72, top: 176, width: 430, height: 452 }, { fill: "#ffffff" });
  addText(slides[1], "Langkah Login", { left: 102, top: 206, width: 200, height: 28 }, { fontSize: 24, bold: true, color: "#0f172a" });
  addBulletList(slides[1], [
    { text: "Buka URL aplikasi Ajuan Pembayaran.", height: 42 },
    { text: "Masukkan username dan password sesuai role.", height: 52 },
    { text: "Centang 'ingat login saya 30 hari' jika diperlukan.", height: 60 },
    { text: "Klik tombol Masuk.", height: 42 },
    { text: "Jika menu tidak sesuai, logout lalu login ulang dengan akun yang benar.", height: 72 }
  ], 104, 258, 340, "#0f766e");
  addCard(slides[1], { left: 72, top: 648, width: 1136, height: 30 }, { fill: "#e6f6f3", line: "#b7e4dc" });
  addText(slides[1], "Admin dan Dirkeu menggunakan halaman login yang sama, tetapi menu setelah login akan berbeda sesuai role.", { left: 92, top: 653, width: 1080, height: 18 }, { fontSize: 12, bold: true, color: "#0f766e" });
  await addShot(slides[1], shots.login, { left: 540, top: 170, width: 620, height: 480 }, { fit: "contain" });
  addFooter(slides[1], 2);

  // Slide 3
  addSectionTitle(slides[2], "ROLE ADMIN", "2. Menu Utama Admin", "Admin berfokus pada input ajuan, monitoring dashboard, import sheet, dan upload LPJ.");
  await addShot(slides[2], shots.adminDashboard, { left: 72, top: 180, width: 700, height: 452 }, { fit: "contain" });
  addCard(slides[2], { left: 810, top: 180, width: 398, height: 452 }, { fill: "#ffffff" });
  addText(slides[2], "Yang Perlu Diperhatikan Admin", { left: 842, top: 212, width: 300, height: 48 }, { fontSize: 24, bold: true, color: "#0f172a" });
  addBulletList(slides[2], [
    { text: "Dashboard menampilkan total ajuan, menunggu review, LPJ, dan realisasi.", height: 62 },
    { text: "Menu Input Ajuan dipakai untuk membuat data baru.", height: 52 },
    { text: "Import Sheet dipakai jika ingin memasukkan data massal dari Excel/CSV.", height: 64 },
    { text: "LPJ dipakai untuk upload pertanggungjawaban dan isi realisasi dana.", height: 64 },
    { text: "Logout tersedia di kanan atas.", height: 42 }
  ], 844, 278, 320, "#1d4ed8");
  addFooter(slides[2], 3);

  // Slide 4
  addSectionTitle(slides[3], "ADMIN INPUT", "3. Cara Input Ajuan Baru", "Isi data inti dulu, lalu lengkapi LPJ dan lampiran memo jika diperlukan.");
  await addShot(slides[3], shots.adminInput, { left: 72, top: 178, width: 760, height: 470 }, { fit: "contain" });
  addCard(slides[3], { left: 860, top: 178, width: 348, height: 470 }, { fill: "#ffffff" });
  addText(slides[3], "Checklist Input", { left: 892, top: 210, width: 220, height: 30 }, { fontSize: 24, bold: true, color: "#0f766e" });
  addBulletList(slides[3], [
    { text: "Isi Tanggal Ajuan dan Nama Pengaju.", height: 44 },
    { text: "Pisahkan Atas Nama Rekening, Bank, dan Nomor Rekening.", height: 62 },
    { text: "Nominal otomatis mengikuti format rupiah.", height: 52 },
    { text: "Upload memo bisa lebih dari satu file bila memo terdiri dari beberapa halaman.", height: 74 },
    { text: "Ajuan baru tersimpan sebagai draft lalu diajukan ke Dirkeu setelah dicek admin.", height: 78 }
  ], 894, 260, 280, "#0f766e");
  addFooter(slides[3], 4);

  // Slide 5
  addSectionTitle(slides[4], "MONITORING ADMIN", "4. Cek Ajuan, Filter, Edit, dan Export", "Menu Dashboard / Cek Ajuan dipakai untuk memantau seluruh status dan tindak lanjut.");
  await addShot(slides[4], shots.adminCekAjuan, { left: 72, top: 176, width: 720, height: 470 }, { fit: "contain" });
  addCard(slides[4], { left: 822, top: 176, width: 386, height: 470 }, { fill: "#ffffff" });
  addText(slides[4], "Fungsi Utama", { left: 854, top: 208, width: 200, height: 28 }, { fontSize: 24, bold: true, color: "#1d4ed8" });
  addBulletList(slides[4], [
    { text: "Lihat KPI total ajuan, review Dirkeu, LPJ, dan realisasi.", height: 62 },
    { text: "Gunakan search, filter, dan urutan untuk mempercepat pencarian.", height: 62 },
    { text: "Buka detail memo dan edit ajuan bila ada revisi.", height: 54 },
    { text: "Gunakan Export Excel untuk rekap data yang sudah difilter.", height: 62 },
    { text: "Status Dirkeu dan status bayar bisa dipantau dalam satu layar.", height: 62 }
  ], 856, 256, 300, "#1d4ed8");
  addFooter(slides[4], 5);

  // Slide 6
  addSectionTitle(slides[5], "LPJ & REALISASI", "5. Upload LPJ dan Isi Total Dana Digunakan", "Admin tetap menangani LPJ agar surplus, defisit, atau sesuai bisa dihitung otomatis.");
  await addShot(slides[5], shots.adminUploadLpj, { left: 72, top: 188, width: 740, height: 420 }, { fit: "contain" });
  addCard(slides[5], { left: 842, top: 188, width: 366, height: 420 }, { fill: "#ffffff" });
  addText(slides[5], "Langkah Upload LPJ", { left: 874, top: 220, width: 220, height: 30 }, { fontSize: 24, bold: true, color: "#0f766e" });
  addBulletList(slides[5], [
    { text: "Cari ID ajuan dengan kotak pencarian agar lebih cepat.", height: 54 },
    { text: "Isi Total Dana Digunakan sesuai realisasi akhir.", height: 54 },
    { text: "Upload file LPJ JPG, PNG, atau PDF maksimal 10 MB.", height: 62 },
    { text: "Klik Upload LPJ untuk menyimpan file dan realisasi.", height: 62 },
    { text: "Dashboard akan menghitung selisih dan status dana otomatis.", height: 62 }
  ], 876, 266, 280, "#0f766e");
  addFooter(slides[5], 6);

  // Slide 7
  addSectionTitle(slides[6], "ROLE DIRKEU", "6. Menu Utama Dirkeu", "Dirkeu berfokus pada review ajuan dan pelengkapan bukti transfer.");
  addCard(slides[6], { left: 72, top: 182, width: 356, height: 444 }, { fill: "#ffffff" });
  addText(slides[6], "Hak Akses Dirkeu", { left: 102, top: 214, width: 220, height: 30 }, { fontSize: 24, bold: true, color: "#0f172a" });
  addBulletList(slides[6], [
    { text: "Menu Review Dirkeu untuk memutuskan ajuan.", height: 52, color: "#1d4ed8" },
    { text: "Menu Bukti TF untuk melengkapi file transfer atau menandai tanpa bukti.", height: 72, color: "#1d4ed8" },
    { text: "Dirkeu tidak menginput ajuan baru dan tidak mengupload LPJ.", height: 64, color: "#1d4ed8" },
    { text: "Setelah approve, ajuan otomatis dianggap sudah dibayar.", height: 62, color: "#1d4ed8" }
  ], 104, 262, 280, "#1d4ed8");
  await addShot(slides[6], shots.dirkeuReview, { left: 462, top: 182, width: 746, height: 444 }, { fit: "contain" });
  addFooter(slides[6], 7);

  // Slide 8
  addSectionTitle(slides[7], "REVIEW DIRKEU", "7. Filter Status Review Dirkeu", "Kartu status pada halaman Review Dirkeu sekarang bisa diklik untuk memfilter daftar di bawahnya.");
  await addShot(slides[7], shots.dirkeuReview, { left: 72, top: 178, width: 760, height: 458 }, { fit: "contain" });
  addCard(slides[7], { left: 860, top: 178, width: 348, height: 458 }, { fill: "#ffffff" });
  addText(slides[7], "Cara Pakai Kartu Status", { left: 892, top: 210, width: 250, height: 30 }, { fontSize: 24, bold: true, color: "#0f766e" });
  addBulletList(slides[7], [
    { text: "Klik Menunggu Review untuk fokus ke ajuan yang belum diputuskan.", height: 62 },
    { text: "Klik Perlu Revisi untuk melihat ajuan yang dikembalikan ke admin.", height: 72 },
    { text: "Klik Ditolak untuk histori ajuan yang sudah ditutup.", height: 62 },
    { text: "Klik Disetujui untuk melihat ajuan yang sudah dibayar oleh Dirkeu.", height: 72 },
    { text: "Filter keyword, tahun, dan cabang tetap bisa dipakai bersamaan.", height: 62 }
  ], 894, 258, 280, "#0f766e");
  addFooter(slides[7], 8);

  // Slide 9
  addSectionTitle(slides[8], "DETAIL KEPUTUSAN", "8. Buka Detail Ajuan dan Beri Keputusan", "Di halaman detail, Dirkeu dapat mengecek data rekening, nominal, memo, dan status pembayaran.");
  await addShot(slides[8], shots.dirkeuDetail, { left: 72, top: 178, width: 756, height: 458 }, { fit: "contain" });
  addCard(slides[8], { left: 856, top: 178, width: 352, height: 458 }, { fill: "#ffffff" });
  addText(slides[8], "Aksi di Halaman Detail", { left: 888, top: 210, width: 240, height: 30 }, { fontSize: 24, bold: true, color: "#1d4ed8" });
  addBulletList(slides[8], [
    { text: "Cek tanggal ajuan, cabang, nama pengaju, rekening, bank, dan nominal.", height: 72, color: "#1d4ed8" },
    { text: "Buka memo jika perlu verifikasi dokumen pengajuan.", height: 52, color: "#1d4ed8" },
    { text: "Jika status masih review aktif, pilih Setujui, Tolak, atau Minta Revisi.", height: 72, color: "#1d4ed8" },
    { text: "Catatan review akan terlihat kembali oleh admin.", height: 52, color: "#1d4ed8" },
    { text: "Approve sekarang berarti ajuan langsung dianggap dibayar.", height: 62, color: "#1d4ed8" }
  ], 890, 258, 280, "#1d4ed8");
  addFooter(slides[8], 9);

  // Slide 10
  addSectionTitle(slides[9], "BUKTI TF OPSIONAL", "9. Upload Bukti TF atau Tanpa Bukti", "Halaman ini khusus Dirkeu untuk melengkapi pembayaran setelah approve.");
  await addShot(slides[9], shots.dirkeuBukti, { left: 72, top: 178, width: 760, height: 458 }, { fit: "contain" });
  addCard(slides[9], { left: 860, top: 178, width: 348, height: 458 }, { fill: "#ffffff" });
  addText(slides[9], "Pilihan yang Tersedia", { left: 892, top: 210, width: 230, height: 30 }, { fontSize: 24, bold: true, color: "#0f766e" });
  addBulletList(slides[9], [
    { text: "Upload Bukti TF bila ada file transfer yang perlu dilampirkan.", height: 62 },
    { text: "Gunakan Tandai Tanpa Bukti TF bila memang tidak ada lampiran.", height: 64 },
    { text: "Admin bisa melihat update ini di dashboard Cek Ajuan.", height: 68 },
    { text: "Status akhir: Selesai Dibayar atau Dibayar Tanpa Bukti TF.", height: 68 }
  ], 894, 258, 280, "#0f766e");
  addFooter(slides[9], 10);

  // Slide 11
  addSectionTitle(slides[10], "RINGKASAN ALUR", "10. Alur Lengkap dan Troubleshooting", "Satu slide penutup untuk memastikan user cepat paham siapa mengerjakan apa.");
  addCard(slides[10], { left: 72, top: 176, width: 540, height: 430 }, { fill: "#ffffff" });
  addText(slides[10], "Alur Kerja Singkat", { left: 104, top: 210, width: 240, height: 30 }, { fontSize: 24, bold: true, color: "#0f172a" });
  addBulletList(slides[10], [
    { text: "Admin login, input ajuan, lalu simpan draft.", height: 52 },
    { text: "Admin cek ulang lalu ajukan ke Dirkeu.", height: 52 },
    { text: "Dirkeu review lalu pilih setujui, tolak, atau minta revisi.", height: 62 },
    { text: "Jika disetujui, ajuan langsung dianggap dibayar.", height: 62 },
    { text: "Dirkeu dapat melengkapi bukti TF atau tanpa bukti.", height: 62 },
    { text: "Admin upload LPJ dan isi realisasi bila wajib LPJ.", height: 62 }
  ], 106, 256, 390, "#0f766e");
  addCard(slides[10], { left: 652, top: 176, width: 556, height: 430 }, { fill: "#ffffff" });
  addText(slides[10], "Troubleshooting Cepat", { left: 684, top: 210, width: 260, height: 30 }, { fontSize: 24, bold: true, color: "#dc2626" });
  addBulletList(slides[10], [
    { text: "Menu tidak sesuai role: logout lalu login ulang.", height: 52, color: "#dc2626" },
    { text: "Ajuan tidak muncul di review: cek apakah admin sudah ajukan ke Dirkeu.", height: 72, color: "#dc2626" },
    { text: "Status sudah approve tapi belum ada bukti: buka menu Bukti TF untuk melengkapi lampiran.", height: 82, color: "#dc2626" },
    { text: "Perlu cek banyak data: gunakan filter, search, sort, dan export Excel.", height: 72, color: "#dc2626" }
  ], 686, 256, 400, "#dc2626");
  addCard(slides[10], { left: 72, top: 626, width: 1136, height: 34 }, { fill: "#0f766e", line: "#0f766e" });
  addText(slides[10], "Panduan ini bisa langsung dibagikan ke Admin dan Dirkeu sebagai panduan operasional harian.", { left: 102, top: 634, width: 1030, height: 16 }, { fontSize: 14, bold: true, color: "#ffffff" });
  addFooter(slides[10], 11);

  for (const [index, slide] of slides.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await writeBlob(path.join(previewDir, `${stem}.png`), png);
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(layoutDir, `${stem}.layout.json`), await layout.text(), "utf8");
  }

  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await writeBlob(path.join(previewDir, "deck-montage.webp"), montage);

  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(outputPath);

  await fs.writeFile(
    path.join(qaDir, "visual-qa.txt"),
    [
      "QA summary:",
      "- Slide count: 11",
      "- Screenshot login, admin, LPJ, review dirkeu, detail, dan bukti TF sudah dimasukkan",
      "- Kredensial Admin dan Dirkeu dicantumkan sesuai permintaan user",
      "- Final PPTX dibuat editable dengan shape, text, dan image native",
      `- Final PPTX: ${outputPath}`
    ].join("\n"),
    "utf8"
  );

  console.log(outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});



