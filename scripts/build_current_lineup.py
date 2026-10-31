"""Project the current official day lists without overwriting historical evidence.

Keeps existing IDs and same-day poster times where the billing can be matched.
New appearances have no inferred stage or time. Run --check in validation.
"""
import argparse
import copy
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/edco-2026'
SOURCE = 'lineup-text-2026-10-31'
DATES = {'Friday': '2026-11-06', 'Saturday': '2026-11-07', 'Sunday': '2026-11-08'}


def read(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


def base(name):
    return re.sub(r' \((Sunset Set|Wholesome Riddim Set)\)$', '', name)


def key(name):
    return ''.join(c for c in unicodedata.normalize('NFKD', base(name)).casefold()
                   if not unicodedata.combining(c)).strip()


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', key(name)).strip('-')


def project():
    source = read('sources/' + SOURCE + '.json')
    historical = read('performances.json')['performances']
    artist_doc = read('artists.json')
    artists = copy.deepcopy(artist_doc['artists'])
    by_name = {key(a['display_name']): a for a in artists}
    for a in artists:
        for alias in a.get('aliases', []):
            by_name.setdefault(key(alias), a)
    prior = {(p['day'], key(p['display_name'])): p for p in historical}
    rows = []
    new = []
    for day, names in source['by_day'].items():
        for order, name in enumerate(names, 1):
            old = prior.get((day, key(name)))
            if old:
                row = copy.deepcopy(old)
            else:
                ids = []
                for part in base(name).split(' B2B '):
                    a = by_name.get(key(part))
                    if not a:
                        a = dict(artist_id='artist:' + slug(part), display_name=part, search_name=part,
                                 role='billed_performer', identity_status='lineup_name_only',
                                 identity_evidence_ref=None, notion_page_url=None, member_artist_ids=[], aliases=[])
                        artists.append(a)
                        by_name[key(part)] = a
                    ids.append(a['artist_id'])
                row = dict(performance_id=f'edco26:{DATES[day]}:{slug(name)}', event_date=DATES[day], day=day,
                           performance_type='b2b' if ' B2B ' in name else 'act', artist_ids=ids,
                           credits=[{'artist_id': a, 'role': 'performer'} for a in ids],
                           stage_id=None, starts_at=None, ends_at=None, schedule_status='set_times_unverified',
                           schedule_source_id=None)
                new.append(day + ': ' + name)
            row.update(display_name=name, source_order=order, source_order_is_running_order=False,
                       set_qualifier=name[len(base(name)) + 2:-1] if base(name) != name else None,
                       lineup_status='official_day_confirmed', issue_ids=[],
                       source_ids=[SOURCE] + ([row['schedule_source_id']] if row['schedule_source_id'] else []))
            rows.append(row)
    active_ids = {p['performance_id'] for p in rows}
    old_only = [p['display_name'] for p in historical if p['performance_id'] not in active_ids]
    current = dict(schema_version=1, checked_on=source['checked_on'], timezone='America/New_York',
                   lineup_source_url=source['source_url'], lineup_source_id=SOURCE,
                   schedule_status='current_official_day_lists_with_separately_caveated_poster_times',
                   performances=rows)
    artist_doc['artists'] = sorted(artists, key=lambda a: key(a['display_name']))
    artist_doc['checked_on'] = source['checked_on']
    return current, artist_doc, new, old_only


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    current, artists, new, old_only = project()
    for name, value in [('current-lineup.json', current), ('artists.json', artists)]:
        text = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
        if args.check:
            if (DATA / name).read_text(encoding='utf-8') != text:
                raise ValueError(name + ' is out of sync with the current organizer snapshot')
        else:
            (DATA / name).write_text(text, encoding='utf-8')
    print(f'Current official lineup: {len(current["performances"])} day-specific entries; {len(new)} added appearances.')
    print('Historical-only billings (retained in performances.json): ' + ', '.join(old_only))


if __name__ == '__main__':
    main()
