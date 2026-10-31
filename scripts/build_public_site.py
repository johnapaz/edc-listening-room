#!/usr/bin/env python3
"""Build an explicit, sanitized public allowlist. Never serve the repository root."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public-site'


def load(path):
    return json.loads((ROOT / path).read_text())


def write(path, value):
    p = OUT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')


def fields(row, names):
    return {key: row[key] for key in names if key in row}


def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for name in ['index.html', 'app.js', 'lib.js', 'styles.css']:
        dest = OUT / 'listening-room' / name
        dest.parent.mkdir(exist_ok=True)
        shutil.copyfile(ROOT / 'listening-room' / name, dest)
    shutil.copyfile(ROOT / 'index.html', OUT / 'index.html')
    # Disable SPA fallthrough so private/nonexistent paths return actual 404s.
    (OUT / '404.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Not found · Listening Room</title><body><h1>Nothing here.</h1><a href="/">Back to Listening Room</a></body></html>')
    (OUT / '_redirects').write_text('https://www.listeningroom.app/* https://listeningroom.app/:splat 301\n')
    (OUT / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' https://img.youtube.com; connect-src \'self\'; object-src \'none\'; base-uri \'self\'; frame-ancestors \'none\'\n')
    art = load('data/edco-2026/artists.json')
    write('data/edco-2026/artists.json', {'artists': [fields(a, ['artist_id', 'display_name', 'search_name', 'aliases']) for a in art['artists']]})
    perf = load('data/edco-2026/performances.json')
    public_perf = fields(perf, ['checked_on', 'timezone', 'schedule_status'])
    public_perf['performances'] = [fields(p, ['performance_id', 'event_date', 'day', 'display_name', 'artist_ids', 'source_order', 'set_qualifier', 'stage_id', 'starts_at', 'ends_at', 'schedule_status', 'lineup_status']) for p in perf['performances']]
    write('data/edco-2026/performances.json', public_perf)
    write('data/edco-2026/venues.json', {'stages': [fields(s, ['stage_id', 'display_name']) for s in load('data/edco-2026/venues.json')['stages']]})
    write('data/edco-2026/event.json', fields(load('data/edco-2026/event.json'), ['event_id', 'name', 'checked_on', 'timezone']))
    write('data/listening-room/songs.json', {'songs': load('data/listening-room/songs.json')['songs']})
    write('data/listening-room/playlist.json', load('data/listening-room/playlist.json'))
    text = ''.join(p.read_text() for p in OUT.rglob('*') if p.is_file())
    for forbidden in ['app.notion.com', 'notion_page_url', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'PLdOAWVle']:
        if forbidden in text:
            raise ValueError(f'Private data in public build: {forbidden}')
    print(f'Public build: {sum(p.is_file() for p in OUT.rglob("*"))} files, {len(public_perf["performances"])} lineup entries; no private source files.')


if __name__ == '__main__':
    build()
