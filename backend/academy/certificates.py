from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from PIL import Image, ImageColor, ImageDraw, ImageFont

from .models import Certificate, CertificateTemplate


def build_certificate_number(certificate: Certificate) -> str:
    return f"CERT-AKD-{certificate.course_id:03d}-{certificate.id:06d}"


def get_certificate_title(certificate: Certificate) -> str:
    return certificate.course.title


def get_certificate_file_name(certificate: Certificate) -> str:
    return f"certificates/user_{certificate.user_id}/certificate_{certificate.id}.pdf"


def get_certificate_media_url(certificate: Certificate) -> str:
    return f"{settings.MEDIA_URL}{get_certificate_file_name(certificate)}"


def resolve_certificate_template(certificate: Certificate) -> CertificateTemplate | None:
    if certificate.template_id:
        return certificate.template

    course_template = CertificateTemplate.objects.filter(
        is_active=True,
        course=certificate.course,
    ).order_by('-updated_at', '-id').first()
    if course_template:
        return course_template

    return CertificateTemplate.objects.filter(
        is_active=True,
        course__isnull=True,
    ).order_by('-updated_at', '-id').first()


def _load_font(size: int, weight: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_candidates = []
    if weight >= 700:
        font_candidates.extend([
            "DejaVuSans-Bold.ttf",
            "arialbd.ttf",
            "Arial Bold.ttf",
        ])
    else:
        font_candidates.extend([
            "DejaVuSans.ttf",
            "arial.ttf",
            "Arial.ttf",
        ])

    for font_name in font_candidates:
        try:
            return ImageFont.truetype(font_name, size=size)
        except OSError:
            continue

    return ImageFont.load_default()


def _compute_position(canvas_width: int, canvas_height: int, config: dict[str, Any], text_width: float = 0) -> tuple[float, float]:
    x = (canvas_width * float(config.get('x', 0))) / 100
    y = (canvas_height * float(config.get('y', 0))) / 100
    align = config.get('align', 'left')

    if align == 'center':
        x -= text_width / 2
    elif align == 'right':
        x -= text_width

    return x, y


def _draw_text(draw: ImageDraw.ImageDraw, canvas_size: tuple[int, int], text: str, config: dict[str, Any]) -> None:
    font = _load_font(int(config.get('fontSize', 20)), int(config.get('fontWeight', 500)))
    fill = config.get('color', '#000000')
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    x, y = _compute_position(canvas_size[0], canvas_size[1], config, text_width)
    draw.text((x, y), text, font=font, fill=fill)


def _draw_signature(canvas: Image.Image, signature_path: str | None, canvas_size: tuple[int, int], config: dict[str, Any]) -> None:
    if not signature_path:
        return

    try:
        signature = Image.open(signature_path).convert('RGBA')
    except (FileNotFoundError, OSError):
        return

    width = max(1, int((canvas_size[0] * float(config.get('width', 10))) / 100))
    height = max(1, int((canvas_size[1] * float(config.get('height', 10))) / 100))
    signature.thumbnail((width, height))

    x, y = _compute_position(canvas_size[0], canvas_size[1], config, signature.width)
    canvas.paste(signature, (int(x), int(y)), signature)


def _base_canvas(template: CertificateTemplate | None) -> Image.Image:
    width = template.page_width if template else 1600
    height = template.page_height if template else 1200

    if template and template.background_image:
        try:
            background = Image.open(template.background_image.path).convert('RGB')
            return background.resize((width, height))
        except (FileNotFoundError, OSError, ValueError):
            pass

    return Image.new('RGB', (width, height), color=ImageColor.getrgb('#ffffff'))


def _certificate_payload(certificate: Certificate, template: CertificateTemplate | None) -> dict[str, str]:
    user = certificate.user
    instructor = certificate.course.instructor
    recipient_name = f"{user.first_name} {user.last_name}".strip() or user.username
    signer_name = (template.signer_name if template else None) or instructor.name or 'Akademiso'
    signer_title = (template.signer_title if template else None) or instructor.title or 'Penyelenggara Sertifikasi'

    issued = timezone.localtime(certificate.issue_date).strftime('%d %B %Y')

    return {
        'recipient_name': recipient_name,
        'course_title': get_certificate_title(certificate),
        'issue_date': issued,
        'certificate_number': build_certificate_number(certificate),
        'signer_name': signer_name,
        'signer_title': signer_title,
    }


def _draw_default_layout(draw: ImageDraw.ImageDraw, canvas: Image.Image, payload: dict[str, str]) -> None:
    canvas_size = canvas.size
    default_layout = {
        'recipient_name': {'x': 50, 'y': 42, 'fontSize': 54, 'fontWeight': 700, 'color': '#000000', 'align': 'center'},
        'course_title': {'x': 50, 'y': 55, 'fontSize': 28, 'fontWeight': 600, 'color': '#000000', 'align': 'center'},
        'issue_date': {'x': 72, 'y': 79, 'fontSize': 18, 'fontWeight': 500, 'color': '#000000', 'align': 'left'},
        'certificate_number': {'x': 16, 'y': 86, 'fontSize': 16, 'fontWeight': 500, 'color': '#000000', 'align': 'left'},
        'signer_name': {'x': 72, 'y': 75, 'fontSize': 20, 'fontWeight': 700, 'color': '#000000', 'align': 'center'},
        'signer_title': {'x': 72, 'y': 80, 'fontSize': 15, 'fontWeight': 500, 'color': '#000000', 'align': 'center'},
    }

    for key, config in default_layout.items():
        _draw_text(draw, canvas_size, payload[key], config)


def generate_certificate_pdf(certificate: Certificate, force: bool = False) -> str:
    file_name = get_certificate_file_name(certificate)
    media_url = get_certificate_media_url(certificate)

    if (
        not force and
        certificate.certificate_url == media_url and
        default_storage.exists(file_name)
    ):
        return media_url

    template = resolve_certificate_template(certificate)
    if template and certificate.template_id != template.id:
        certificate.template = template

    canvas = _base_canvas(template)
    draw = ImageDraw.Draw(canvas)
    payload = _certificate_payload(certificate, template)

    if template and template.layout_config:
        for key in ['recipient_name', 'course_title', 'issue_date', 'certificate_number', 'signer_name', 'signer_title']:
            config = template.layout_config.get(key)
            if config:
                _draw_text(draw, canvas.size, payload[key], config)
    else:
        _draw_default_layout(draw, canvas, payload)

    signature_path = None
    if template and template.signature_image:
        signature_path = template.signature_image.path
    elif certificate.course.instructor.signature_image:
        signature_path = certificate.course.instructor.signature_image.path

    signature_config = template.layout_config.get('signature_image') if template and template.layout_config else None
    if not signature_config:
        signature_config = {
            'x': 72,
            'y': 63,
            'width': 18,
            'height': 10,
            'align': 'center',
        }
    if signature_config:
        _draw_signature(canvas, signature_path, canvas.size, signature_config)

    buffer = BytesIO()
    canvas.save(buffer, format='PDF', resolution=150)
    buffer.seek(0)

    if default_storage.exists(file_name):
        default_storage.delete(file_name)
    default_storage.save(file_name, ContentFile(buffer.read()))

    certificate.certificate_url = media_url
    certificate.save(update_fields=['certificate_url', 'template'])
    return media_url
