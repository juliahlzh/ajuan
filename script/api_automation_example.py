"""
Contoh otomasi update bukti transfer dan LPJ lewat API Next.js.
Jalankan setelah aplikasi aktif di localhost:3000.
"""

from pathlib import Path

import requests

BASE_URL = "http://localhost:3000"
ID_AJUAN = "AJN-20260420-0001"
FILE_BUKTI = Path(r"D:\Ajuan\contoh_bukti\bukti1.jpg")
FILE_LPJ = Path(r"D:\Ajuan\contoh_bukti\lpj1.pdf")


def upload_bukti() -> None:
    with FILE_BUKTI.open("rb") as f:
        response = requests.post(
            f"{BASE_URL}/api/ajuan/{ID_AJUAN}/bukti",
            files={"file": f},
            timeout=30,
        )
    print("Bukti:", response.status_code, response.json())


def upload_lpj() -> None:
    with FILE_LPJ.open("rb") as f:
        response = requests.post(
            f"{BASE_URL}/api/ajuan/{ID_AJUAN}/lpj",
            files={"file": f},
            data={"nominal_realisasi": "0"},
            timeout=30,
        )
    print("LPJ:", response.status_code, response.json())


if __name__ == "__main__":
    upload_bukti()
    upload_lpj()
