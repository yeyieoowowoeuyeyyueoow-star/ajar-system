"""
Ajeer permit PDF generator.
Produces an A4 PDF that matches the official تصريح أجير – تعاقد أجير template.
"""
from __future__ import annotations

import io
import json
import os

import qrcode
from reportlab.lib.colors import black, white, HexColor
from reportlab.lib.pagesizes import A3, A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader

import arabic_reshaper
from bidi.algorithm import get_display

# ── Page geometry ─────────────────────────────────────────────────────────────
# All layout math below is expressed in A4 "design units". The output page is
# physically A3, but since A3 and A4 share the exact same aspect ratio (ISO
# 216), the whole drawing is uniformly scaled up to fill A3 — same design,
# same proportions, just bigger paper.
PAGE_W, PAGE_H = A4          # 595.28 × 841.89 pt  (design space)
OUTPUT_PAGESIZE = A3         # 841.89 × 1190.55 pt (actual output paper)
SCALE = OUTPUT_PAGESIZE[0] / PAGE_W   # ≈ 1.4142 (== OUTPUT_PAGESIZE[1] / PAGE_H)
# Margins measured directly (in points) from the official reference template
# — the source document uses an asymmetric box: left 57.1pt, right 42.9pt,
# top 30.15pt.
MARGIN        = 57.1                    # left content x-offset
MARGIN_R      = 42.9                    # right-side margin
TOP_Y         = 30.15                   # top y-offset (header top)
CONTENT_W     = PAGE_W - MARGIN - MARGIN_R   # ≈ 495.3 pt

# ── Design tokens ─────────────────────────────────────────────────────────────
# Colors sampled directly from the vector fills/strokes of the official
# reference PDF (not eyeballed): section/label bg = rgb(0.925,0.941,0.945),
# border = rgb(0.808,0.812,0.835).
SECTION_BG  = HexColor('#ECF0F1')   # section header background
LABEL_BG    = HexColor('#ECF0F1')   # label-cell background (same as section header)
BORDER_COLOR = HexColor('#CECFD5')  # all cell/box borders (exact match to reference)
BORDER_W    = 0.75

# Use Cairo (Google Fonts) — same font as the web UI — for visual consistency.
# Regular weight for body copy, Bold for section headers, labels and title.
FONT_R = 'CairoRegular'
FONT_B = 'CairoBold'

# Maps internal permit status values to the Arabic wording used on the
# official Ajeer QR payload (matches the reference template: "ساري").
QR_STATUS_LABELS = {
    'active':    'ساري',
    'pending':   'قيد الانتظار',
    'expired':   'منتهي',
    'rejected':  'مرفوض',
    'suspended': 'موقوف',
}

FONTS_DIR = os.path.join(os.path.dirname(__file__), 'fonts')
ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'assets')
# The reference header carries the Ajeer wordmark and the ministry logo as
# two separate images with a measured gap between them (not one merged
# graphic) — extracted directly from the reference PDF's embedded images.
AJEER_LOGO_PATH    = os.path.join(ASSETS_DIR, 'ajeer_only.png')
MINISTRY_LOGO_PATH = os.path.join(ASSETS_DIR, 'ministry_logo.png')
_fonts_ok = False


# ── Font registration ─────────────────────────────────────────────────────────
def _register() -> None:
    global _fonts_ok
    if _fonts_ok:
        return
    # Cairo-Regular.ttf / Cairo-Bold.ttf are proper static instances (wght 400 / 700)
    # downloaded directly from Google Fonts — distinct files with correct weight.
    cairo_r  = os.path.join(FONTS_DIR, 'Cairo-Regular.ttf')
    cairo_b  = os.path.join(FONTS_DIR, 'Cairo-Bold.ttf')
    fallback = os.path.join(FONTS_DIR, 'Amiri-Regular.ttf')

    r_src = cairo_r if (os.path.exists(cairo_r) and os.path.getsize(cairo_r) > 50_000) else fallback
    b_src = cairo_b if (os.path.exists(cairo_b) and os.path.getsize(cairo_b) > 50_000) else r_src

    try:
        pdfmetrics.registerFont(TTFont(FONT_R, r_src))
    except Exception:
        pass
    try:
        pdfmetrics.registerFont(TTFont(FONT_B, b_src))
    except Exception:
        pass
    _fonts_ok = True


# ── Arabic helpers ────────────────────────────────────────────────────────────
# Cairo font is missing 10 Arabic Presentation Forms (isolated letter forms).
# We map each missing codepoint to its base Arabic equivalent — Cairo carries
# all base Arabic letters (U+0600-06FF) and the shapes are visually identical.
_CAIRO_MISSING_MAP = str.maketrans({
    '\uFE83': '\u0623',  # ﺃ → أ  isolated alef + hamza above
    '\uFE87': '\u0625',  # ﺇ → إ  isolated alef + hamza below
    '\uFE8D': '\u0627',  # ﺍ → ا  isolated alef
    '\uFE8F': '\u0628',  # ﺏ → ب  isolated ba
    '\uFE93': '\u0629',  # ﺓ → ة  isolated ta marbuta
    '\uFE95': '\u062A',  # ﺕ → ت  isolated ta
    '\uFEA9': '\u062F',  # ﺩ → د  isolated dal
    '\uFEAB': '\u0630',  # ﺫ → ذ  isolated thal
    '\uFEAD': '\u0631',  # ﺭ → ر  isolated ra
    '\uFEAF': '\u0632',  # ﺯ → ز  isolated zayn
    '\uFEB9': '\u0635',  # ﺹ → ص  isolated sad
    '\uFED1': '\u0641',  # ﻑ → ف  isolated fa
    '\uFEDD': '\u0644',  # ﻝ → ل  isolated lam
    '\uFEE1': '\u0645',  # ﻡ → م  isolated mim
    '\uFEE5': '\u0646',  # ﻥ → ن  isolated nun
    '\uFEE9': '\u0647',  # ﻩ → ه  isolated ha
    '\uFEED': '\u0648',  # ﻭ → و  isolated waw
    '\uFEEF': '\u0649',  # ﻯ → ى  isolated alef maqsura
    '\uFEF1': '\u064A',  # ﻱ → ي  isolated ya
})


def ar(text: str) -> str:
    """Reshape + bidi-flip Arabic text so ReportLab renders it correctly.
    Also patches the 10 isolated-form codepoints absent from Cairo's cmap."""
    if not text:
        return ''
    shaped = get_display(arabic_reshaper.reshape(str(text)))
    return shaped.translate(_CAIRO_MISSING_MAP)


def _wrap(c: rl_canvas.Canvas, text: str, max_w: float,
          font: str, size: float) -> list[str]:
    """Split Arabic text into lines that fit within max_w points."""
    words = str(text).split()
    lines: list[str] = []
    cur: list[str] = []
    for word in words:
        test = ' '.join(cur + [word])
        if c.stringWidth(ar(test), font, size) <= max_w or not cur:
            cur.append(word)
        else:
            lines.append(' '.join(cur))
            cur = [word]
    if cur:
        lines.append(' '.join(cur))
    return lines or ['']


# ── Low-level drawing helpers ─────────────────────────────────────────────────
def _rl(y_top: float) -> float:
    """Convert page-top coordinate to ReportLab bottom-origin y."""
    return PAGE_H - y_top


def _rect(c, x, rl_y, w, h, fill=white, stroke=None, sw=BORDER_W):
    c.setLineWidth(sw)
    c.setStrokeColor(stroke if stroke is not None else BORDER_COLOR)
    c.setFillColor(fill)
    c.rect(x, rl_y, w, h, fill=1, stroke=1)


def _text_center(c, text, cx, rl_y, font, size, color=black):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawCentredString(cx, rl_y, ar(text))


def _text_right(c, text, rx, rl_y, font, size, color=black):
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawRightString(rx, rl_y, ar(text))


# ── Template building blocks ──────────────────────────────────────────────────
def _section_header(c, label: str, y_top: float, h: float = 24.5) -> float:
    """Draw full-width section-header row. Returns next y_top."""
    rl_y = _rl(y_top) - h
    _rect(c, MARGIN, rl_y, CONTENT_W, h, fill=SECTION_BG)
    _text_center(c, label, MARGIN + CONTENT_W / 2, rl_y + (h - 9) / 2 + 1,
                 FONT_B, 9)
    return y_top + h


def _row4(c, lbl_r: str, val_r: str, lbl_l: str, val_l: str,
          y_top: float, row_h: float = 19,
          widths: tuple[float, float, float, float] = (0.25, 0.25, 0.25, 0.25)) -> float:
    """
    4-column RTL data row.
    Visual (RTL): [lbl_r | val_r | lbl_l | val_l]
    ReportLab LTR columns: [val_l | lbl_l | val_r | lbl_r]
    Each cell wraps onto multiple lines and the row grows to fit the
    tallest cell, matching the official template where the long
    "رقم المنشأة ..." label wraps onto two lines. Column widths (25% each)
    and row heights (19pt / 29.8pt when wrapped) are measured directly
    from the reference template's vector geometry.
    """
    w_lbl_r, w_val_r, w_lbl_l, w_val_l = [CONTENT_W * r for r in widths]
    fs = 9
    pad = 6
    line_h = 10.9

    cols = [
        (MARGIN,                            w_val_l, val_l, False, FONT_R),
        (MARGIN + w_val_l,                  w_lbl_l, lbl_l, True,  FONT_B),
        (MARGIN + w_val_l + w_lbl_l,        w_val_r, val_r, False, FONT_R),
        (MARGIN + w_val_l + w_lbl_l + w_val_r, w_lbl_r, lbl_r, True, FONT_B),
    ]

    wrapped = [(_wrap(c, txt, cw - pad, fn, fs), cx, cw, is_lbl, fn)
               for cx, cw, txt, is_lbl, fn in cols]
    n_lines = max(len(lines) for lines, *_ in wrapped) or 1
    row_h = max(row_h, n_lines * line_h + 8)

    rl_y = _rl(y_top) - row_h
    for lines, cx, cw, is_lbl, fn in wrapped:
        bg = LABEL_BG if is_lbl else white
        _rect(c, cx, rl_y, cw, row_h, fill=bg)
        top = rl_y + row_h - (row_h - len(lines) * line_h) / 2 - 8
        for i, line in enumerate(lines):
            _text_center(c, line, cx + cw / 2, top - i * line_h, fn, fs)

    return y_top + row_h


def _row2(c, label: str, value: str, y_top: float,
          row_h: float = 19, lbl_ratio: float = 0.25) -> float:
    """2-column RTL row: [value | label] (label on right). Wraps long text
    onto multiple lines and grows the row height to fit, matching the
    official template where long labels/values wrap instead of overflowing."""
    lw = CONTENT_W * lbl_ratio
    vw = CONTENT_W - lw
    fs = 9
    pad = 6

    lbl_lines = _wrap(c, label, lw - pad, FONT_B, fs)
    val_lines = _wrap(c, value, vw - pad, FONT_R, fs)
    n_lines = max(len(lbl_lines), len(val_lines), 1)
    line_h = 10.9
    row_h = max(row_h, n_lines * line_h + 8)

    rl_y = _rl(y_top) - row_h
    _rect(c, MARGIN,      rl_y, vw, row_h, fill=white)
    _rect(c, MARGIN + vw, rl_y, lw, row_h, fill=LABEL_BG)

    val_top = rl_y + row_h - (row_h - len(val_lines) * line_h) / 2 - 8
    for i, line in enumerate(val_lines):
        _text_center(c, line, MARGIN + vw / 2, val_top - i * line_h, FONT_R, fs)

    lbl_top = rl_y + row_h - (row_h - len(lbl_lines) * line_h) / 2 - 8
    for i, line in enumerate(lbl_lines):
        _text_center(c, line, MARGIN + vw + lw / 2, lbl_top - i * line_h, FONT_B, fs)

    return y_top + row_h


# ── Main generator ────────────────────────────────────────────────────────────
def generate_permit_pdf(permit: dict) -> bytes:
    """Return PDF bytes for the given enriched permit dict."""
    _register()

    buf = io.BytesIO()
    c   = rl_canvas.Canvas(buf, pagesize=OUTPUT_PAGESIZE)
    c.setTitle(f'تصريح أجير – {permit.get("permitNumber", "")}')
    # Scale every subsequent drawing command uniformly so the A4-designed
    # layout fills the A3 page identically (same design, bigger paper).
    c.scale(SCALE, SCALE)

    worker      = permit.get('worker') or {}
    provider    = permit.get('providerCompany') or {}
    beneficiary = permit.get('beneficiaryCompany') or {}
    permit_num  = permit.get('permitNumber', '')

    y = TOP_Y   # current top-of-cursor (increases downward)

    # ═════════════════════════════════════════════════════════════════════════
    # 1 ▸ HEADER BOX  (geometry measured from the reference template: a
    #     single 61.55pt-tall row split into 3 bordered cells — QR / title /
    #     logo — in ratios ≈ 0.158 : 0.515 : 0.327)
    # ═════════════════════════════════════════════════════════════════════════
    hdr_h = 61.55
    rl_hdr = _rl(y) - hdr_h

    qr_cell_w    = CONTENT_W * 0.158
    title_cell_w = CONTENT_W * 0.515
    logo_cell_w  = CONTENT_W - qr_cell_w - title_cell_w

    # Outer border + internal column dividers (3-cell header row)
    _rect(c, MARGIN, rl_hdr, CONTENT_W, hdr_h, fill=white)
    c.setLineWidth(BORDER_W)
    c.setStrokeColor(BORDER_COLOR)
    c.line(MARGIN + qr_cell_w, rl_hdr, MARGIN + qr_cell_w, rl_hdr + hdr_h)
    c.line(MARGIN + qr_cell_w + title_cell_w, rl_hdr,
           MARGIN + qr_cell_w + title_cell_w, rl_hdr + hdr_h)

    # QR code
    qr_sz = 43.25
    qr_x  = MARGIN + (qr_cell_w - qr_sz) / 2
    qr_y  = rl_hdr + hdr_h - qr_sz - 3.95
    try:
        id_raw = worker.get('idNumber', '')
        id_number = int(id_raw) if str(id_raw).isdigit() else id_raw
        qr_payload = json.dumps({
            'id_number': id_number,
            'occupation': permit.get('occupation', worker.get('occupation', '')),
            'status': QR_STATUS_LABELS.get(permit.get('status', ''), permit.get('status', '')),
            'issue_date': permit.get('startDate', ''),
            'expiry_date': permit.get('expiryDate', ''),
        }, ensure_ascii=False, separators=(',', ':'))
        qr = qrcode.QRCode(version=1, box_size=3, border=1,
                           error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(qr_payload)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color='black', back_color='white')
        qr_buf = io.BytesIO()
        qr_img.save(qr_buf, 'PNG')
        qr_buf.seek(0)
        c.drawImage(ImageReader(qr_buf), qr_x, qr_y, width=qr_sz, height=qr_sz,
                    preserveAspectRatio=True)
    except Exception:
        pass

    # Permit number below QR (baseline sits ~6pt above the header's bottom
    # border, matching the reference's tight QR/number grouping exactly)
    c.setFont(FONT_R, 8.65)
    c.setFillColor(black)
    c.drawCentredString(qr_x + qr_sz / 2, rl_hdr + 6.05, permit_num)

    # Title (centered in the title cell, matching reference size ≈13pt)
    title_cx = MARGIN + qr_cell_w + title_cell_w / 2
    c.setFont(FONT_B, 13)
    c.setFillColor(black)
    c.drawCentredString(title_cx, rl_hdr + hdr_h / 2 - 4,
                        ar('تصريح أجير – تعاقد أجير'))

    # Logos: two separate images (Ajeer wordmark, then the ministry logo)
    # sitting side by side with a measured 12.25pt gap — both vertically
    # centered in the logo cell, exactly as in the reference header.
    logo_cell_x0 = MARGIN + qr_cell_w + title_cell_w
    logo_pad_l   = 9.37 * (logo_cell_w / 160.38)
    logo_gap     = 12.25 * (logo_cell_w / 160.38)
    ajeer_h      = 29.78
    ministry_h   = 28.79
    if os.path.exists(AJEER_LOGO_PATH) and os.path.exists(MINISTRY_LOGO_PATH):
        try:
            aj = ImageReader(AJEER_LOGO_PATH)
            aw_px, ah_px = aj.getSize()
            aj_w = ajeer_h * aw_px / ah_px
            aj_x = logo_cell_x0 + logo_pad_l
            aj_y = rl_hdr + (hdr_h - ajeer_h) / 2
            c.drawImage(aj, aj_x, aj_y, width=aj_w, height=ajeer_h,
                        preserveAspectRatio=True, mask='auto')

            mn = ImageReader(MINISTRY_LOGO_PATH)
            mw_px, mh_px = mn.getSize()
            mn_w = ministry_h * mw_px / mh_px
            mn_x = aj_x + aj_w + logo_gap
            mn_y = rl_hdr + (hdr_h - ministry_h) / 2
            c.drawImage(mn, mn_x, mn_y, width=mn_w, height=ministry_h,
                        preserveAspectRatio=True, mask='auto')
        except Exception:
            pass

    y += hdr_h

    # ═════════════════════════════════════════════════════════════════════════
    # 2 ▸ INTRO PARAGRAPH
    #     Gap-before / line-height / gap-after measured from the reference
    #     (46.7pt gap, 13.5pt leading, ~19pt gap before the data table).
    # ═════════════════════════════════════════════════════════════════════════
    y += 46.7
    intro = (
        'نشعركم أنه تم التعاقد من قبلنا كجهة مقدمة للخدمة مع الجهة المستفيدة '
        'من الخدمة حسب المعلومات المبينة أدناه، ولذلك تم تسجيل معلومات العقد '
        'لتكون بحوزة العامل لإثبات عدم مخالفته لنظام العمل ولتقديمها إلى من '
        'يهمه الأمر من الجهات المختصة عند طلبها للتحقق من صحة تواجده في '
        'مكان تقديم الخدمة'
    )
    c.setFont(FONT_R, 9)
    c.setFillColor(black)
    lines = _wrap(c, intro, CONTENT_W, FONT_R, 9)
    lh = 13.5
    for i, line in enumerate(lines):
        rl_y = _rl(y) - (i + 1) * lh
        c.drawCentredString(MARGIN + CONTENT_W / 2, rl_y, ar(line))
    y += len(lines) * lh + 19

    # ═════════════════════════════════════════════════════════════════════════
    # 3 ▸ WORKER DATA
    # ═════════════════════════════════════════════════════════════════════════
    y = _section_header(c, 'بيانات العامل', y, h=24)
    y = _row4(c,
              lbl_r='اسم العامل',           val_r=worker.get('fullName', ''),
              lbl_l='المهنة',               val_l=permit.get('occupation', worker.get('occupation', '')),
              y_top=y)
    y = _row4(c,
              lbl_r='رقم الهوية / الإقامة', val_r=worker.get('idNumber', ''),
              lbl_l='الجنسية',              val_l=worker.get('nationality', ''),
              y_top=y)

    # ═════════════════════════════════════════════════════════════════════════
    # 4 ▸ SERVICE PROVIDER
    # ═════════════════════════════════════════════════════════════════════════
    y = _section_header(c, 'بيانات مقدم الخدمة', y)
    y = _row4(c,
              lbl_r='المنشأة المقدمة للخدمة',
              val_r=provider.get('name', ''),
              lbl_l='رقم المنشأة في وزارة الموارد البشرية والتنمية الاجتماعية',
              val_l=provider.get('companyNumber', ''),
              y_top=y)

    # ═════════════════════════════════════════════════════════════════════════
    # 5 ▸ BENEFICIARY
    # ═════════════════════════════════════════════════════════════════════════
    y = _section_header(c, 'بيانات المستفيد من الخدمة', y)
    y = _row4(c,
              lbl_r='المنشأة المستفيدة من الخدمة',
              val_r=beneficiary.get('name', ''),
              lbl_l='رقم المنشأة في وزارة الموارد البشرية والتنمية الاجتماعية',
              val_l=beneficiary.get('companyNumber', ''),
              y_top=y)

    # ═════════════════════════════════════════════════════════════════════════
    # 6 ▸ PERMIT DATA
    # ═════════════════════════════════════════════════════════════════════════
    y = _section_header(c, 'بيانات التصريح', y)

    # Row: نبذة عن التعاقد  (2-col, label on right)
    y = _row2(c, 'نبذة عن التعاقد',
              permit.get('notes') or permit.get('occupation', ''), y, lbl_ratio=0.25)

    # Row: dates (4-col)
    y = _row4(c,
              lbl_r='تاريخ بداية التصريح', val_r=permit.get('startDate', ''),
              lbl_l='تاريخ نهاية التصريح', val_l=permit.get('expiryDate', ''),
              y_top=y)

    # Row: work location (2-col, label on right)
    y = _row2(c, 'مواقع العمل', permit.get('workLocation', ''), y, lbl_ratio=0.25)
    y += 4.9

    # ═════════════════════════════════════════════════════════════════════════
    # 7 ▸ DECLARATIONS
    #     Same 9pt weight as the rest of the document (no enlargement/bold in
    #     the reference); 16.2pt leading throughout, no extra gap between
    #     bullets — matches the reference's continuous line rhythm exactly.
    # ═════════════════════════════════════════════════════════════════════════
    _text_center(c, 'إقرارات', MARGIN + CONTENT_W / 2,
                 _rl(y) - 9, FONT_B, 9)
    y += 25.5

    _text_right(c,
                'أقر أنا المنشأة المقدمة للخدمة والموضحة بياناتي أعلاه وأتعهد بـ:',
                MARGIN + CONTENT_W, _rl(y) - 9, FONT_B, 9)
    y += 16.2

    BULLETS = [
        ('إن العامل حامل هذا التصريح يقر ويتعهد بأن البيانات المدونة فيه صحيحة على '
         'مسؤوليته الشخصية، وأنه يعمل لدى المنشأة ولحسابها، بموجب رخصة إقامة سارية '
         'المفعول. وأتحمل أي تبعات قانونية أو غرامات تترتب على خلاف المذكور أعلاه.'),
        'الالتزام والتقيد بأنظمة العمل والعمال وأي أنظمة و لوائح وقرارات أخرى ذات علاقة.',
        ('أن الموقع الإلكتروني الخاص بأجير أو القائمين عليه هو عبارة عن وسيط إلكتروني '
         'فقط ما بين الباحثين عن العمل وأصحاب الأعمال وبدون أي التزام قانوني أو غيره '
         'على القائمين على موقع أجير.'),
        'أي تعديل أو كشط في هذا التصريح يجعله لاغياً.',
    ]

    fs  = 9
    blh = 16.2   # bullet line height (measured — continuous, no paragraph gap)
    c.setFont(FONT_R, fs)
    c.setFillColor(black)
    for bullet in BULLETS:
        blines = _wrap(c, bullet, CONTENT_W - 14, FONT_R, fs)
        for i, bline in enumerate(blines):
            rl_y = _rl(y) - (i + 1) * blh
            if i == 0:
                c.setFont(FONT_B, fs)
                c.drawRightString(MARGIN + CONTENT_W, rl_y + 1, '•')
                c.setFont(FONT_R, fs)
            c.drawRightString(MARGIN + CONTENT_W - 13, rl_y, ar(bline))
        y += len(blines) * blh

    # ═════════════════════════════════════════════════════════════════════════
    # 8 ▸ FOOTER (pinned to bottom — no separator line in the reference)
    # ═════════════════════════════════════════════════════════════════════════
    footer_top = PAGE_H - 784.8

    c.setFont(FONT_R, 9)
    c.setFillColor(black)
    c.drawCentredString(
        MARGIN + CONTENT_W / 2, footer_top - 7,
        ar('للتحقق من صحة هذا التصريح وسريانه بإمكانك زيارة موقع أجير (https://ajeer.com.sa)'))
    c.drawCentredString(
        MARGIN + CONTENT_W / 2, footer_top - 21,
        ar('* خدمة معتمدة من وزارة الموارد البشرية والتنمية الاجتماعية'))

    c.save()
    return buf.getvalue()
