from pathlib import Path

BASE_DIR = Path(r"D:\Ajuan")
DB_DIR = BASE_DIR / "ajuan_pembayaran"
DB_FILE = DB_DIR / "Ajuan Pembayaran.db"
BUKTI_DIR = BASE_DIR / "bukti_tf"
LPJ_DIR = BASE_DIR / "lpj"
MEMO_DIR = BASE_DIR / "memo_ajuan"
UI_DIR = BASE_DIR / "ui"
TEMPLATES_DIR = UI_DIR / "templates"
STATIC_DIR = UI_DIR / "static"
LOG_DIR = BASE_DIR / "logs"

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}
ALLOWED_IMPORT_EXTENSIONS = {"csv", "xlsx"}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


def ensure_directories() -> None:
    for path in [DB_DIR, BUKTI_DIR, LPJ_DIR, MEMO_DIR, UI_DIR, TEMPLATES_DIR, STATIC_DIR, LOG_DIR]:
        path.mkdir(parents=True, exist_ok=True)
