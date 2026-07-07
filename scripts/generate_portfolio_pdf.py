from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


BASE_DIR = Path(r"D:\Ajuan")
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_FILE = OUTPUT_DIR / "julia_nurhalizah_portfolio.pdf"


@dataclass(frozen=True)
class Role:
    title: str
    company: str
    period: str
    bullets: list[str]


PROFILE = {
    "name": "Julia Nurhalizah",
    "headline": "Finance Staff | Accounting Graduate",
    "location": "South Jakarta, Indonesia",
    "phone": "085819679164",
    "email": "julianurhalizah0177@gmail.com",
    "summary": (
        "Accounting graduate with hands-on experience in finance operations, "
        "transaction verification, budgeting, and reporting. Strong attention to detail "
        "with a commitment to accurate and reliable financial documentation."
    ),
    "skills": [
        "Microsoft Excel",
        "Accounting Software",
        "Financial Analysis",
        "Data Management",
        "Procurement",
        "Attention to Detail",
        "Team Collaboration",
        "Time Management",
    ],
    "education": {
        "campus": "Universitas Pembangunan Nasional Veteran Jakarta",
        "major": "Bachelor of Accounting",
        "period": "Sep 2020 - Jan 2024",
        "gpa": "3.78/4.00",
    },
    "certifications": [
        "Certified Zahir Accounting",
        "Certified Tax Brevet A & B",
        "Certified Mitigation in Procurement",
        "Certified Akuntansi Ahli BNSP",
    ],
    "organization": [
        "Secretary, Himpunan Mahasiswa S1 Akuntansi (Jan 2023 - Dec 2023)",
        "Treasurer, S1 Akuntansi Mengabdi (Feb 2022 - Jul 2022)",
    ],
}

ROLES = [
    Role(
        title="Finance Staff",
        company="PT Nurulfikri Bina Prestasi",
        period="Oct 2024 - Present",
        bullets=[
            "Verified and reconciled 500+ monthly transactions across 10+ branch offices with high accuracy.",
            "Analyzed monthly budget realization reports to support financial planning decisions.",
            "Supported internal audit processes by preparing comprehensive documentation and resolving discrepancies.",
        ],
    ),
    Role(
        title="Support Treasury Intern",
        company="Astra Credit Companies",
        period="Jan 2024 - Jun 2024",
        bullets=[
            "Processed finance payments and supported treasury team operations.",
            "Extracted and analyzed AOL system data for finance monitoring and reporting.",
            "Improved payment workflow efficiency and reduced processing time.",
        ],
    ),
    Role(
        title="General Intern",
        company="PT Telekomunikasi Indonesia",
        period="Apr 2023 - Sep 2023",
        bullets=[
            "Handled reimbursement administration and finance data entry.",
            "Verified transaction details and maintained data integrity.",
            "Kept records accurate and timely through close coordination with departments.",
        ],
    ),
    Role(
        title="Pricing Team Project Intern",
        company="PT Pertamina Bina Medika IHC",
        period="Sep 2022 - Mar 2023",
        bullets=[
            "Analyzed pricing trends and contributing factors.",
            "Prepared pricing reports and recommendations for adjustments.",
            "Collaborated with the pricing team on strategic pricing models.",
        ],
    ),
]


def _styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleXL",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SubTitle",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#0f766e"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodySoft",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=colors.HexColor("#334155"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=8,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SmallLabel",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#64748b"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="Tiny",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#475569"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletLine",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            leftIndent=10,
            bulletIndent=0,
            textColor=colors.HexColor("#334155"),
        )
    )
    return styles


def _chip(text: str, bg: str = "#dcfce7", fg: str = "#166534") -> Table:
    cell = Paragraph(f"<font color='{fg}'><b>{text}</b></font>", _styles()["Tiny"])
    t = Table([[cell]], colWidths=[42 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor(fg)),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor(bg)),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return t


def _header(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.HexColor("#f8fafc"))
    canvas.rect(0, height - 28 * mm, width, 28 * mm, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor("#0f172a"))
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(18 * mm, height - 12 * mm, PROFILE["name"])
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#475569"))
    canvas.drawRightString(width - 18 * mm, height - 12 * mm, "Portfolio")
    canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
    canvas.line(18 * mm, height - 28 * mm, width - 18 * mm, height - 28 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf(output_path: Path) -> None:
    styles = _styles()
    story = []

    hero = Table(
        [
            [
                Paragraph(PROFILE["name"], styles["TitleXL"]),
                Paragraph(PROFILE["headline"], styles["SubTitle"]),
            ]
        ],
        colWidths=[115 * mm, 65 * mm],
    )
    hero.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(Spacer(1, 8))
    story.append(hero)
    story.append(Spacer(1, 4))

    contact = Table(
        [
            [
                Paragraph(f"Location<br/><b>{PROFILE['location']}</b>", styles["Tiny"]),
                Paragraph(f"Phone<br/><b>{PROFILE['phone']}</b>", styles["Tiny"]),
                Paragraph(f"Email<br/><b>{PROFILE['email']}</b>", styles["Tiny"]),
            ]
        ],
        colWidths=[60 * mm, 50 * mm, 65 * mm],
    )
    contact.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e2e8f0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(contact)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Professional Summary", styles["Section"]))
    story.append(Paragraph(PROFILE["summary"], styles["BodySoft"]))

    story.append(Spacer(1, 5))
    story.append(Paragraph("Core Skills", styles["Section"]))
    chip_rows = []
    row = []
    for i, skill in enumerate(PROFILE["skills"], start=1):
        row.append(_chip(skill))
        if i % 4 == 0:
            chip_rows.append(row)
            row = []
    if row:
        chip_rows.append(row)
    chips = Table(chip_rows, hAlign="LEFT")
    chips.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story.append(chips)

    story.append(Spacer(1, 5))
    story.append(Paragraph("Selected Experience", styles["Section"]))
    for role in ROLES:
        block = [
            Paragraph(f"<b>{role.title}</b> | {role.company}", styles["BodySoft"]),
            Paragraph(role.period, styles["Tiny"]),
        ]
        bullets = [Paragraph(f"• {b}", styles["BulletLine"]) for b in role.bullets]
        block.extend(bullets)
        block.append(Spacer(1, 4))
        story.append(KeepTogether(block))

    story.append(Spacer(1, 2))
    story.append(Paragraph("Education", styles["Section"]))
    edu = PROFILE["education"]
    story.append(
        Paragraph(
            f"<b>{edu['major']}</b><br/>{edu['campus']}<br/>{edu['period']} | GPA {edu['gpa']}",
            styles["BodySoft"],
        )
    )

    story.append(Spacer(1, 5))
    story.append(Paragraph("Certifications", styles["Section"]))
    for cert in PROFILE["certifications"]:
        story.append(Paragraph(f"• {cert}", styles["BulletLine"]))

    story.append(Spacer(1, 5))
    story.append(Paragraph("Organizational Experience", styles["Section"]))
    for org in PROFILE["organization"]:
        story.append(Paragraph(f"• {org}", styles["BulletLine"]))

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=34 * mm,
        bottomMargin=16 * mm,
        title=f"{PROFILE['name']} Portfolio",
        author=PROFILE["name"],
        subject="Portfolio PDF",
    )
    doc.build(story, onFirstPage=_header, onLaterPages=_header)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    build_pdf(OUTPUT_FILE)
    print(f"Created: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
