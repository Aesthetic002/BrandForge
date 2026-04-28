"""
image_processor.py
==================
Image overlay processing using Pillow.
Crops to 1:1 aspect ratio, then adds overlays:
  - Logo          → top-left
  - Business name → below logo (optional)
  - Location      → top-right
  - Email         → top-right, below location
  - Phone         → top-right, below email
  - Services      → full-width bottom banner (horizontal, compact)
"""

import os
from PIL import Image, ImageDraw, ImageFont


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """
    Attempt to load a clean sans-serif font.
    Falls back to Pillow's built-in default if none is available.
    """
    font_candidates = [
        "fonts/Roboto-Regular.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in font_candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _load_bold_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Load a bold variant for headings like business name."""
    bold_candidates = [
        "fonts/Roboto-Medium.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica-Bold.ttc",
    ]
    for path in bold_candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return _load_font(size)


def _crop_to_square(img: Image.Image) -> Image.Image:
    """
    Center-crop an image to 1:1 aspect ratio.
    Uses the shorter dimension as the square side.
    """
    w, h = img.size
    if w == h:
        return img
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def _draw_pill(
    draw: ImageDraw.ImageDraw,
    position: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    text_color: tuple = (255, 255, 255, 240),
    bg_color: tuple = (15, 15, 20, 160),
    pad_x: int = 14,
    pad_y: int = 8,
    radius: int = 8,
) -> tuple[int, int]:
    """
    Draw text inside a pill-shaped rounded rectangle.
    Returns (total_width, total_height) of the pill.
    """
    x, y = position
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    draw.rounded_rectangle(
        [x, y, x + tw + pad_x * 2, y + th + pad_y * 2],
        radius=radius,
        fill=bg_color,
    )
    draw.text((x + pad_x, y + pad_y), text, fill=text_color, font=font)
    return (tw + pad_x * 2, th + pad_y * 2)


def process_image(
    input_path: str,
    output_path: str,
    logo_path: str,
    email: str = "",
    phone: str = "",
    location: str = "",
    services: str = "",
    business_name: str = "",
) -> str:
    """
    Crop to 1:1 aspect ratio, add overlays, and save.

    Layout:
      TOP-LEFT:   Logo, then Business name below it
      TOP-RIGHT:  Location, then Email below it, then Phone below that
      BOTTOM:     Services as a full-width horizontal banner

    The bottom banner is kept compact — services are laid out as a
    comma-separated single line (or wrapped into max 2 lines) inside
    a slim full-width strip so the image content stays visible.
    """
    # ------------------------------------------------------------------
    # 1. Open, crop to square, set up overlay
    # ------------------------------------------------------------------
    base = Image.open(input_path).convert("RGBA")
    base = _crop_to_square(base)
    base_w, base_h = base.size

    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Scaling
    padding = int(base_w * 0.025)
    font_size = max(14, int(base_h * 0.026))
    small_font_size = max(12, int(font_size * 0.85))
    font = _load_font(font_size)
    small_font = _load_font(small_font_size)
    bold_font = _load_bold_font(int(font_size * 1.05))
    pill_pad_x = int(font_size * 0.5)
    pill_pad_y = int(font_size * 0.3)
    gap = int(font_size * 0.4)  # vertical gap between pills

    # ------------------------------------------------------------------
    # 2. TOP-LEFT: Logo
    # ------------------------------------------------------------------
    logo_block_bottom = padding
    if logo_path and os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        max_logo_w = int(base_w * 0.13)
        max_logo_h = int(base_h * 0.13)
        logo.thumbnail((max_logo_w, max_logo_h), Image.LANCZOS)

        logo_w, logo_h = logo.size
        bg_m = int(padding * 0.4)
        draw.rounded_rectangle(
            [
                padding - bg_m, padding - bg_m,
                padding + logo_w + bg_m, padding + logo_h + bg_m,
            ],
            radius=8,
            fill=(15, 15, 20, 120),
        )
        overlay.paste(logo, (padding, padding), logo)
        logo_block_bottom = padding + logo_h + bg_m

    # ------------------------------------------------------------------
    # 3. TOP-LEFT: Business name (below logo)
    # ------------------------------------------------------------------
    if business_name:
        biz_y = logo_block_bottom + gap
        _draw_pill(
            draw, (padding, biz_y), business_name, bold_font,
            pad_x=pill_pad_x, pad_y=pill_pad_y, radius=8,
        )

    # ------------------------------------------------------------------
    # 4. TOP-RIGHT: Location → Email → Phone (stacked, right-aligned)
    #    Location uses small_font and wraps vertically if too wide.
    # ------------------------------------------------------------------
    right_y = padding  # cursor tracking vertical position on right side
    max_right_w = int(base_w * 0.40)  # max width for right-side pills

    if location:
        # Word-wrap location within max_right_w using the small font
        loc_inner_w = max_right_w - pill_pad_x * 2
        loc_lines = _wrap_text(location, small_font, loc_inner_w, draw)

        # Measure the wrapped block
        line_heights = []
        line_widths = []
        for line in loc_lines:
            bb = draw.textbbox((0, 0), line, font=small_font)
            line_widths.append(bb[2] - bb[0])
            line_heights.append(bb[3] - bb[1])

        loc_line_spacing = int(small_font_size * 0.3)
        block_w = max(line_widths) if line_widths else 0
        block_h = (sum(line_heights)
                   + loc_line_spacing * (len(loc_lines) - 1))

        pill_total_w = block_w + pill_pad_x * 2
        pill_total_h = block_h + pill_pad_y * 2
        pill_x = base_w - padding - pill_total_w

        # Draw background pill
        draw.rounded_rectangle(
            [pill_x, right_y,
             pill_x + pill_total_w, right_y + pill_total_h],
            radius=8,
            fill=(15, 15, 20, 160),
        )

        # Draw each line right-aligned inside the pill
        cur_y = right_y + pill_pad_y
        for i, line in enumerate(loc_lines):
            lw = line_widths[i]
            # right-align text inside the pill
            lx = pill_x + pill_total_w - pill_pad_x - lw
            draw.text(
                (lx, cur_y), line,
                fill=(255, 255, 255, 240), font=small_font,
            )
            cur_y += line_heights[i] + loc_line_spacing

        right_y += pill_total_h + gap

    if email:
        bbox = draw.textbbox((0, 0), email, font=small_font)
        tw = bbox[2] - bbox[0]
        pill_w = tw + pill_pad_x * 2
        pill_x = base_w - padding - pill_w
        _, ph = _draw_pill(
            draw, (pill_x, right_y), email, small_font,
            bg_color=(15, 15, 20, 140),
            pad_x=pill_pad_x, pad_y=pill_pad_y, radius=8,
        )
        right_y += ph + gap

    if phone:
        bbox = draw.textbbox((0, 0), phone, font=small_font)
        tw = bbox[2] - bbox[0]
        pill_w = tw + pill_pad_x * 2
        pill_x = base_w - padding - pill_w
        _draw_pill(
            draw, (pill_x, right_y), phone, small_font,
            bg_color=(15, 15, 20, 140),
            pad_x=pill_pad_x, pad_y=pill_pad_y, radius=8,
        )

    # ------------------------------------------------------------------
    # 5. BOTTOM BANNER: Services (full-width, compact horizontal strip)
    # ------------------------------------------------------------------
    if services:
        # Normalise services into a clean comma-separated string
        raw_lines = [
            s.strip()
            for s in services.replace(",", "\n").split("\n")
            if s.strip()
        ]
        if raw_lines:
            svc_font_size = max(12, int(font_size * 0.82))
            svc_font = _load_font(svc_font_size)
            banner_pad_x = int(base_w * 0.03)
            banner_pad_y = int(svc_font_size * 0.5)

            # Join all services with " • " separator for a compact single line
            svc_text = "  •  ".join(raw_lines)

            # Measure single-line width
            bbox = draw.textbbox((0, 0), svc_text, font=svc_font)
            single_line_w = bbox[2] - bbox[0]
            single_line_h = bbox[3] - bbox[1]

            usable_w = base_w - banner_pad_x * 2

            # If the text fits in one line, draw it centered in one line
            # Otherwise wrap into multiple lines that span the full width
            if single_line_w <= usable_w:
                lines_to_draw = [svc_text]
            else:
                # Word-wrap the bullet-separated text to fit usable_w
                lines_to_draw = _wrap_text(svc_text, svc_font, usable_w, draw)

            line_h = single_line_h
            line_spacing = int(svc_font_size * 0.35)
            block_h = line_h * len(lines_to_draw) + line_spacing * (len(lines_to_draw) - 1)

            banner_h = block_h + banner_pad_y * 2
            banner_y = base_h - banner_h

            # Draw the full-width semi-transparent banner
            draw.rectangle(
                [0, banner_y, base_w, base_h],
                fill=(15, 15, 20, 150),
            )

            # Draw each line centered
            cur_y = banner_y + banner_pad_y
            for line in lines_to_draw:
                lb = draw.textbbox((0, 0), line, font=svc_font)
                lw = lb[2] - lb[0]
                lx = (base_w - lw) // 2
                draw.text(
                    (lx, cur_y), line,
                    fill=(255, 255, 255, 230), font=svc_font,
                )
                cur_y += line_h + line_spacing

    # ------------------------------------------------------------------
    # 6. Composite and save
    # ------------------------------------------------------------------
    result = Image.alpha_composite(base, overlay)

    output_ext = os.path.splitext(output_path)[1].lower()
    if output_ext in (".jpg", ".jpeg"):
        result = result.convert("RGB")

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    result.save(output_path, quality=95)

    return output_path


def _wrap_text(
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    max_width: int,
    draw: ImageDraw.ImageDraw,
) -> list[str]:
    """
    Word-wrap text to fit within max_width pixels.
    Returns a list of lines.
    """
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip() if current_line else word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if (bbox[2] - bbox[0]) <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines if lines else [text]
