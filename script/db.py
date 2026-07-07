import sqlite3
from datetime import date, datetime
from typing import Any

from config import DB_FILE


SCHEMA = """
CREATE TABLE IF NOT EXISTS ajuan (
    id_ajuan TEXT PRIMARY KEY,
    tanggal_ajuan TEXT NOT NULL,
    nama_pengaju TEXT NOT NULL,
    nama_penerima_dana TEXT,
    nomor_memo TEXT,
    perihal TEXT,
    divisi_cabang TEXT NOT NULL,
    jenis_ajuan TEXT NOT NULL,
    nominal REAL NOT NULL,
    keterangan TEXT,
    status TEXT NOT NULL DEFAULT 'Menunggu Pembayaran',
    link_bukti_transfer TEXT,
    link_memo_ajuan TEXT,
    wajib_lpj INTEGER NOT NULL DEFAULT 1,
    tanggal_jatuh_tempo_lpj TEXT,
    status_lpj TEXT NOT NULL DEFAULT 'Belum Upload',
    link_lpj TEXT,
    nominal_realisasi REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ajuan_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_ajuan TEXT NOT NULL,
    action TEXT NOT NULL,
    changed_fields TEXT,
    created_at TEXT NOT NULL
);
"""

MISSING_COLUMNS = {
    "nama_penerima_dana": "ALTER TABLE ajuan ADD COLUMN nama_penerima_dana TEXT",
    "nomor_memo": "ALTER TABLE ajuan ADD COLUMN nomor_memo TEXT",
    "perihal": "ALTER TABLE ajuan ADD COLUMN perihal TEXT",
    "link_memo_ajuan": "ALTER TABLE ajuan ADD COLUMN link_memo_ajuan TEXT",
    "wajib_lpj": "ALTER TABLE ajuan ADD COLUMN wajib_lpj INTEGER NOT NULL DEFAULT 1",
    "tanggal_jatuh_tempo_lpj": "ALTER TABLE ajuan ADD COLUMN tanggal_jatuh_tempo_lpj TEXT",
    "status_lpj": "ALTER TABLE ajuan ADD COLUMN status_lpj TEXT NOT NULL DEFAULT 'Belum Upload'",
    "link_lpj": "ALTER TABLE ajuan ADD COLUMN link_lpj TEXT",
    "nominal_realisasi": "ALTER TABLE ajuan ADD COLUMN nominal_realisasi REAL",
}


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(SCHEMA)

        existing_cols = {
            row["name"] for row in conn.execute("PRAGMA table_info(ajuan)").fetchall()
        }
        for col_name, alter_sql in MISSING_COLUMNS.items():
            if col_name not in existing_cols:
                conn.execute(alter_sql)

        conn.execute(
            """
            UPDATE ajuan
            SET status_lpj = CASE
                WHEN COALESCE(wajib_lpj, 1) = 0 THEN 'Tidak Wajib'
                WHEN (status_lpj IS NULL OR status_lpj = '') THEN 'Belum Upload'
                ELSE status_lpj
            END
            """
        )


def generate_id_ajuan() -> str:
    prefix = datetime.now().strftime("AJN-%Y%m%d")
    with get_connection() as conn:
        row = conn.execute(
            "SELECT COUNT(1) AS total FROM ajuan WHERE id_ajuan LIKE ?", (f"{prefix}%",)
        ).fetchone()
    counter = (row["total"] if row else 0) + 1
    return f"{prefix}-{counter:04d}"


def _normalize_wajib_lpj(raw_value: Any) -> int:
    if isinstance(raw_value, bool):
        return 1 if raw_value else 0
    text = str(raw_value or "").strip().lower()
    return 1 if text in {"1", "ya", "yes", "true", "wajib"} else 0


def _default_status_lpj(wajib_lpj: int) -> str:
    return "Belum Upload" if wajib_lpj == 1 else "Tidak Wajib"


def _prepare_common_values(payload: dict[str, Any]) -> tuple:
    wajib_lpj = _normalize_wajib_lpj(payload.get("wajib_lpj", 1))
    realisasi_raw = payload.get("nominal_realisasi", "")
    nominal_realisasi = None if str(realisasi_raw or "").strip() == "" else float(realisasi_raw)
    return (
        payload["tanggal_ajuan"],
        payload["nama_pengaju"],
        payload.get("nama_penerima_dana", ""),
        payload.get("nomor_memo", ""),
        payload.get("perihal", ""),
        payload["divisi_cabang"],
        payload["jenis_ajuan"],
        float(payload["nominal"]),
        payload.get("keterangan", ""),
        payload.get("status", "Menunggu Pembayaran"),
        payload.get("link_bukti_transfer", ""),
        payload.get("link_memo_ajuan", ""),
        wajib_lpj,
        payload.get("tanggal_jatuh_tempo_lpj", "") or None,
        payload.get("status_lpj", _default_status_lpj(wajib_lpj)),
        payload.get("link_lpj", ""),
        nominal_realisasi,
    )


def create_ajuan(payload: dict[str, Any]) -> str:
    now = datetime.now().isoformat(timespec="seconds")
    id_ajuan = generate_id_ajuan()
    common_values = _prepare_common_values(payload)

    values = (
        id_ajuan,
        *common_values,
        now,
        now,
    )

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO ajuan (
                id_ajuan,
                tanggal_ajuan,
                nama_pengaju,
                nama_penerima_dana,
                nomor_memo,
                perihal,
                divisi_cabang,
                jenis_ajuan,
                nominal,
                keterangan,
                status,
                link_bukti_transfer,
                link_memo_ajuan,
                wajib_lpj,
                tanggal_jatuh_tempo_lpj,
                status_lpj,
                link_lpj,
                nominal_realisasi,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            values,
        )
    return id_ajuan


def upsert_import_ajuan(payload: dict[str, Any]) -> tuple[str, str]:
    now = datetime.now().isoformat(timespec="seconds")
    id_ajuan = (payload.get("id_ajuan") or "").strip() or generate_id_ajuan()
    common_values = _prepare_common_values(payload)

    with get_connection() as conn:
        exists = conn.execute(
            "SELECT 1 FROM ajuan WHERE id_ajuan = ?", (id_ajuan,)
        ).fetchone()

        if exists:
            conn.execute(
                """
                UPDATE ajuan
                SET tanggal_ajuan = ?,
                    nama_pengaju = ?,
                    nama_penerima_dana = ?,
                    nomor_memo = ?,
                    perihal = ?,
                    divisi_cabang = ?,
                    jenis_ajuan = ?,
                    nominal = ?,
                    keterangan = ?,
                    status = ?,
                    link_bukti_transfer = ?,
                    link_memo_ajuan = ?,
                    wajib_lpj = ?,
                    tanggal_jatuh_tempo_lpj = ?,
                    status_lpj = ?,
                    link_lpj = ?,
                    nominal_realisasi = ?,
                    updated_at = ?
                WHERE id_ajuan = ?
                """,
                (*common_values, now, id_ajuan),
            )
            return id_ajuan, "updated"

        conn.execute(
            """
            INSERT INTO ajuan (
                id_ajuan,
                tanggal_ajuan,
                nama_pengaju,
                nama_penerima_dana,
                nomor_memo,
                perihal,
                divisi_cabang,
                jenis_ajuan,
                nominal,
                keterangan,
                status,
                link_bukti_transfer,
                link_memo_ajuan,
                wajib_lpj,
                tanggal_jatuh_tempo_lpj,
                status_lpj,
                link_lpj,
                nominal_realisasi,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (id_ajuan, *common_values, now, now),
        )
    return id_ajuan, "inserted"


def update_ajuan(id_ajuan: str, payload: dict[str, Any]) -> bool:
    now = datetime.now().isoformat(timespec="seconds")
    common_values = _prepare_common_values(payload)
    with get_connection() as conn:
        result = conn.execute(
            """
            UPDATE ajuan
            SET tanggal_ajuan = ?,
                nama_pengaju = ?,
                nama_penerima_dana = ?,
                nomor_memo = ?,
                perihal = ?,
                divisi_cabang = ?,
                jenis_ajuan = ?,
                nominal = ?,
                keterangan = ?,
                status = ?,
                link_bukti_transfer = ?,
                link_memo_ajuan = ?,
                wajib_lpj = ?,
                tanggal_jatuh_tempo_lpj = ?,
                status_lpj = ?,
                link_lpj = ?,
                nominal_realisasi = ?,
                updated_at = ?
            WHERE id_ajuan = ?
            """,
            (*common_values, now, id_ajuan),
        )
        return result.rowcount > 0


def list_ajuan(
    keyword: str | None = None,
    cabang: str | None = None,
    tanggal_awal: str | None = None,
    tanggal_akhir: str | None = None,
    status: str | None = None,
    tahun: str | None = None,
) -> list[sqlite3.Row]:
    query = "SELECT * FROM ajuan WHERE 1=1"
    params: list[Any] = []

    if keyword:
        query += " AND (id_ajuan LIKE ? OR nama_pengaju LIKE ? OR nama_penerima_dana LIKE ?)"
        params.extend([f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"])

    if cabang:
        query += " AND divisi_cabang LIKE ?"
        params.append(f"%{cabang}%")

    if tanggal_awal:
        query += " AND tanggal_ajuan >= ?"
        params.append(tanggal_awal)

    if tanggal_akhir:
        query += " AND tanggal_ajuan <= ?"
        params.append(tanggal_akhir)

    if status:
        query += " AND status = ?"
        params.append(status)

    if tahun:
        query += " AND substr(tanggal_ajuan, 1, 4) = ?"
        params.append(tahun)

    query += " ORDER BY tanggal_ajuan DESC, created_at DESC"

    with get_connection() as conn:
        rows = conn.execute(query, params).fetchall()
    return rows


def list_pending_lpj() -> list[sqlite3.Row]:
    query = """
    SELECT * FROM ajuan
    WHERE wajib_lpj = 1 AND status_lpj != 'Sudah Upload'
    ORDER BY tanggal_jatuh_tempo_lpj ASC, created_at DESC
    """
    with get_connection() as conn:
        return conn.execute(query).fetchall()


def list_available_years() -> list[str]:
    query = """
    SELECT DISTINCT substr(tanggal_ajuan, 1, 4) AS tahun
         , COUNT(1) AS total
    FROM ajuan
    WHERE tanggal_ajuan IS NOT NULL
      AND length(tanggal_ajuan) >= 4
    GROUP BY substr(tanggal_ajuan, 1, 4)
    HAVING COUNT(1) >= 2
    ORDER BY tahun DESC
    """
    with get_connection() as conn:
        rows = conn.execute(query).fetchall()
    return [row["tahun"] for row in rows if row["tahun"]]


def list_divisi_cabang_options() -> list[str]:
    query = """
    SELECT DISTINCT trim(divisi_cabang) AS divisi_cabang
    FROM ajuan
    WHERE divisi_cabang IS NOT NULL
      AND trim(divisi_cabang) != ''
    ORDER BY divisi_cabang ASC
    """
    with get_connection() as conn:
        rows = conn.execute(query).fetchall()
    return [row["divisi_cabang"] for row in rows if row["divisi_cabang"]]


def get_ajuan_by_id(id_ajuan: str) -> sqlite3.Row | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM ajuan WHERE id_ajuan = ?", (id_ajuan,)).fetchone()
    return row


def find_possible_duplicates(
    tanggal_ajuan: str,
    nominal: float,
    nama_penerima_dana: str,
    limit: int = 5,
) -> list[sqlite3.Row]:
    query = """
    SELECT id_ajuan, tanggal_ajuan, nominal, nama_penerima_dana, divisi_cabang, jenis_ajuan
    FROM ajuan
    WHERE tanggal_ajuan = ?
      AND ABS(nominal - ?) < 0.0001
      AND lower(trim(coalesce(nama_penerima_dana, ''))) = lower(trim(?))
    ORDER BY created_at DESC
    LIMIT ?
    """
    with get_connection() as conn:
        return conn.execute(query, (tanggal_ajuan, float(nominal), nama_penerima_dana, limit)).fetchall()


def update_bukti_transfer(id_ajuan: str, link_bukti: str, status: str = "Selesai Dibayar") -> None:
    now = datetime.now().isoformat(timespec="seconds")
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE ajuan
            SET link_bukti_transfer = ?, status = ?, updated_at = ?
            WHERE id_ajuan = ?
            """,
            (link_bukti, status, now, id_ajuan),
        )


def update_lpj(
    id_ajuan: str,
    link_lpj: str,
    status_lpj: str = "Sudah Upload",
    nominal_realisasi: float | None = None,
) -> None:
    now = datetime.now().isoformat(timespec="seconds")
    with get_connection() as conn:
        if nominal_realisasi is None:
            conn.execute(
                """
                UPDATE ajuan
                SET link_lpj = ?, status_lpj = ?, updated_at = ?
                WHERE id_ajuan = ?
                """,
                (link_lpj, status_lpj, now, id_ajuan),
            )
        else:
            conn.execute(
                """
                UPDATE ajuan
                SET link_lpj = ?, status_lpj = ?, nominal_realisasi = ?, updated_at = ?
                WHERE id_ajuan = ?
                """,
                (link_lpj, status_lpj, float(nominal_realisasi), now, id_ajuan),
            )


def update_memo_ajuan(id_ajuan: str, link_memo: str) -> None:
    now = datetime.now().isoformat(timespec="seconds")
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE ajuan
            SET link_memo_ajuan = ?, updated_at = ?
            WHERE id_ajuan = ?
            """,
            (link_memo, now, id_ajuan),
        )


def derive_status_lpj(row: sqlite3.Row) -> str:
    if int(row["wajib_lpj"] or 0) == 0:
        return "Tidak Wajib"

    status_lpj = (row["status_lpj"] or "").strip()
    if status_lpj == "Sudah Upload":
        return "Sudah Upload"

    due = (row["tanggal_jatuh_tempo_lpj"] or "").strip()
    if not due:
        return "Belum Upload"

    try:
        due_date = datetime.strptime(due, "%Y-%m-%d").date()
    except ValueError:
        return "Belum Upload"

    today = date.today()
    if due_date < today:
        return "Terlambat"
    if due_date == today:
        return "Jatuh Tempo"
    return "Belum Jatuh Tempo"


def derive_status_dana(row: sqlite3.Row) -> str:
    nominal = float(row["nominal"] or 0)
    realisasi = row["nominal_realisasi"]
    if realisasi is None:
        return "Belum Input Realisasi"
    realisasi_f = float(realisasi or 0)
    if realisasi_f < nominal:
        return "Surplus"
    if realisasi_f > nominal:
        return "Defisit"
    return "Sesuai"


def add_audit_log(id_ajuan: str, action: str, changed_fields: str = "") -> None:
    now = datetime.now().isoformat(timespec="seconds")
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO ajuan_audit_log (id_ajuan, action, changed_fields, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (id_ajuan, action, changed_fields, now),
        )


def list_audit_logs(id_ajuan: str, limit: int = 30) -> list[sqlite3.Row]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, id_ajuan, action, changed_fields, created_at
            FROM ajuan_audit_log
            WHERE id_ajuan = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (id_ajuan, limit),
        ).fetchall()
    return rows


def delete_ajuan(id_ajuan: str) -> bool:
    with get_connection() as conn:
        result = conn.execute("DELETE FROM ajuan WHERE id_ajuan = ?", (id_ajuan,))
        conn.execute("DELETE FROM ajuan_audit_log WHERE id_ajuan = ?", (id_ajuan,))
        return result.rowcount > 0
