from datetime import datetime
from pathlib import Path

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from config import ALLOWED_EXTENSIONS, BUKTI_DIR, LPJ_DIR, MEMO_DIR


def is_allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    return filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _save_file(
    id_ajuan: str,
    file_obj: FileStorage,
    parent_dir: Path,
    file_prefix: str,
    link_prefix: str,
) -> tuple[Path, str]:
    extension = file_obj.filename.rsplit(".", 1)[1].lower()
    tanggal = datetime.now().strftime("%Y%m%d")
    filename = secure_filename(f"{file_prefix}_{id_ajuan}_{tanggal}.{extension}")

    target_dir = parent_dir / id_ajuan
    target_dir.mkdir(parents=True, exist_ok=True)

    target_path = target_dir / filename
    file_obj.save(target_path)

    relative_link = f"/{link_prefix}/{id_ajuan}/{filename}"
    return target_path, relative_link


def save_bukti_file(id_ajuan: str, file_obj: FileStorage) -> tuple[Path, str]:
    return _save_file(
        id_ajuan=id_ajuan,
        file_obj=file_obj,
        parent_dir=BUKTI_DIR,
        file_prefix="BuktiTF",
        link_prefix="bukti",
    )


def save_lpj_file(id_ajuan: str, file_obj: FileStorage) -> tuple[Path, str]:
    return _save_file(
        id_ajuan=id_ajuan,
        file_obj=file_obj,
        parent_dir=LPJ_DIR,
        file_prefix="LPJ",
        link_prefix="lpj",
    )


def save_memo_file(id_ajuan: str, file_obj: FileStorage) -> tuple[Path, str]:
    return _save_file(
        id_ajuan=id_ajuan,
        file_obj=file_obj,
        parent_dir=MEMO_DIR,
        file_prefix="MemoAjuan",
        link_prefix="memo",
    )
