import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "ajuan_pembayaran" / "Ajuan Pembayaran.db"
OUT_PATH = ROOT / "migration-export-ajuan.json"


def rows_as_dicts(cursor, query):
    cursor.execute(query)
    columns = [item[0] for item in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def main():
    if not DB_PATH.exists():
        raise SystemExit(f"Database SQLite tidak ditemukan: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        payload = {
            "ajuan": rows_as_dicts(cursor, "SELECT * FROM ajuan"),
            "audit_logs": rows_as_dicts(cursor, "SELECT * FROM ajuan_audit_log"),
        }
    finally:
        conn.close()

    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Export selesai: {OUT_PATH}")
    print(f"Total ajuan: {len(payload['ajuan'])}")
    print(f"Total audit log: {len(payload['audit_logs'])}")


if __name__ == "__main__":
    main()
