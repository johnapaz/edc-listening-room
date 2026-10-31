"""Build a local/review Companion artifact. Never called by the production builder.

Uses the same sanitized data and Listening Room output. Only this explicit
command adds Companion files. No hosting, deployment or external writes.
"""
import hashlib
import re
import shutil
from pathlib import Path

import build_public_site

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'companion-preview'
FILES = ('index.html', 'app.js', 'lib.js', 'components.js', 'styles.css')


def build():
    original = build_public_site.OUT
    try:
        build_public_site.OUT = OUT
        build_public_site.build()
    finally:
        build_public_site.OUT = original
    dest = OUT / 'companion'
    dest.mkdir()
    for name in FILES:
        shutil.copyfile(ROOT / 'companion' / name, dest / name)
    page = dest / 'index.html'
    def version(match):
        attr, url = match.groups()
        asset = (page.parent / url).resolve()
        if not asset.is_relative_to(OUT.resolve()) or not asset.is_file():
            raise ValueError('Missing preview asset: ' + url)
        return f'{attr}="{url}?v={hashlib.sha256(asset.read_bytes()).hexdigest()[:12]}"'
    page.write_text(re.sub(r'(src|href)="([^"?]+\.(?:js|css))"', version, page.read_text(encoding='utf-8')), encoding='utf-8')
    print('Companion review artifact only: companion-preview/companion/. Default public-site excludes it.')


if __name__ == '__main__':
    build()
