import re
from io import BytesIO
from typing import Any

from werkzeug.datastructures import FileStorage

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover
    PdfReader = None

try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None

try:
    import numpy as np
except Exception:  # pragma: no cover
    np = None

try:
    from rapidocr_onnxruntime import RapidOCR
except Exception:  # pragma: no cover
    RapidOCR = None

try:
    import pytesseract
except Exception:  # pragma: no cover
    pytesseract = None

_RAPID_OCR_ENGINE = None


def _get_rapid_ocr_engine():
    global _RAPID_OCR_ENGINE
    if RapidOCR is None:
        return None
    if _RAPID_OCR_ENGINE is None:
        _RAPID_OCR_ENGINE = RapidOCR()
    return _RAPID_OCR_ENGINE


def _normalize_space(text: str) -> str:
    return re.sub(r"[ \t]+", " ", text or "").strip()


def _normalize_multiline(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", (text or "").replace("\r", "\n")).strip()


def _parse_nominal_value(raw: str) -> str:
    digits = re.sub(r"[^0-9]", "", raw or "")
    return digits or ""


def _extract_nomor_memo(text: str) -> str:
    pattern = re.compile(r"\b\d{1,4}\s*/\s*[A-Za-z0-9.\-]+(?:\s*/\s*[A-Za-z0-9.\-]+){2,}\b")
    match = pattern.search(text)
    if not match:
        return ""
    nomor = re.sub(r"\s*/\s*", "/", match.group(0))
    return nomor.strip()


def _extract_perihal(text: str) -> str:
    match = re.search(r"perihal\s*(?::|-)?\s*(.+)", text, flags=re.IGNORECASE)
    if not match:
        return ""
    tail = match.group(1).strip()
    if not tail:
        return ""
    perihal = tail.split("\n", 1)[0].strip()
    if perihal.lower().startswith(("hari", "kepada", "memo")):
        lines = [ln.strip() for ln in text.splitlines()]
        for i, line in enumerate(lines):
            if re.fullmatch(r"perihal\s*:?", line, flags=re.IGNORECASE):
                if i + 1 < len(lines):
                    perihal = lines[i + 1]
                break
    return _normalize_space(perihal)


def _extract_nominal(text: str) -> str:
    contextual = re.findall(r"(?:dana|pencairan|pengajuan|sebesar)[^\n]{0,100}?rp\s*([0-9][0-9.,\s]{2,})", text, flags=re.IGNORECASE)
    amount_matches = contextual or re.findall(r"rp\s*[:.]?\s*([0-9][0-9.,\s]{2,})", text, flags=re.IGNORECASE)
    if not amount_matches:
        amount_matches = re.findall(r"sebesar\s*([0-9][0-9.,\s]{2,})", text, flags=re.IGNORECASE)

    values: list[int] = []
    for raw in amount_matches:
        parsed = _parse_nominal_value(raw)
        if parsed:
            values.append(int(parsed))

    if not values:
        return ""
    return str(min(values))


def _extract_nama_penerima(text: str) -> str:
    banned_words = {"revenue", "sharing", "kerja", "sekolah", "pengajuan", "memo", "dana", "direktur"}

    def _is_likely_name(candidate: str) -> bool:
        c = _normalize_space(candidate)
        if len(c) < 3:
            return False
        words = c.split()
        if len(words) > 5:
            return False
        lowered = c.lower()
        if any(w in lowered for w in banned_words):
            return False
        return True

    match_rekening_an = re.search(
        r"rekening[\s\S]{0,140}?(?:^|[^A-Za-z])a\s*[\.\-]?\s*n[\.\-]?\s*([\s\S]{0,80})",
        text,
        flags=re.IGNORECASE,
    )
    if match_rekening_an:
        chunk = match_rekening_an.group(1)
        chunk = chunk.replace("_", " ")
        chunk = re.sub(r"\b(?:rekening|bank|mandiri|bca|bni|bri)\b", " ", chunk, flags=re.IGNORECASE)
        chunk = re.sub(r"[0-9]+", " ", chunk)
        chunk = re.sub(r"[^A-Za-z .'\-\n]", " ", chunk)
        for line in chunk.splitlines():
            candidate = _normalize_space(line)
            if "rekening" in candidate.lower():
                continue
            if _is_likely_name(candidate):
                return candidate.strip(" .,:;-")

    match = re.search(r"rekening[\s\S]{0,240}", text, flags=re.IGNORECASE)
    if match:
        chunk = match.group(0)
        chunk = re.sub(r"\b(?:rekening|bank|mandiri|bca|bni|bri)\b", " ", chunk, flags=re.IGNORECASE)
        chunk = re.sub(r"[0-9]+", " ", chunk)
        chunk = re.sub(r"[^A-Za-z .'\-\n]", " ", chunk)
        for line in chunk.splitlines():
            candidate = _normalize_space(line)
            if "rekening" in candidate.lower():
                continue
            if _is_likely_name(candidate):
                return candidate.strip(" .,:;-")
    return ""


def detect_fields_from_text(text: str) -> dict[str, str]:
    normalized = _normalize_multiline(text)
    return {
        "nomor_memo": _extract_nomor_memo(normalized),
        "perihal": _extract_perihal(normalized),
        "nominal": _extract_nominal(normalized),
        "nama_penerima_dana": _extract_nama_penerima(normalized),
    }


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    if PdfReader is None:
        raise ValueError("Parser PDF belum tersedia. Jalankan: pip install pypdf")
    reader = PdfReader(BytesIO(file_bytes))
    chunks: list[str] = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return _normalize_multiline("\n".join(chunks))


def _extract_text_from_image(file_bytes: bytes) -> str:
    if Image is None:
        raise ValueError("Parser gambar belum tersedia. Jalankan: pip install pillow")
    image = Image.open(BytesIO(file_bytes))

    rapid = _get_rapid_ocr_engine()
    if rapid is not None and np is not None:
        image_rgb = image.convert("RGB")
        img_np = np.array(image_rgb)
        result, _ = rapid(img_np)
        if result:
            lines = []
            for item in result:
                if isinstance(item, (list, tuple)) and len(item) >= 2:
                    lines.append(str(item[1]))
            merged = _normalize_multiline("\n".join(lines))
            if merged:
                return merged

    if pytesseract is None:
        raise ValueError(
            "OCR belum tersedia. Jalankan: pip install rapidocr-onnxruntime "
            "atau install Tesseract OCR + pytesseract."
        )

    try:
        text = pytesseract.image_to_string(image, lang="ind+eng")
    except Exception:
        text = pytesseract.image_to_string(image, lang="eng")
    return _normalize_multiline(text)


def detect_fields_from_upload(file_obj: FileStorage) -> dict[str, Any]:
    filename = (file_obj.filename or "").strip()
    if not filename or "." not in filename:
        raise ValueError("File memo tidak valid.")

    ext = filename.rsplit(".", 1)[1].lower()
    file_bytes = file_obj.read()
    file_obj.stream.seek(0)

    if ext == "pdf":
        raw_text = _extract_text_from_pdf(file_bytes)
    elif ext in {"jpg", "jpeg", "png"}:
        raw_text = _extract_text_from_image(file_bytes)
    else:
        raise ValueError("Format file deteksi harus jpg, jpeg, png, atau pdf.")

    return {
        "raw_text": raw_text,
        "fields": detect_fields_from_text(raw_text),
    }
