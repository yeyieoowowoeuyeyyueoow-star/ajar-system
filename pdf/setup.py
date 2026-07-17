"""Download Arabic fonts needed for PDF generation."""
import os
import requests

FONTS_DIR = os.path.join(os.path.dirname(__file__), 'fonts')

_FONTS = {
    'Amiri-Regular.ttf': (
        'https://cdn.jsdelivr.net/gh/alif-type/amiri@0.117/Amiri-Regular.ttf'
    ),
    'Amiri-Bold.ttf': (
        'https://cdn.jsdelivr.net/gh/alif-type/amiri@0.117/Amiri-Bold.ttf'
    ),
}


def download_fonts() -> None:
    os.makedirs(FONTS_DIR, exist_ok=True)
    for name, url in _FONTS.items():
        path = os.path.join(FONTS_DIR, name)
        if os.path.exists(path):
            continue
        print(f'   ⬇  Downloading {name}…', end=' ', flush=True)
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            with open(path, 'wb') as f:
                f.write(r.content)
            print('✅')
        except Exception as exc:
            print(f'❌ ({exc})')
