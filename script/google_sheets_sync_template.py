"""
Template sinkronisasi SQLite -> Google Sheet.
Butuh library: gspread, oauth2client.
Gunakan service account JSON lalu share Google Sheet ke email service account.
"""

import sqlite3
from pathlib import Path

import gspread
from oauth2client.service_account import ServiceAccountCredentials

DB_PATH = Path(r"D:\Ajuan\ajuan_pembayaran\Ajuan Pembayaran.db")
SERVICE_ACCOUNT_JSON = Path(r"D:\Ajuan\script\service-account.json")
GOOGLE_SHEET_NAME = "Ajuan Pembayaran"


def fetch_rows() -> list[list[str]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT id_ajuan, tanggal_ajuan, nama_pengaju, divisi_cabang, jenis_ajuan,
               nama_penerima_dana, nominal, keterangan, status, link_bukti_transfer, link_memo_ajuan,
               wajib_lpj, tanggal_jatuh_tempo_lpj, status_lpj, link_lpj, created_at, updated_at
        FROM ajuan
        ORDER BY created_at DESC
        """
    ).fetchall()
    conn.close()

    header = [
        "id_ajuan",
        "tanggal_ajuan",
        "nama_pengaju",
        "nama_penerima_dana",
        "divisi_cabang",
        "jenis_ajuan",
        "nominal",
        "keterangan",
        "status",
        "link_bukti_transfer",
        "link_memo_ajuan",
        "wajib_lpj",
        "tanggal_jatuh_tempo_lpj",
        "status_lpj",
        "link_lpj",
        "created_at",
        "updated_at",
    ]
    values = [header]
    for r in rows:
        values.append([str(r[k]) if r[k] is not None else "" for k in header])
    return values


def sync_to_google_sheet() -> None:
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive",
    ]
    creds = ServiceAccountCredentials.from_json_keyfile_name(str(SERVICE_ACCOUNT_JSON), scope)
    client = gspread.authorize(creds)

    spreadsheet = client.open(GOOGLE_SHEET_NAME)
    worksheet = spreadsheet.sheet1

    values = fetch_rows()
    worksheet.clear()
    worksheet.update(values)
    print("Sinkronisasi ke Google Sheet selesai.")


if __name__ == "__main__":
    sync_to_google_sheet()
