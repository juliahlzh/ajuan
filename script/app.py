import json
import logging
from io import BytesIO
from datetime import datetime, timedelta

from flask import Flask, jsonify, redirect, render_template, request, send_file, send_from_directory, url_for
from openpyxl import Workbook

from config import BUKTI_DIR, LOG_DIR, LPJ_DIR, MAX_UPLOAD_SIZE, MEMO_DIR, STATIC_DIR, TEMPLATES_DIR, ensure_directories
from db import (
    add_audit_log,
    create_ajuan,
    delete_ajuan,
    derive_status_dana,
    derive_status_lpj,
    find_possible_duplicates,
    get_ajuan_by_id,
    init_db,
    list_audit_logs,
    list_ajuan,
    list_available_years,
    list_divisi_cabang_options,
    list_pending_lpj,
    update_ajuan,
    update_bukti_transfer,
    update_lpj,
    update_memo_ajuan,
    upsert_import_ajuan,
)
from file_service import is_allowed_file, save_bukti_file, save_lpj_file, save_memo_file
from import_service import is_allowed_import_file, parse_import_file
from memo_detect_service import detect_fields_from_text, detect_fields_from_upload


ensure_directories()
init_db()

log_file = LOG_DIR / "app.log"
logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

app = Flask(__name__, template_folder=str(TEMPLATES_DIR), static_folder=str(STATIC_DIR))
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_SIZE


def _resolve_tanggal_jatuh_tempo_lpj(
    tanggal_ajuan: str,
    wajib_lpj: str,
    lpj_due_option: str,
    tanggal_jatuh_tempo_lpj_manual: str,
) -> str:
    if wajib_lpj != "1":
        return ""

    manual = tanggal_jatuh_tempo_lpj_manual.strip()
    if manual:
        return manual

    if lpj_due_option not in {"30", "90", "365"}:
        return ""

    base_date = datetime.strptime(tanggal_ajuan, "%Y-%m-%d")
    due_date = base_date + timedelta(days=int(lpj_due_option))
    return due_date.strftime("%Y-%m-%d")


def _serialize_rows(rows: list) -> list[dict]:
    result: list[dict] = []
    for row in rows:
        item = dict(row)
        nama_pengaju = str(item.get("nama_pengaju") or "").strip()
        nama_penerima = str(item.get("nama_penerima_dana") or "").strip()
        if nama_penerima:
            item["atas_nama_rekening"] = nama_penerima
        elif nama_pengaju and nama_pengaju != "-":
            item["atas_nama_rekening"] = nama_pengaju
        else:
            item["atas_nama_rekening"] = "-"
        item["status_lpj_turunan"] = derive_status_lpj(row)
        item["status_dana"] = derive_status_dana(row)
        nominal = float(item.get("nominal") or 0)
        realisasi = item.get("nominal_realisasi")
        if realisasi is None:
            item["selisih"] = None
        else:
            item["selisih"] = nominal - float(realisasi or 0)
        result.append(item)
    return result


def _build_summary(rows: list[dict]) -> dict:
    total_ajuan = 0.0
    total_realisasi = 0.0
    total_selisih = 0.0
    count_realisasi = 0
    count_surplus = 0
    count_defisit = 0
    count_sesuai = 0

    for item in rows:
        nominal = float(item.get("nominal") or 0)
        total_ajuan += nominal

        realisasi = item.get("nominal_realisasi")
        if realisasi is not None:
            realisasi_val = float(realisasi or 0)
            count_realisasi += 1
            total_realisasi += realisasi_val
            total_selisih += nominal - realisasi_val

        status_dana = item.get("status_dana")
        if status_dana == "Surplus":
            count_surplus += 1
        elif status_dana == "Defisit":
            count_defisit += 1
        elif status_dana == "Sesuai":
            count_sesuai += 1

    return {
        "total_data": len(rows),
        "total_ajuan": total_ajuan,
        "total_realisasi": total_realisasi,
        "total_selisih": total_selisih,
        "count_realisasi": count_realisasi,
        "count_surplus": count_surplus,
        "count_defisit": count_defisit,
        "count_sesuai": count_sesuai,
    }


def _build_dashboard(rows: list[dict]) -> dict:
    status_bayar: dict[str, int] = {}
    status_lpj: dict[str, int] = {}
    status_dana: dict[str, int] = {}
    divisi_count: dict[str, int] = {}
    monthly_totals: dict[str, float] = {}

    for item in rows:
        bayar = item.get("status") or "Tidak Diketahui"
        status_bayar[bayar] = status_bayar.get(bayar, 0) + 1

        lpj = item.get("status_lpj_turunan") or "Tidak Diketahui"
        status_lpj[lpj] = status_lpj.get(lpj, 0) + 1

        dana = item.get("status_dana") or "Tidak Diketahui"
        status_dana[dana] = status_dana.get(dana, 0) + 1

        divisi = (item.get("divisi_cabang") or "-").strip() or "-"
        divisi_count[divisi] = divisi_count.get(divisi, 0) + 1

        tanggal = str(item.get("tanggal_ajuan") or "")
        if len(tanggal) >= 7:
            month_key = tanggal[:7]
            monthly_totals[month_key] = monthly_totals.get(month_key, 0.0) + float(item.get("nominal") or 0)

    top_divisi = sorted(divisi_count.items(), key=lambda x: x[1], reverse=True)[:5]
    trend_nominal = sorted(monthly_totals.items(), key=lambda x: x[0])[-6:]

    return {
        "status_bayar": status_bayar,
        "status_lpj": status_lpj,
        "status_dana": status_dana,
        "top_divisi": top_divisi,
        "trend_nominal": trend_nominal,
    }


def _build_changes(old_data: dict, new_data: dict) -> dict:
    keys = [
        "tanggal_ajuan",
        "nama_pengaju",
        "nama_penerima_dana",
        "nomor_memo",
        "perihal",
        "divisi_cabang",
        "jenis_ajuan",
        "nominal",
        "nominal_realisasi",
        "keterangan",
        "status",
        "wajib_lpj",
        "tanggal_jatuh_tempo_lpj",
        "status_lpj",
        "link_memo_ajuan",
    ]
    changes: dict[str, dict[str, str]] = {}
    for key in keys:
        old_val = str(old_data.get(key, "") or "").strip()
        new_val = str(new_data.get(key, "") or "").strip()
        if old_val != new_val:
            changes[key] = {"old": old_val, "new": new_val}
    return changes


def _calc_due_date_for_form(
    tanggal_ajuan: str,
    wajib_lpj: str,
    lpj_due_option: str,
    tanggal_jatuh_tempo_lpj_manual: str,
    fallback_due: str,
) -> str:
    if wajib_lpj != "1":
        return ""
    manual = tanggal_jatuh_tempo_lpj_manual.strip()
    if manual:
        return manual
    if lpj_due_option in {"30", "90", "365"} and tanggal_ajuan:
        return _resolve_tanggal_jatuh_tempo_lpj(
            tanggal_ajuan=tanggal_ajuan,
            wajib_lpj=wajib_lpj,
            lpj_due_option=lpj_due_option,
            tanggal_jatuh_tempo_lpj_manual="",
        )
    return fallback_due.strip()


@app.route("/")
def home():
    return redirect(url_for("input_ajuan"))


@app.route("/ajuan/new", methods=["GET", "POST"])
def input_ajuan():
    divisi_options = list_divisi_cabang_options()
    if request.method == "POST":
        tanggal_ajuan = request.form.get("tanggal_ajuan", "").strip()
        wajib_lpj = request.form.get("wajib_lpj", "1").strip() or "1"
        lpj_due_option = request.form.get("lpj_due_option", "30").strip()
        tanggal_jatuh_tempo_lpj_manual = request.form.get("tanggal_jatuh_tempo_lpj_manual", "").strip()

        payload = {
            "tanggal_ajuan": tanggal_ajuan,
            "nama_pengaju": request.form.get("nama_pengaju", "").strip(),
            "nama_penerima_dana": request.form.get("nama_penerima_dana", "").strip(),
            "nomor_memo": request.form.get("nomor_memo", "").strip(),
            "perihal": request.form.get("perihal", "").strip(),
            "divisi_cabang": request.form.get("divisi_cabang", "").strip(),
            "jenis_ajuan": request.form.get("jenis_ajuan", "").strip(),
            "nominal": request.form.get("nominal", "0").strip(),
            "nominal_realisasi": "",
            "keterangan": request.form.get("keterangan", "").strip(),
            "status": "Menunggu Pembayaran",
            "link_bukti_transfer": "",
            "link_memo_ajuan": "",
            "wajib_lpj": wajib_lpj,
            "tanggal_jatuh_tempo_lpj": "",
            "status_lpj": "Belum Upload" if wajib_lpj == "1" else "Tidak Wajib",
            "link_lpj": "",
            "lpj_due_option": lpj_due_option,
            "tanggal_jatuh_tempo_lpj_manual": tanggal_jatuh_tempo_lpj_manual,
        }

        if not all(
            [
                payload["tanggal_ajuan"],
                payload["nama_pengaju"],
                payload["divisi_cabang"],
                payload["jenis_ajuan"],
                payload["nominal"],
            ]
        ):
            return render_template(
                "input_ajuan.html",
                error="Kolom wajib belum lengkap.",
                form=payload,
                divisi_options=divisi_options,
                duplicate_candidates=[],
                saved_id=None,
            )

        try:
            duplicate_candidates = []
            nama_penerima = str(payload.get("nama_penerima_dana", "") or "").strip()
            nominal_value = float(payload.get("nominal", 0) or 0)
            if nama_penerima and nominal_value > 0:
                duplicate_candidates = find_possible_duplicates(
                    tanggal_ajuan=payload["tanggal_ajuan"],
                    nominal=nominal_value,
                    nama_penerima_dana=nama_penerima,
                )

            if duplicate_candidates and request.form.get("force_save", "0") != "1":
                return render_template(
                    "input_ajuan.html",
                    error=(
                        "Terdeteksi kemungkinan duplikat (tanggal + nominal + atas nama rekening sama). "
                        "Cek dulu daftar di bawah, atau centang 'Tetap simpan meskipun duplikat'."
                    ),
                    form=payload,
                    divisi_options=divisi_options,
                    duplicate_candidates=[dict(r) for r in duplicate_candidates],
                    saved_id=None,
                )

            payload["tanggal_jatuh_tempo_lpj"] = _resolve_tanggal_jatuh_tempo_lpj(
                tanggal_ajuan=tanggal_ajuan,
                wajib_lpj=wajib_lpj,
                lpj_due_option=lpj_due_option,
                tanggal_jatuh_tempo_lpj_manual=tanggal_jatuh_tempo_lpj_manual,
            )
            saved_id = create_ajuan(payload)
            add_audit_log(saved_id, "CREATE_AJUAN", json.dumps({"source": "form_input"}))

            memo_file = request.files.get("file_memo")
            if memo_file and memo_file.filename:
                if not is_allowed_file(memo_file.filename):
                    return render_template(
                        "input_ajuan.html",
                        error="Ajuan tersimpan, tapi file memo gagal: format harus jpg/png/pdf.",
                        form={},
                        divisi_options=divisi_options,
                        duplicate_candidates=[],
                        saved_id=saved_id,
                    )
                _, memo_link = save_memo_file(saved_id, memo_file)
                update_memo_ajuan(saved_id, memo_link)
                add_audit_log(saved_id, "UPLOAD_MEMO", json.dumps({"link_memo_ajuan": memo_link}))

            logging.info("Ajuan baru dibuat: %s", saved_id)
            return render_template(
                "input_ajuan.html",
                success=True,
                saved_id=saved_id,
                form={},
                divisi_options=list_divisi_cabang_options(),
                duplicate_candidates=[],
            )
        except Exception as exc:
            logging.exception("Gagal menyimpan ajuan")
            return render_template(
                "input_ajuan.html",
                error=f"Gagal menyimpan data: {exc}",
                form=payload,
                divisi_options=divisi_options,
                duplicate_candidates=[],
                saved_id=None,
            )

    return render_template(
        "input_ajuan.html",
        form={},
        divisi_options=divisi_options,
        duplicate_candidates=[],
        saved_id=None,
    )


@app.route("/import-sheet", methods=["GET", "POST"])
def import_sheet():
    if request.method == "POST":
        file_obj = request.files.get("file_import")
        if not file_obj or not file_obj.filename:
            return render_template("import_sheet.html", error="Pilih file CSV/XLSX terlebih dahulu.")

        if not is_allowed_import_file(file_obj.filename):
            return render_template("import_sheet.html", error="Format file harus CSV atau XLSX.")

        try:
            rows = parse_import_file(file_obj)
            inserted = 0
            updated = 0
            years: set[str] = set()

            for row in rows:
                id_ajuan, action = upsert_import_ajuan(row)
                if action == "inserted":
                    inserted += 1
                    add_audit_log(id_ajuan, "IMPORT_INSERT", json.dumps({"source": "import_sheet"}))
                else:
                    updated += 1
                    add_audit_log(id_ajuan, "IMPORT_UPDATE", json.dumps({"source": "import_sheet"}))
                if row.get("tanggal_ajuan"):
                    years.add(str(row["tanggal_ajuan"])[:4])

            logging.info("Import sheet selesai. inserted=%s updated=%s", inserted, updated)
            return render_template(
                "import_sheet.html",
                success=True,
                inserted=inserted,
                updated=updated,
                total=len(rows),
                years=", ".join(sorted(y for y in years if y)),
            )
        except Exception as exc:
            logging.exception("Import sheet gagal")
            return render_template("import_sheet.html", error=f"Import gagal: {exc}")

    return render_template("import_sheet.html")


@app.route("/ajuan/<id_ajuan>/edit", methods=["GET", "POST"])
def edit_ajuan(id_ajuan: str):
    row = get_ajuan_by_id(id_ajuan)
    if not row:
        return redirect(url_for("cek_ajuan"))

    row_dict = dict(row)
    divisi_options = list_divisi_cabang_options()
    logs = list_audit_logs(id_ajuan=id_ajuan, limit=30)

    if request.method == "POST":
        wajib_lpj = request.form.get("wajib_lpj", str(row_dict.get("wajib_lpj", 1))).strip() or "1"
        lpj_due_option = request.form.get("lpj_due_option", "").strip()
        tanggal_ajuan = request.form.get("tanggal_ajuan", "").strip()
        tanggal_jatuh_tempo_lpj_manual = request.form.get("tanggal_jatuh_tempo_lpj_manual", "").strip()
        status_lpj = request.form.get("status_lpj", "").strip()

        payload = {
            "tanggal_ajuan": tanggal_ajuan,
            "nama_pengaju": request.form.get("nama_pengaju", "").strip(),
            "nama_penerima_dana": request.form.get("nama_penerima_dana", "").strip(),
            "nomor_memo": request.form.get("nomor_memo", "").strip(),
            "perihal": request.form.get("perihal", "").strip(),
            "divisi_cabang": request.form.get("divisi_cabang", "").strip(),
            "jenis_ajuan": request.form.get("jenis_ajuan", "").strip(),
            "nominal": request.form.get("nominal", "0").strip(),
            "nominal_realisasi": request.form.get("nominal_realisasi", "").strip(),
            "keterangan": request.form.get("keterangan", "").strip(),
            "status": request.form.get("status", "Menunggu Pembayaran").strip(),
            "link_bukti_transfer": row_dict.get("link_bukti_transfer", "") or "",
            "link_memo_ajuan": row_dict.get("link_memo_ajuan", "") or "",
            "wajib_lpj": wajib_lpj,
            "tanggal_jatuh_tempo_lpj": _calc_due_date_for_form(
                tanggal_ajuan=tanggal_ajuan,
                wajib_lpj=wajib_lpj,
                lpj_due_option=lpj_due_option,
                tanggal_jatuh_tempo_lpj_manual=tanggal_jatuh_tempo_lpj_manual,
                fallback_due=row_dict.get("tanggal_jatuh_tempo_lpj", "") or "",
            ),
            "status_lpj": status_lpj or ("Belum Upload" if wajib_lpj == "1" else "Tidak Wajib"),
            "link_lpj": row_dict.get("link_lpj", "") or "",
        }

        if wajib_lpj != "1":
            payload["status_lpj"] = "Tidak Wajib"
            payload["tanggal_jatuh_tempo_lpj"] = ""

        if not all(
            [
                payload["tanggal_ajuan"],
                payload["nama_pengaju"],
                payload["divisi_cabang"],
                payload["jenis_ajuan"],
                payload["nominal"],
            ]
        ):
            payload["id_ajuan"] = id_ajuan
            return render_template(
                "edit_ajuan.html",
                error="Kolom wajib belum lengkap.",
                form=payload,
                logs=logs,
                divisi_options=divisi_options,
            )

        memo_file = request.files.get("file_memo")
        if memo_file and memo_file.filename and not is_allowed_file(memo_file.filename):
            payload["id_ajuan"] = id_ajuan
            return render_template(
                "edit_ajuan.html",
                error="Format memo harus jpg, jpeg, png, atau pdf.",
                form=payload,
                logs=logs,
                divisi_options=divisi_options,
            )

        try:
            if memo_file and memo_file.filename:
                _, memo_link = save_memo_file(id_ajuan, memo_file)
                payload["link_memo_ajuan"] = memo_link
                add_audit_log(id_ajuan, "UPLOAD_MEMO", json.dumps({"link_memo_ajuan": memo_link}))

            updated = update_ajuan(id_ajuan, payload)
            if updated:
                logging.info("Ajuan diupdate: %s", id_ajuan)
                changes = _build_changes(row_dict, payload)
                if changes:
                    add_audit_log(id_ajuan, "EDIT_AJUAN", json.dumps(changes, ensure_ascii=False))

                form = dict(get_ajuan_by_id(id_ajuan))
                logs = list_audit_logs(id_ajuan=id_ajuan, limit=30)
                return render_template(
                    "edit_ajuan.html",
                    success=True,
                    form=form,
                    logs=logs,
                    divisi_options=divisi_options,
                )

            payload["id_ajuan"] = id_ajuan
            return render_template(
                "edit_ajuan.html",
                error="Data gagal diupdate.",
                form=payload,
                logs=logs,
                divisi_options=divisi_options,
            )
        except Exception as exc:
            logging.exception("Gagal update ajuan")
            payload["id_ajuan"] = id_ajuan
            return render_template(
                "edit_ajuan.html",
                error=f"Gagal update: {exc}",
                form=payload,
                logs=logs,
                divisi_options=divisi_options,
            )

    return render_template("edit_ajuan.html", form=row_dict, logs=logs, divisi_options=divisi_options)


@app.route("/ajuan/<id_ajuan>/delete", methods=["POST"])
def delete_ajuan_route(id_ajuan: str):
    row = get_ajuan_by_id(id_ajuan)
    if not row:
        return redirect(url_for("cek_ajuan"))

    snapshot = {
        "tanggal_ajuan": row["tanggal_ajuan"],
        "nama_pengaju": row["nama_pengaju"],
        "nama_penerima_dana": row["nama_penerima_dana"],
        "divisi_cabang": row["divisi_cabang"],
        "nominal": row["nominal"],
    }
    add_audit_log(id_ajuan, "DELETE_AJUAN", json.dumps(snapshot, ensure_ascii=False))
    deleted = delete_ajuan(id_ajuan)

    if deleted:
        logging.info("Ajuan dihapus: %s", id_ajuan)
    return redirect(url_for("cek_ajuan"))


@app.route("/upload-bukti", methods=["GET", "POST"])
def upload_bukti_tf():
    pending = list_ajuan(status="Menunggu Pembayaran")

    if request.method == "POST":
        id_ajuan = request.form.get("id_ajuan", "").strip()
        file_obj = request.files.get("file_bukti")

        if not id_ajuan or not file_obj or not file_obj.filename:
            return render_template(
                "upload_bukti.html",
                error="ID Ajuan dan file bukti wajib diisi.",
                pending=pending,
            )

        if not is_allowed_file(file_obj.filename):
            return render_template(
                "upload_bukti.html",
                error="Format file tidak didukung. Gunakan jpg, png, atau pdf.",
                pending=pending,
            )

        row = get_ajuan_by_id(id_ajuan)
        if not row:
            return render_template(
                "upload_bukti.html",
                error="ID Ajuan tidak ditemukan.",
                pending=pending,
            )

        try:
            _, relative_link = save_bukti_file(id_ajuan, file_obj)
            update_bukti_transfer(id_ajuan, relative_link, status="Selesai Dibayar")
            add_audit_log(id_ajuan, "UPLOAD_BUKTI_TF", json.dumps({"link_bukti_transfer": relative_link}))
            logging.info("Bukti transfer diupload untuk %s", id_ajuan)
            pending = list_ajuan(status="Menunggu Pembayaran")
            return render_template(
                "upload_bukti.html",
                success=True,
                uploaded_id=id_ajuan,
                link_bukti=relative_link,
                pending=pending,
            )
        except Exception as exc:
            logging.exception("Gagal upload bukti transfer")
            return render_template(
                "upload_bukti.html",
                error=f"Upload gagal: {exc}",
                pending=pending,
            )

    return render_template("upload_bukti.html", pending=pending)


@app.route("/upload-lpj", methods=["GET", "POST"])
def upload_lpj_page():
    pending_lpj = list_pending_lpj()

    if request.method == "POST":
        id_ajuan = request.form.get("id_ajuan", "").strip()
        file_obj = request.files.get("file_lpj")
        nominal_realisasi_raw = request.form.get("nominal_realisasi", "").strip()

        if not id_ajuan or not file_obj or not file_obj.filename:
            return render_template(
                "upload_lpj.html",
                error="ID Ajuan dan file LPJ wajib diisi.",
                pending_lpj=pending_lpj,
            )

        if not is_allowed_file(file_obj.filename):
            return render_template(
                "upload_lpj.html",
                error="Format file tidak didukung. Gunakan jpg, png, atau pdf.",
                pending_lpj=pending_lpj,
            )

        row = get_ajuan_by_id(id_ajuan)
        if not row:
            return render_template(
                "upload_lpj.html",
                error="ID Ajuan tidak ditemukan.",
                pending_lpj=pending_lpj,
            )

        if int(row["wajib_lpj"] or 0) == 0:
            return render_template(
                "upload_lpj.html",
                error="Ajuan ini tidak wajib LPJ.",
                pending_lpj=pending_lpj,
            )

        try:
            realisasi_value = None if nominal_realisasi_raw == "" else float(nominal_realisasi_raw)
            _, relative_link = save_lpj_file(id_ajuan, file_obj)
            update_lpj(
                id_ajuan,
                link_lpj=relative_link,
                status_lpj="Sudah Upload",
                nominal_realisasi=realisasi_value,
            )
            add_audit_log(
                id_ajuan,
                "UPLOAD_LPJ",
                json.dumps({"link_lpj": relative_link, "nominal_realisasi": nominal_realisasi_raw}),
            )
            logging.info("LPJ diupload untuk %s", id_ajuan)
            pending_lpj = list_pending_lpj()
            return render_template(
                "upload_lpj.html",
                success=True,
                uploaded_id=id_ajuan,
                link_lpj=relative_link,
                pending_lpj=pending_lpj,
            )
        except Exception as exc:
            logging.exception("Gagal upload LPJ")
            return render_template(
                "upload_lpj.html",
                error=f"Upload LPJ gagal: {exc}",
                pending_lpj=pending_lpj,
            )

    return render_template("upload_lpj.html", pending_lpj=pending_lpj)


@app.route("/cek-ajuan", methods=["GET"])
def cek_ajuan():
    keyword = request.args.get("keyword", "").strip()
    cabang = request.args.get("cabang", "").strip()
    tanggal_awal = request.args.get("tanggal_awal", "").strip()
    tanggal_akhir = request.args.get("tanggal_akhir", "").strip()
    tahun = request.args.get("tahun", "").strip()

    rows = list_ajuan(
        keyword=keyword or None,
        cabang=cabang or None,
        tanggal_awal=tanggal_awal or None,
        tanggal_akhir=tanggal_akhir or None,
        tahun=tahun or None,
    )
    rows_serialized = _serialize_rows(rows)
    summary = _build_summary(rows_serialized)
    dashboard = _build_dashboard(rows_serialized)
    years = list_available_years()

    return render_template(
        "cek_ajuan.html",
        rows=rows_serialized,
        summary=summary,
        dashboard=dashboard,
        years=years,
        filters={
            "keyword": keyword,
            "cabang": cabang,
            "tanggal_awal": tanggal_awal,
            "tanggal_akhir": tanggal_akhir,
            "tahun": tahun,
        },
    )


@app.route("/export/ajuan.xlsx", methods=["GET"])
def export_ajuan_excel():
    keyword = request.args.get("keyword", "").strip() or None
    cabang = request.args.get("cabang", "").strip() or None
    tanggal_awal = request.args.get("tanggal_awal", "").strip() or None
    tanggal_akhir = request.args.get("tanggal_akhir", "").strip() or None
    tahun = request.args.get("tahun", "").strip() or None

    rows = _serialize_rows(
        list_ajuan(
            keyword=keyword,
            cabang=cabang,
            tanggal_awal=tanggal_awal,
            tanggal_akhir=tanggal_akhir,
            tahun=tahun,
        )
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Rekap Ajuan"
    ws.append(
        [
            "ID Ajuan",
            "Tanggal Ajuan",
            "Nama Pengaju",
            "Atas Nama Rekening",
            "Nomor Memo",
            "Perihal",
            "Divisi/Cabang",
            "Jenis Ajuan",
            "Nominal Ajuan",
            "Realisasi LPJ",
            "Selisih",
            "Status Dana",
            "Status Pembayaran",
            "Status LPJ",
            "Jatuh Tempo LPJ",
            "Link Memo",
            "Link Bukti TF",
            "Link LPJ",
            "Keterangan",
        ]
    )

    for item in rows:
        ws.append(
            [
                item.get("id_ajuan", ""),
                item.get("tanggal_ajuan", ""),
                item.get("nama_pengaju", ""),
                item.get("atas_nama_rekening", ""),
                item.get("nomor_memo", ""),
                item.get("perihal", ""),
                item.get("divisi_cabang", ""),
                item.get("jenis_ajuan", ""),
                float(item.get("nominal") or 0),
                "" if item.get("nominal_realisasi") is None else float(item.get("nominal_realisasi") or 0),
                "" if item.get("selisih") is None else float(item.get("selisih") or 0),
                item.get("status_dana", ""),
                item.get("status", ""),
                item.get("status_lpj_turunan", ""),
                item.get("tanggal_jatuh_tempo_lpj", ""),
                item.get("link_memo_ajuan", ""),
                item.get("link_bukti_transfer", ""),
                item.get("link_lpj", ""),
                item.get("keterangan", ""),
            ]
        )

    out = BytesIO()
    wb.save(out)
    out.seek(0)
    filename = f"rekap_ajuan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return send_file(
        out,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.route("/bukti/<id_ajuan>/<filename>")
def serve_bukti(id_ajuan: str, filename: str):
    target_dir = BUKTI_DIR / id_ajuan
    return send_from_directory(target_dir, filename, as_attachment=False)


@app.route("/lpj/<id_ajuan>/<filename>")
def serve_lpj(id_ajuan: str, filename: str):
    target_dir = LPJ_DIR / id_ajuan
    return send_from_directory(target_dir, filename, as_attachment=False)


@app.route("/memo/<id_ajuan>/<filename>")
def serve_memo(id_ajuan: str, filename: str):
    target_dir = MEMO_DIR / id_ajuan
    return send_from_directory(target_dir, filename, as_attachment=False)


@app.route("/api/ajuan", methods=["POST", "GET"])
def api_ajuan():
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        required = ["tanggal_ajuan", "nama_pengaju", "divisi_cabang", "jenis_ajuan", "nominal"]
        if not all(payload.get(field) for field in required):
            return jsonify({"ok": False, "message": "Data wajib belum lengkap."}), 400

        wajib_lpj = str(payload.get("wajib_lpj", 1))
        lpj_due_option = str(payload.get("lpj_due_option", "30"))
        tanggal_jatuh_tempo_lpj_manual = str(payload.get("tanggal_jatuh_tempo_lpj_manual", ""))

        payload.setdefault("status", "Menunggu Pembayaran")
        payload.setdefault("link_bukti_transfer", "")
        payload.setdefault("link_memo_ajuan", "")
        payload.setdefault("link_lpj", "")
        payload.setdefault("nominal_realisasi", "")
        payload.setdefault("nama_penerima_dana", "")
        payload.setdefault("nomor_memo", "")
        payload.setdefault("perihal", "")
        payload["wajib_lpj"] = wajib_lpj
        payload["tanggal_jatuh_tempo_lpj"] = _resolve_tanggal_jatuh_tempo_lpj(
            tanggal_ajuan=payload["tanggal_ajuan"],
            wajib_lpj=wajib_lpj,
            lpj_due_option=lpj_due_option,
            tanggal_jatuh_tempo_lpj_manual=tanggal_jatuh_tempo_lpj_manual,
        )
        payload.setdefault("status_lpj", "Belum Upload" if wajib_lpj == "1" else "Tidak Wajib")

        try:
            id_ajuan = create_ajuan(payload)
            add_audit_log(id_ajuan, "CREATE_API", json.dumps({"source": "api_ajuan"}))
            return jsonify({"ok": True, "id_ajuan": id_ajuan}), 201
        except Exception as exc:
            return jsonify({"ok": False, "message": str(exc)}), 500

    keyword = request.args.get("keyword")
    cabang = request.args.get("cabang")
    tanggal_awal = request.args.get("tanggal_awal")
    tanggal_akhir = request.args.get("tanggal_akhir")
    tahun = request.args.get("tahun")

    rows = list_ajuan(
        keyword=keyword,
        cabang=cabang,
        tanggal_awal=tanggal_awal,
        tanggal_akhir=tanggal_akhir,
        tahun=tahun,
    )
    data = _serialize_rows(rows)
    return jsonify({"ok": True, "data": data})


@app.route("/api/memo/detect", methods=["POST"])
def api_detect_memo():
    file_obj = request.files.get("file_memo_detect")
    raw_text = request.form.get("raw_text", "").strip()

    if not file_obj and not raw_text:
        return jsonify({"ok": False, "message": "Upload file memo atau isi teks OCR terlebih dahulu."}), 400

    try:
        if file_obj and file_obj.filename:
            if not is_allowed_file(file_obj.filename):
                return jsonify({"ok": False, "message": "Format file memo harus jpg, jpeg, png, atau pdf."}), 400
            result = detect_fields_from_upload(file_obj)
            fields = result.get("fields", {})
            preview = (result.get("raw_text", "") or "")[:1000]
        else:
            fields = detect_fields_from_text(raw_text)
            preview = raw_text[:1000]

        return jsonify({"ok": True, "fields": fields, "raw_preview": preview})
    except Exception as exc:
        return jsonify({"ok": False, "message": str(exc)}), 400


@app.route("/api/ajuan/<id_ajuan>/bukti", methods=["POST"])
def api_upload_bukti(id_ajuan: str):
    file_obj = request.files.get("file")

    if not file_obj or not file_obj.filename:
        return jsonify({"ok": False, "message": "File wajib diunggah."}), 400

    if not is_allowed_file(file_obj.filename):
        return jsonify({"ok": False, "message": "Format file tidak didukung."}), 400

    row = get_ajuan_by_id(id_ajuan)
    if not row:
        return jsonify({"ok": False, "message": "ID Ajuan tidak ditemukan."}), 404

    try:
        _, relative_link = save_bukti_file(id_ajuan, file_obj)
        update_bukti_transfer(id_ajuan, relative_link, status="Selesai Dibayar")
        add_audit_log(id_ajuan, "UPLOAD_BUKTI_TF_API", json.dumps({"link_bukti_transfer": relative_link}))
        return jsonify(
            {
                "ok": True,
                "id_ajuan": id_ajuan,
                "status": "Selesai Dibayar",
                "link_bukti_transfer": relative_link,
            }
        )
    except Exception as exc:
        return jsonify({"ok": False, "message": str(exc)}), 500


@app.route("/api/ajuan/<id_ajuan>/lpj", methods=["POST"])
def api_upload_lpj(id_ajuan: str):
    file_obj = request.files.get("file")
    nominal_realisasi_raw = request.form.get("nominal_realisasi", "").strip()

    if not file_obj or not file_obj.filename:
        return jsonify({"ok": False, "message": "File LPJ wajib diunggah."}), 400

    if not is_allowed_file(file_obj.filename):
        return jsonify({"ok": False, "message": "Format file tidak didukung."}), 400

    row = get_ajuan_by_id(id_ajuan)
    if not row:
        return jsonify({"ok": False, "message": "ID Ajuan tidak ditemukan."}), 404

    if int(row["wajib_lpj"] or 0) == 0:
        return jsonify({"ok": False, "message": "Ajuan ini tidak wajib LPJ."}), 400

    try:
        realisasi_value = None if nominal_realisasi_raw == "" else float(nominal_realisasi_raw)
        _, relative_link = save_lpj_file(id_ajuan, file_obj)
        update_lpj(
            id_ajuan,
            link_lpj=relative_link,
            status_lpj="Sudah Upload",
            nominal_realisasi=realisasi_value,
        )
        add_audit_log(
            id_ajuan,
            "UPLOAD_LPJ_API",
            json.dumps({"link_lpj": relative_link, "nominal_realisasi": nominal_realisasi_raw}),
        )
        return jsonify(
            {
                "ok": True,
                "id_ajuan": id_ajuan,
                "status_lpj": "Sudah Upload",
                "link_lpj": relative_link,
                "nominal_realisasi": nominal_realisasi_raw,
            }
        )
    except Exception as exc:
        return jsonify({"ok": False, "message": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
