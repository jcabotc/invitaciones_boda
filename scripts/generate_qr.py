# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "qrcode>=8,<9",
#   "reportlab>=4.2,<5",
# ]
# ///

from __future__ import annotations

import argparse
import csv
import re
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, urlencode

import qrcode
import qrcode.image.svg
from qrcode.constants import ERROR_CORRECT_M
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import Color, HexColor, black, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


DEFAULT_BASE_URL = "https://jcabotc.github.io/invitaciones_boda/"
REQUIRED_COLUMNS = {"reference", "adult1", "adult2", "child"}


@dataclass(frozen=True)
class Invitation:
    reference: str
    adult1: str
    adult2: str
    child: str

    @property
    def names(self) -> list[str]:
        return [name for name in (self.adult1, self.adult2, self.child) if name]

    @property
    def label(self) -> str:
        if len(self.names) == 1:
            return self.names[0]
        return ", ".join(self.names[:-1]) + " y " + self.names[-1]

    @property
    def filename(self) -> str:
        normalized = unicodedata.normalize("NFKD", self.label)
        ascii_label = normalized.encode("ascii", "ignore").decode("ascii").lower()
        slug = re.sub(r"[^a-z0-9]+", "-", ascii_label).strip("-")
        return f"{self.reference}-{slug}.svg"

    def url(self, base_url: str) -> str:
        params = []
        if self.adult1:
            params.append(("adult1", self.adult1))
        if self.adult2:
            params.append(("adult2", self.adult2))
        if self.child:
            params.append(("child", self.child))
        return f"{base_url}?{urlencode(params, quote_via=quote)}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Genera QR personalizados y un PDF A4 imprimible.")
    parser.add_argument("--input", type=Path, default=Path("private/invitados.csv"))
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--pdf", type=Path, default=Path("output/pdf/codigos-qr-invitaciones.pdf"))
    parser.add_argument("--output-dir", type=Path, default=Path("output/qr"))
    return parser.parse_args()


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def read_invitations(path: Path) -> list[Invitation]:
    if not path.exists():
        raise SystemExit(f"No existe {path}. Copia private/invitados.example.csv y rellénalo.")

    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing:
            raise SystemExit(f"Faltan columnas en {path}: {', '.join(sorted(missing))}")
        invitations = [
            Invitation(
                reference=clean(row["reference"]),
                adult1=clean(row["adult1"]),
                adult2=clean(row["adult2"]),
                child=clean(row["child"]),
            )
            for row in reader
            if any(clean(row[column]) for column in REQUIRED_COLUMNS)
        ]

    if not invitations:
        raise SystemExit("La lista de invitaciones está vacía.")
    references = [invitation.reference for invitation in invitations]
    if any(not reference for reference in references) or len(references) != len(set(references)):
        raise SystemExit("Cada invitación necesita una referencia única.")
    if any(not invitation.names for invitation in invitations):
        raise SystemExit("Cada invitación necesita al menos un nombre.")
    return invitations


def generate_svg(url: str, destination: Path) -> None:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    image.save(destination)


def draw_qr(pdf: canvas.Canvas, url: str, x: float, y: float, size: float) -> None:
    widget = QrCodeWidget(url, barLevel="M", barBorder=4)
    x1, y1, x2, y2 = widget.getBounds()
    scale = size / max(x2 - x1, y2 - y1)
    drawing = Drawing(size, size, transform=[scale, 0, 0, scale, -x1 * scale, -y1 * scale])
    drawing.add(widget)
    renderPDF.draw(drawing, pdf, x, y)


def fit_text(text: str, font: str, max_size: float, min_size: float, max_width: float) -> float:
    size = max_size
    while size > min_size and stringWidth(text, font, size) > max_width:
        size -= 0.25
    return size


def draw_invitation_cell(
    pdf: canvas.Canvas,
    invitation: Invitation,
    url: str,
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    olive = HexColor("#6f7f54")
    sand = HexColor("#bda47d")
    pale = Color(239 / 255, 224 / 255, 199 / 255, alpha=0.23)
    cut_size = 41 * mm
    qr_size = 32 * mm
    cut_x = x + width - cut_size - 3 * mm
    cut_y = y + (height - cut_size) / 2
    text_x = x + 4 * mm
    text_width = cut_x - text_x - 4 * mm

    pdf.setFillColor(pale)
    pdf.roundRect(x, y, width, height, 3 * mm, fill=1, stroke=0)
    pdf.setStrokeColor(Color(sand.red, sand.green, sand.blue, alpha=0.45))
    pdf.setLineWidth(0.45)
    pdf.line(x, y, x + width, y)

    pdf.setFillColor(olive)
    pdf.setFont("Helvetica-Bold", 7.5)
    pdf.drawString(text_x, y + height - 10 * mm, f"INVITACIÓN #{invitation.reference}")

    line_y = y + height - 18 * mm
    for person in invitation.names:
        font_size = fit_text(person, "Helvetica-Bold", 11.5, 8.5, text_width)
        pdf.setFillColor(black)
        pdf.setFont("Helvetica-Bold", font_size)
        pdf.drawString(text_x, line_y, person)
        line_y -= 6 * mm

    pdf.saveState()
    pdf.setStrokeColor(sand)
    pdf.setLineWidth(0.7)
    pdf.setDash(2.2, 2.2)
    pdf.roundRect(cut_x, cut_y, cut_size, cut_size, 1.5 * mm, fill=0, stroke=1)
    pdf.restoreState()

    qr_x = cut_x + (cut_size - qr_size) / 2
    qr_y = cut_y + 5.6 * mm
    pdf.setFillColor(white)
    pdf.rect(qr_x, qr_y, qr_size, qr_size, fill=1, stroke=0)
    draw_qr(pdf, url, qr_x, qr_y, qr_size)
    pdf.setFillColor(olive)
    pdf.setFont("Helvetica-Bold", 6.5)
    pdf.drawCentredString(cut_x + cut_size / 2, cut_y + 2.5 * mm, f"#{invitation.reference}")


def generate_pdf(invitations: list[Invitation], urls: list[str], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    page_width, page_height = A4
    margin_x = 10 * mm
    margin_top = 16 * mm
    margin_bottom = 11 * mm
    header_height = 12 * mm
    gap_x = 4 * mm
    columns = 2
    rows = 5
    cell_width = (page_width - 2 * margin_x - gap_x) / columns
    cell_height = (page_height - margin_top - margin_bottom - header_height) / rows
    per_page = columns * rows
    total_pages = (len(invitations) + per_page - 1) // per_page
    pdf = canvas.Canvas(str(destination), pagesize=A4, pageCompression=1)
    pdf.setTitle("Códigos QR - Invitaciones boda")
    pdf.setAuthor("Jaime y Jely")

    for index, (invitation, url) in enumerate(zip(invitations, urls, strict=True)):
        page_index = index // per_page
        position = index % per_page
        if position == 0:
            pdf.setFillColor(white)
            pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)
            pdf.setFillColor(HexColor("#6f7f54"))
            pdf.setFont("Helvetica-Bold", 13)
            pdf.drawString(margin_x, page_height - 11 * mm, "Códigos QR - Invitaciones")
            pdf.setFont("Helvetica", 7.5)
            pdf.setFillColor(HexColor("#555555"))
            pdf.drawRightString(page_width - margin_x, page_height - 10.5 * mm, f"Página {page_index + 1} de {total_pages}")
            pdf.drawString(margin_x, page_height - 15 * mm, "Recortar únicamente por la línea discontinua. Imprimir al 100 %.")

        row = position // columns
        column = position % columns
        x = margin_x + column * (cell_width + gap_x)
        y = page_height - margin_top - header_height - (row + 1) * cell_height
        draw_invitation_cell(pdf, invitation, url, x, y, cell_width, cell_height)

        if position == per_page - 1 or index == len(invitations) - 1:
            pdf.showPage()

    pdf.save()


def write_manifest(invitations: list[Invitation], urls: list[str], destination: Path) -> None:
    with destination.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["reference", "names", "url", "svg"])
        for invitation, url in zip(invitations, urls, strict=True):
            writer.writerow([invitation.reference, invitation.label, url, invitation.filename])


def create_zip(output_dir: Path, svg_paths: list[Path], manifest: Path) -> Path:
    destination = output_dir / "codigos-qr-individuales.zip"
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.write(manifest, manifest.name)
        for path in svg_paths:
            archive.write(path, path.name)
    return destination


def main() -> None:
    args = parse_args()
    invitations = read_invitations(args.input)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for old_svg in args.output_dir.glob("*.svg"):
        old_svg.unlink()

    urls = [invitation.url(args.base_url.rstrip("/") + "/") for invitation in invitations]
    svg_paths = []
    for invitation, url in zip(invitations, urls, strict=True):
        svg_path = args.output_dir / invitation.filename
        generate_svg(url, svg_path)
        svg_paths.append(svg_path)

    manifest = args.output_dir / "manifest.csv"
    write_manifest(invitations, urls, manifest)
    archive = create_zip(args.output_dir, svg_paths, manifest)
    generate_pdf(invitations, urls, args.pdf)
    print(f"Generadas {len(invitations)} invitaciones.")
    print(f"PDF: {args.pdf}")
    print(f"SVG y manifiesto: {args.output_dir}")
    print(f"ZIP: {archive}")


if __name__ == "__main__":
    main()
