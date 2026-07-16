from pathlib import Path

import pypdfium2 as pdfium
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
PDF_PATH = OUT_DIR / "supericons-media-kit-2026-06-18.pdf"
PREVIEW_PATH = OUT_DIR / "supericons-media-kit-2026-06-18-preview.png"

LOGO_PATH = ROOT / "brand" / "650x149.png"
MARK_PATH = ROOT / "brand" / "512x512.png"


ORANGE = colors.HexColor("#ff5a00")
ORANGE_DARK = colors.HexColor("#e94a00")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#5b6472")
LINE = colors.HexColor("#e5e7eb")
SOFT = colors.HexColor("#f7f8fb")
DEEP = colors.HexColor("#151515")


def fit_image_size(path, max_w, max_h):
    img = ImageReader(str(path))
    w, h = img.getSize()
    scale = min(max_w / w, max_h / h)
    return img, w * scale, h * scale


def draw_wrapped(c, text, x, y, width, font="Helvetica", size=9.5, leading=13, color=MUTED):
    c.setFillColor(color)
    c.setFont(font, size)
    words = text.split()
    lines = []
    line = ""
    for word in words:
        test = f"{line} {word}".strip()
        if c.stringWidth(test, font, size) <= width:
            line = test
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)

    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_title(c, text, x, y):
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x, y, text)


def draw_card(c, x, y, w, h, title):
    c.setFillColor(colors.white)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, 12, stroke=1, fill=1)
    draw_title(c, title, x + 16, y + h - 28)
    c.setStrokeColor(LINE)
    c.line(x + 16, y + h - 44, x + w - 16, y + h - 44)


def draw_bullets(c, bullets, x, y, width, size=9.1, leading=12.8):
    for bullet in bullets:
        c.setFillColor(ORANGE)
        c.circle(x + 3.5, y + 3.5, 2.3, stroke=0, fill=1)
        y = draw_wrapped(c, bullet, x + 13, y, width - 13, size=size, leading=leading, color=MUTED)
        y -= 4
    return y


def build_pdf():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    page_w, page_h = A4
    c = canvas.Canvas(str(PDF_PATH), pagesize=(page_w, page_h))
    c.setTitle("Supericons Media Kit")
    c.setAuthor("Curly Mole Labs")
    c.setSubject("Partner media kit for Supericons")

    # Background and top accent.
    c.setFillColor(colors.white)
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)
    c.setFillColor(SOFT)
    c.rect(0, page_h - 104, page_w, 104, fill=1, stroke=0)
    c.setFillColor(ORANGE)
    c.rect(0, page_h - 7, page_w, 7, fill=1, stroke=0)

    margin = 40
    logo, logo_w, logo_h = fit_image_size(LOGO_PATH, 198, 46)
    c.drawImage(logo, margin, page_h - 74, width=logo_w, height=logo_h, mask="auto")

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawRightString(page_w - margin, page_h - 43, "Media Kit - 2026")
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(INK)
    c.drawRightString(page_w - margin, page_h - 59, "A Curly Mole Labs product")

    # Hero.
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 25)
    c.drawString(margin, page_h - 142, "AI-native icons for")
    c.drawString(margin, page_h - 172, "developers and AI builders")
    draw_wrapped(
        c,
        "Supericons helps modern software teams find SVG icons, logo references, UI assets, and agentic AI interface patterns for real product work.",
        margin,
        page_h - 202,
        342,
        font="Helvetica",
        size=10.2,
        leading=15,
        color=MUTED,
    )

    # Hero visual card.
    hero_card_x = page_w - margin - 154
    hero_card_y = page_h - 210
    c.setFillColor(DEEP)
    c.roundRect(hero_card_x, hero_card_y, 154, 104, 18, fill=1, stroke=0)
    mark, mark_w, mark_h = fit_image_size(MARK_PATH, 50, 50)
    c.drawImage(mark, hero_card_x + 23, hero_card_y + 27, width=mark_w, height=mark_h, mask="auto")
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(hero_card_x + 84, hero_card_y + 71, "Intent-led")
    c.drawString(hero_card_x + 84, hero_card_y + 56, "placements")
    draw_wrapped(
        c,
        "CTAs match icon or guide intent.",
        hero_card_x + 84,
        hero_card_y + 36,
        58,
        size=7.1,
        leading=8.4,
        color=colors.HexColor("#d1d5db"),
    )

    # Main cards.
    card_w = page_w - (margin * 2)
    about_y = 478
    draw_card(c, margin, about_y, card_w, 140, "About Supericons")
    draw_wrapped(
        c,
        "Supericons is an AI-native icon library and design resource by Curly Mole Labs. It serves developers, designers, AI builders, SaaS makers, and product teams who need high-quality visual assets for modern software.",
        margin + 16,
        about_y + 82,
        card_w - 32,
        size=9.4,
        leading=13.2,
        color=MUTED,
    )
    draw_bullets(
        c,
        [
            "SVG icon search and preview workflows",
            "AI tool logos and agentic interface concepts",
            "MCP access for AI coding tools and builder workflows",
        ],
        margin + 16,
        about_y + 50,
        card_w - 32,
    )

    placements_y = 304
    draw_card(c, margin, placements_y, card_w, 154, "Partner Placements")
    draw_bullets(
        c,
        [
            "Contextual CTAs inside icon preview panels and relevant guides",
            "Icon detail pages that match brand, tool, or category intent",
            "Curated recommendations for AI app builders, developer tools, design tools, and SaaS workflows",
            "Paid or affiliate placements are labeled clearly and kept separate from organic search relevance",
        ],
        margin + 16,
        placements_y + 92,
        card_w - 32,
        size=8.9,
        leading=12.3,
    )

    # Bottom cards.
    bottom_y = 130
    gap = 16
    col_w = (card_w - gap) / 2
    draw_card(c, margin, bottom_y, col_w, 154, "Audience")
    tags = [
        "AI tools",
        "developer tools",
        "SVG icons",
        "design systems",
        "agentic AI",
        "coding agents",
        "MCP",
        "SaaS",
        "app builders",
        "product design",
    ]
    x = margin + 16
    y = bottom_y + 88
    max_tag_x = margin + col_w - 16
    for tag in tags:
        tw = c.stringWidth(tag, "Helvetica-Bold", 8.2) + 18
        if x + tw > max_tag_x:
            x = margin + 16
            y -= 23
        c.setFillColor(colors.HexColor("#fff3ed"))
        c.setStrokeColor(colors.HexColor("#ffd0bd"))
        c.roundRect(x, y, tw, 16, 8, stroke=1, fill=1)
        c.setFillColor(ORANGE_DARK)
        c.setFont("Helvetica-Bold", 8.2)
        c.drawString(x + 9, y + 4.5, tag)
        x += tw + 6

    fit_x = margin + col_w + gap
    draw_card(c, fit_x, bottom_y, col_w, 154, "Best Partner Fit")
    draw_bullets(
        c,
        [
            "AI app builders and coding agents",
            "Developer infrastructure and design tools",
            "Creative AI, UI components, and SaaS tools",
            "Products with useful free trials or builder-friendly offers",
        ],
        fit_x + 16,
        bottom_y + 88,
        col_w - 32,
        size=8.9,
        leading=12.2,
    )

    contact_y = 44
    draw_card(c, margin, contact_y, card_w, 76, "Contact")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9.2)
    c.drawString(margin + 16, contact_y + 20, "Media property")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9.4)
    c.drawString(margin + 16, contact_y + 7, "Supericons")

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9.2)
    c.drawString(margin + 170, contact_y + 20, "Business")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9.4)
    c.drawString(margin + 170, contact_y + 7, "Curly Mole Labs")

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9.2)
    c.drawString(margin + 326, contact_y + 20, "Contact")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9.4)
    c.drawString(margin + 326, contact_y + 7, "Guan Heng Ong, Founder")

    # Footer.
    c.setFillColor(SOFT)
    c.rect(0, 0, page_w, 38, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.1)
    c.drawString(margin, 26, "Website: https://supericons.dev")
    c.drawString(margin + 170, 26, "Email: hello@supericons.dev")
    c.drawString(margin, 13, "Disclosure: paid links are clearly labeled where active.")
    c.drawRightString(page_w - margin, 13, "Singapore")

    c.showPage()
    c.save()


def render_preview():
    pdf = pdfium.PdfDocument(str(PDF_PATH))
    page = pdf[0]
    bitmap = page.render(scale=2.0).to_pil()
    bitmap.save(PREVIEW_PATH)


def validate_text():
    reader = PdfReader(str(PDF_PATH))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    required = [
        "Supericons",
        "Curly Mole Labs",
        "AI-native icons",
        "Partner Placements",
        "hello@supericons.dev",
    ]
    missing = [item for item in required if item not in text]
    if missing:
        raise SystemExit(f"Missing expected PDF text: {missing}")
    print(f"Wrote {PDF_PATH}")
    print(f"Wrote {PREVIEW_PATH}")
    print(f"Pages: {len(reader.pages)}")


if __name__ == "__main__":
    build_pdf()
    render_preview()
    validate_text()
