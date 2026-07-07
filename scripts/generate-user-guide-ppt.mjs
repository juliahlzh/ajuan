import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.HOME = process.env.HOME || "C:/Users/LENOVO";

const projectRoot = "D:/Ajuan";
const workspaceDir = path.join(projectRoot, "outputs", "ppt-work", "panduan-ajuan");
const previewDir = path.join(workspaceDir, "tmp", "preview");
const layoutDir = path.join(workspaceDir, "tmp", "layout");
const qaDir = path.join(workspaceDir, "tmp", "qa");
const outputPath = path.join(projectRoot, "outputs", "Panduan_Ajuan_Pembayaran_Admin_Dirkeu.pptx");

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
    borderRadius: "rounded-2xl",
    shadow: options.shadow || "shadow-sm"
  });
}

function addBulletList(slide, items, left, top, width) {
  let offset = top;
  for (const item of items) {
    slide.shapes.add({
      geometry: "ellipse",
      position: { left, top: offset + 7, width: 10, height: 10 },
      fill: item.color || "#0f766e",
      line: { style: "solid", fill: item.color || "#0f766e", width: 0 }
    });
    addText(
      slide,
      item.text,
      { left: left + 20, top: offset, width, height: item.height || 44 },
      { fontSize: 20, color: "#334155", bold: false }
    );
    offset += item.gap || 54;
  }
}

function addFooter(slide, page) {
  addText(
    slide,
    `Panduan Ajuan Pembayaran • Slide ${page}`,
    { left: 72, top: 676, width: 360, height: 20 },
    { fontSize: 11, color: "#64748b", bold: true }
  );
}

async function main() {
  const utilsModule = await import(
    pathToFileURL(
      "C:/Users/LENOVO/.codex/plugins/cache/openai-primary-runtime/presentations/26.614.11602/skills/Presentations/scripts/artifact_tool_utils.mjs"
    ).href
  );
  const { ensureArtifactToolWorkspace, importArtifactTool } = utilsModule;

  await fs.mkdir(path.join(workspaceDir, "tmp"), { recursive: true });
  await fs.mkdir(qaDir, { recursive: true });

  await fs.writeFile(
    path.join(workspaceDir, "tmp", "source-notes.txt"),
    [
      "Sumber utama:",
      "1. Requirement user pada thread Codex project D:/Ajuan.",
      "2. Kredensial user yang diminta tampil di deck:",
      "   - Admin: username finance / password keuangannf",
      "   - Dirkeu: username dirkeu / password direkturkeuangan",
      "3. Workflow final:",
      "   - Admin input ajuan",
      "   - Admin ajukan ke Dirkeu",
      "   - Dirkeu review",
      "   - Jika disetujui, ajuan masuk proses pembayaran",
      "   - Dirkeu dapat upload bukti TF atau tandai Dibayar Tanpa Bukti TF",
      "   - Admin melihat hasil dari dashboard"
    ].join("\n"),
    "utf8"
  );

  await fs.writeFile(
    path.join(workspaceDir, "tmp", "slide-plan.txt"),
    [
      "Slide 1: Cover deck",
      "Slide 2: Login dan kredensial",
      "Slide 3: Pembagian role",
      "Slide 4: Alur Admin",
      "Slide 5: Langkah kerja Admin",
      "Slide 6: Alur Dirkeu",
      "Slide 7: Bukti TF opsional dan status akhir",
      "Slide 8: Tips penggunaan dan troubleshooting"
    ].join("\n"),
    "utf8"
  );

  await ensureArtifactToolWorkspace(workspaceDir);
  const { Presentation, PresentationFile } = await importArtifactTool(workspaceDir);

  const presentation = Presentation.create({
    slideSize: { width: 1280, height: 720 }
  });

  presentation.theme.colorScheme = {
    name: "Ajuan Finance Guide",
    themeColors: {
      accent1: "#0f766e",
      accent2: "#1d4ed8",
      accent3: "#f59e0b",
      accent4: "#dc2626",
      accent5: "#7c3aed",
      accent6: "#0891b2",
      bg1: "#ffffff",
      bg2: "#eef6f7",
      tx1: "#14213d",
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
  for (let i = 0; i < 8; i += 1) {
    const slide = presentation.slides.add();
    slide.background.fill = i === 0 ? "#0f766e" : "#f7fbfc";
    slides.push(slide);
  }

  // Slide 1
  addText(slides[0], "Panduan Penggunaan\nAjuan Pembayaran", { left: 72, top: 110, width: 620, height: 180 }, { fontSize: 40, bold: true, color: "#ffffff" });
  addText(slides[0], "Untuk user Admin dan Dirkeu\nVersi workflow approval + pembayaran terbaru", { left: 72, top: 300, width: 500, height: 90 }, { fontSize: 22, color: "#d7f3ef", bold: false });
  addCard(slides[0], { left: 805, top: 104, width: 360, height: 230 }, { fill: "#ffffff", line: "#ffffff", shadow: "shadow-lg" });
  addText(slides[0], "Ringkasan Alur", { left: 840, top: 136, width: 220, height: 30 }, { fontSize: 22, bold: true, color: "#14213d" });
  addBulletList(slides[0], [
    { text: "Admin input dan ajukan", color: "#0f766e" },
    { text: "Dirkeu review dan setujui", color: "#1d4ed8" },
    { text: "Dirkeu proses pembayaran", color: "#f59e0b" },
    { text: "Admin memantau dari dashboard", color: "#0891b2", gap: 46 }
  ], 842, 184, 260);
  addText(slides[0], "Ajuan Pembayaran • Finance Control", { left: 72, top: 650, width: 420, height: 24 }, { fontSize: 13, bold: true, color: "#d7f3ef" });

  // Slide 2
  addText(slides[1], "1. Login dan Akun User", { left: 72, top: 56, width: 500, height: 48 }, { fontSize: 30, bold: true, color: "#14213d" });
  addText(slides[1], "Gunakan akun sesuai role agar menu yang tampil sesuai tugas masing-masing.", { left: 72, top: 102, width: 680, height: 30 }, { fontSize: 18, color: "#60708b" });
  addCard(slides[1], { left: 72, top: 160, width: 520, height: 238 }, { fill: "#ffffff" });
  addText(slides[1], "Akun Admin", { left: 104, top: 192, width: 180, height: 28 }, { fontSize: 24, bold: true, color: "#0f766e" });
  addBulletList(slides[1], [
    { text: "Username: finance", color: "#0f766e", gap: 44 },
    { text: "Password: keuangannf", color: "#0f766e", gap: 44 },
    { text: "Akses: Dashboard, Input Ajuan, Import Sheet, Upload LPJ", color: "#0f766e", height: 64, gap: 58 }
  ], 106, 240, 390);
  addCard(slides[1], { left: 640, top: 160, width: 520, height: 238 }, { fill: "#ffffff" });
  addText(slides[1], "Akun Dirkeu", { left: 672, top: 192, width: 180, height: 28 }, { fontSize: 24, bold: true, color: "#1d4ed8" });
  addBulletList(slides[1], [
    { text: "Username: dirkeu", color: "#1d4ed8", gap: 44 },
    { text: "Password: direkturkeuangan", color: "#1d4ed8", gap: 44 },
    { text: "Akses: Review Dirkeu dan Bukti TF", color: "#1d4ed8", height: 64, gap: 58 }
  ], 674, 240, 390);
  addCard(slides[1], { left: 72, top: 438, width: 1088, height: 164 }, { fill: "#eaf6f4", line: "#b7e4dc" });
  addText(slides[1], "Tips Login", { left: 104, top: 468, width: 180, height: 28 }, { fontSize: 22, bold: true, color: "#14213d" });
  addBulletList(slides[1], [
    { text: "Buka URL aplikasi lalu masukkan username dan password sesuai role.", color: "#0f766e", gap: 42 },
    { text: "Jika ingin tetap login, centang opsi ingat login selama 30 hari.", color: "#0f766e", gap: 42 },
    { text: "Jika menu tidak sesuai role, logout lalu login ulang memakai akun yang benar.", color: "#0f766e", height: 60 }
  ], 106, 512, 920);
  addFooter(slides[1], 2);

  // Slide 3
  addText(slides[2], "2. Pembagian Tugas per Role", { left: 72, top: 56, width: 520, height: 48 }, { fontSize: 30, bold: true, color: "#14213d" });
  addCard(slides[2], { left: 72, top: 150, width: 500, height: 430 }, { fill: "#ffffff" });
  addText(slides[2], "Admin", { left: 104, top: 182, width: 160, height: 28 }, { fontSize: 28, bold: true, color: "#0f766e" });
  addBulletList(slides[2], [
    { text: "Input ajuan baru", color: "#0f766e" },
    { text: "Edit ajuan jika ada revisi / koreksi data", color: "#0f766e", height: 56 },
    { text: "Ajukan ke Dirkeu", color: "#0f766e" },
    { text: "Pantau status approval dan pembayaran", color: "#0f766e", height: 56 },
    { text: "Upload LPJ dan isi realisasi", color: "#0f766e", height: 56 }
  ], 106, 236, 390);
  addCard(slides[2], { left: 608, top: 150, width: 552, height: 430 }, { fill: "#ffffff" });
  addText(slides[2], "Dirkeu", { left: 640, top: 182, width: 160, height: 28 }, { fontSize: 28, bold: true, color: "#1d4ed8" });
  addBulletList(slides[2], [
    { text: "Melihat daftar ajuan yang menunggu review", color: "#1d4ed8", height: 56 },
    { text: "Setujui, tolak, atau minta revisi", color: "#1d4ed8", height: 56 },
    { text: "Memberi catatan review", color: "#1d4ed8" },
    { text: "Setelah disetujui, memproses pembayaran", color: "#1d4ed8", height: 56 },
    { text: "Upload bukti TF atau tandai Dibayar Tanpa Bukti TF", color: "#1d4ed8", height: 72 }
  ], 642, 236, 430);
  addFooter(slides[2], 3);

  // Slide 4
  addText(slides[3], "3. Alur Kerja Admin", { left: 72, top: 56, width: 420, height: 48 }, { fontSize: 30, bold: true, color: "#14213d" });
  addText(slides[3], "Gunakan alur ini agar ajuan tidak tertahan di tengah proses.", { left: 72, top: 102, width: 620, height: 30 }, { fontSize: 18, color: "#60708b" });
  const steps = [
    { left: 90, label: "1", title: "Input Ajuan", text: "Isi data ajuan, nominal, memo, dan status LPJ." },
    { left: 330, label: "2", title: "Cek Ulang", text: "Pastikan nama pengaju, rekening, divisi, dan nominal sudah benar." },
    { left: 570, label: "3", title: "Ajukan ke Dirkeu", text: "Klik ajukan ke Dirkeu dari halaman edit / dashboard." },
    { left: 810, label: "4", title: "Pantau Hasil", text: "Lihat apakah disetujui, ditolak, atau perlu revisi." }
  ];
  for (const step of steps) {
    addCard(slides[3], { left: step.left, top: 214, width: 200, height: 240 }, { fill: "#ffffff" });
    slideDot(slides[3], step.left + 78, 176, step.label, "#0f766e");
    addText(slides[3], step.title, { left: step.left + 20, top: 248, width: 160, height: 52 }, { fontSize: 22, bold: true, color: "#14213d" });
    addText(slides[3], step.text, { left: step.left + 20, top: 314, width: 160, height: 88 }, { fontSize: 18, color: "#475569" });
  }
  addCard(slides[3], { left: 72, top: 506, width: 1088, height: 96 }, { fill: "#fff7e8", line: "#fde4a7" });
  addText(slides[3], "Catatan penting: jika Dirkeu minta revisi, Admin bisa edit ajuan lalu ajukan ulang tanpa membuat data baru.", { left: 104, top: 540, width: 980, height: 32 }, { fontSize: 21, bold: true, color: "#9a6700" });
  addFooter(slides[3], 4);

  // Slide 5
  addText(slides[4], "4. Langkah Praktis Admin", { left: 72, top: 56, width: 470, height: 48 }, { fontSize: 30, bold: true, color: "#14213d" });
  addCard(slides[4], { left: 72, top: 148, width: 530, height: 470 }, { fill: "#ffffff" });
  addText(slides[4], "Saat membuat ajuan", { left: 104, top: 184, width: 260, height: 28 }, { fontSize: 24, bold: true, color: "#0f766e" });
  addBulletList(slides[4], [
    { text: "Pisahkan Nama Pengaju dan Atas Nama Rekening.", color: "#0f766e", height: 56 },
    { text: "Isi nominal dengan benar, format rupiah akan otomatis dirapikan.", color: "#0f766e", height: 56 },
    { text: "Upload memo bisa lebih dari satu file jika memo terdiri dari beberapa halaman.", color: "#0f766e", height: 72 },
    { text: "Simpan dulu, lalu ajukan ke Dirkeu setelah semua data valid.", color: "#0f766e", height: 56 }
  ], 106, 236, 390);
  addCard(slides[4], { left: 640, top: 148, width: 520, height: 470 }, { fill: "#ffffff" });
  addText(slides[4], "Saat memantau dashboard", { left: 672, top: 184, width: 280, height: 28 }, { fontSize: 24, bold: true, color: "#1d4ed8" });
  addBulletList(slides[4], [
    { text: "Gunakan search, filter, dan sort untuk mencari ajuan tertentu.", color: "#1d4ed8", height: 56 },
    { text: "Status Dirkeu menunjukkan apakah ajuan menunggu review, revisi, atau sudah disetujui.", color: "#1d4ed8", height: 72 },
    { text: "Admin tetap dapat melihat link bukti TF jika Dirkeu mengupload bukti pembayaran.", color: "#1d4ed8", height: 72 },
    { text: "Untuk ajuan tanpa bukti TF, dashboard akan menampilkan status Dibayar Tanpa Bukti TF.", color: "#1d4ed8", height: 72 }
  ], 674, 236, 370);
  addFooter(slides[4], 5);

  // Slide 6
  addText(slides[5], "5. Alur Kerja Dirkeu", { left: 72, top: 56, width: 450, height: 48 }, { fontSize: 30, bold: true, color: "#14213d" });
  addCard(slides[5], { left: 72, top: 150, width: 1088, height: 160 }, { fill: "#ffffff" });
  addText(slides[5], "Review", { left: 110, top: 196, width: 120, height: 30 }, { fontSize: 24, bold: true, color: "#1d4ed8" });
  addText(slides[5], "Buka menu Review Dirkeu, cek detail ajuan, lalu pilih Setujui, Tolak, atau Minta Revisi. Catatan review wajib jelas jika menolak atau meminta revisi.", { left: 110, top: 238, width: 920, height: 56 }, { fontSize: 20, color: "#475569" });
  addCard(slides[5], { left: 72, top: 340, width: 520, height: 250 }, { fill: "#ffffff" });
  addText(slides[5], "Jika ajuan disetujui", { left: 104, top: 376, width: 250, height: 28 }, { fontSize: 24, bold: true, color: "#0f766e" });
  addBulletList(slides[5], [
    { text: "Ajuan otomatis masuk tahap pembayaran.", color: "#0f766e", height: 52 },
    { text: "Dirkeu buka menu Bukti TF.", color: "#0f766e", height: 52 },
    { text: "Pilih salah satu: upload bukti atau tandai tanpa bukti TF.", color: "#0f766e", height: 64 }
  ], 106, 428, 370);
  addCard(slides[5], { left: 640, top: 340, width: 520, height: 250 }, { fill: "#ffffff" });
  addText(slides[5], "Jika perlu revisi / ditolak", { left: 672, top: 376, width: 320, height: 28 }, { fontSize: 24, bold: true, color: "#dc2626" });
  addBulletList(slides[5], [
    { text: "Tulis alasan secara spesifik agar admin tahu apa yang perlu diperbaiki.", color: "#dc2626", height: 64 },
    { text: "Admin akan melihat status dan catatan pada halaman edit ajuan.", color: "#dc2626", height: 64 },
    { text: "Setelah direvisi, admin bisa ajukan ulang.", color: "#dc2626", height: 52 }
  ], 674, 428, 370);
  addFooter(slides[5], 6);

  // Slide 7
  addText(slides[6], "6. Bukti TF Bersifat Opsional", { left: 72, top: 56, width: 520, height: 48 }, { fontSize: 30, bold: true, color: "#14213d" });
  addText(slides[6], "Sistem sekarang mendukung dua hasil pembayaran yang berbeda.", { left: 72, top: 104, width: 600, height: 28 }, { fontSize: 18, color: "#60708b" });
  addCard(slides[6], { left: 72, top: 170, width: 500, height: 340 }, { fill: "#ffffff" });
  addText(slides[6], "Opsi 1 • Upload Bukti TF", { left: 104, top: 206, width: 260, height: 28 }, { fontSize: 24, bold: true, color: "#0f766e" });
  addBulletList(slides[6], [
    { text: "Gunakan jika pembayaran punya file bukti transfer.", color: "#0f766e", height: 56 },
    { text: "Setelah upload, status menjadi Selesai Dibayar.", color: "#0f766e", height: 56 },
    { text: "Admin bisa klik link bukti dari dashboard Cek Ajuan.", color: "#0f766e", height: 56 }
  ], 106, 256, 360);
  addCard(slides[6], { left: 620, top: 170, width: 540, height: 340 }, { fill: "#ffffff" });
  addText(slides[6], "Opsi 2 • Tanpa Bukti TF", { left: 652, top: 206, width: 240, height: 28 }, { fontSize: 24, bold: true, color: "#0891b2" });
  addBulletList(slides[6], [
    { text: "Gunakan jika pembayaran selesai tetapi memang tidak membutuhkan bukti transfer.", color: "#0891b2", height: 72 },
    { text: "Klik tombol Tandai Sudah Dibayar pada menu Bukti TF.", color: "#0891b2", height: 56 },
    { text: "Status akhir menjadi Dibayar Tanpa Bukti TF.", color: "#0891b2", height: 56 },
    { text: "Status ini tetap terlihat oleh admin di dashboard.", color: "#0891b2", height: 56 }
  ], 654, 256, 380);
  addCard(slides[6], { left: 72, top: 544, width: 1088, height: 74 }, { fill: "#eef7ff", line: "#c7defa" });
  addText(slides[6], "Tujuan status khusus ini adalah agar user tidak bingung antara pembayaran yang sudah selesai dengan pembayaran yang masih menunggu bukti.", { left: 102, top: 568, width: 990, height: 28 }, { fontSize: 20, bold: true, color: "#1d4ed8" });
  addFooter(slides[6], 7);

  // Slide 8
  addText(slides[7], "7. Tips dan Troubleshooting", { left: 72, top: 56, width: 520, height: 48 }, { fontSize: 30, bold: true, color: "#14213d" });
  addCard(slides[7], { left: 72, top: 150, width: 1088, height: 420 }, { fill: "#ffffff" });
  addBulletList(slides[7], [
    { text: "Jika menu tidak muncul sesuai role, logout lalu login ulang dengan akun yang tepat.", color: "#0f766e", height: 56 },
    { text: "Jika ajuan tidak muncul di Review Dirkeu, cek apakah Admin sudah klik Ajukan ke Dirkeu.", color: "#0f766e", height: 56 },
    { text: "Jika ajuan tidak muncul di menu Bukti TF, pastikan status review sudah Disetujui Dirkeu.", color: "#0f766e", height: 56 },
    { text: "Jika pembayaran tidak punya lampiran, gunakan status Dibayar Tanpa Bukti TF agar rekap tetap jelas.", color: "#0f766e", height: 64 },
    { text: "Gunakan fitur search, filter, dan export Excel untuk memudahkan pengecekan data saat jumlah ajuan sudah banyak.", color: "#0f766e", height: 72 }
  ], 104, 196, 940);
  addCard(slides[7], { left: 72, top: 596, width: 1088, height: 52 }, { fill: "#0f766e", line: "#0f766e" });
  addText(slides[7], "Panduan ini bisa dibagikan ke user Admin maupun Dirkeu sebagai acuan operasional harian.", { left: 102, top: 610, width: 980, height: 24 }, { fontSize: 20, bold: true, color: "#ffffff" });
  addFooter(slides[7], 8);

  for (const [index, slide] of slides.entries()) {
    await fs.mkdir(previewDir, { recursive: true });
    await fs.mkdir(layoutDir, { recursive: true });
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
      "- Slide count: 8",
      "- Tema warna finance teal/blue konsisten",
      "- Semua slide memakai editable textbox dan shapes",
      "- Kredensial Admin dan Dirkeu sudah dimasukkan sesuai instruksi user",
      `- Final PPTX: ${outputPath}`
    ].join("\n"),
    "utf8"
  );

  console.log(outputPath);
}

function slideDot(slide, left, top, label, fill) {
  slide.shapes.add({
    geometry: "ellipse",
    position: { left, top, width: 44, height: 44 },
    fill,
    line: { style: "solid", fill, width: 0 }
  }).text = "";
  addText(slide, label, { left: left + 12, top: top + 6, width: 22, height: 22 }, { fontSize: 20, bold: true, color: "#ffffff" });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
