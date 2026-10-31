"""Project the current official day lists without overwriting historical evidence.

Keeps existing IDs and same-day poster times where the billing can be matched.
New appearances have no inferred stage or time. Run --check in validation.
"""
import argparse
import copy
import json
import re
import unicodedata
from collections import Counter
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


def unique_index(rows, make_key, label):
    result = {}
    for row in rows:
        k = make_key(row)
        if k in result:
            raise ValueError(f'Ambiguous {label}: {k}')
        result[k] = row
    return result


def project():
    source = read('sources/' + SOURCE + '.json')
    historical = read('performances.json')['performances']
    artist_doc = read('artists.json')
    artists = copy.deepcopy(artist_doc['artists'])
    by_name = unique_index(artists, lambda a: key(a['display_name']), 'artist name')
    for a in artists:
        for alias in a.get('aliases', []):
            other = by_name.setdefault(key(alias), a)
            if other['artist_id'] != a['artist_id']:
                raise ValueError(f'Ambiguous artist alias: {alias}')
    prior = unique_index(historical, lambda p: (p['day'], key(p['display_name'])), 'historical billing')
    unique_index(historical, lambda p: p['performance_id'], 'historical performance ID')
    rows = []
    new = []
    for day, names in source['by_day'].items():
        for order, name in enumerate(names, 1):
            old = prior.get((day, key(name)))
            if old:
                row = copy.deepcopy(old)
                # Same participants, but qualifiers changed between the sources.
                # Retain the sourced slot, never silently claim the billings agree.
                qualifier = lambda n: n[len(base(n)):] if base(n) != n else ''
                qualifier_changed = qualifier(name) != qualifier(old['display_name'])
                match = 'qualifier_changed' if qualifier_changed else 'normalized_billing'
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
                match = 'unmatched_current'
            row.update(display_name=name, source_order=order, source_order_is_running_order=False,
                       set_qualifier=name[len(base(name)) + 2:-1] if base(name) != name else None,
                       lineup_status='official_day_confirmed', issue_ids=list(old.get('issue_ids', [])) if old else [],
                       source_ids=[SOURCE] + ([row['schedule_source_id']] if row['schedule_source_id'] else []))
            row['reconciliation'] = dict(status=match, historical_performance_id=old['performance_id'] if old else None,
                                         historical_billing=old['display_name'] if old else None)
            if match == 'qualifier_changed':
                row['issue_ids'].append('current-vs-poster-qualifier')
            # Only factual fields are eligible for sanitized export. This is an
            # engineering allowlist, not a license for source artwork or a source endorsement.
            row['public_eligibility'] = dict(lineup=True, stage=bool(row['stage_id']),
                                              times=bool(row['starts_at'] and row['ends_at']))
            rows.append(row)
    unique_index(rows, lambda p: p['performance_id'], 'current performance ID')
    active_ids = {p['performance_id'] for p in rows}
    old_only = [p['display_name'] for p in historical if p['performance_id'] not in active_ids]
    timed = [p for p in rows if p['starts_at'] and p['ends_at']]
    current = dict(schema_version=2, checked_on=source['checked_on'], timezone='America/New_York',
                   lineup_source_url=source['source_url'], lineup_source_id=SOURCE,
                   schedule_status='current_official_day_lists_with_separately_caveated_poster_times',
                   sources=[dict(source_id=SOURCE, kind='organizer_day_list', checked_on=source['checked_on'],
                                 url=source['source_url']),
                            dict(source_id='set-times-posters-2026-10-30', kind='poster_transcription',
                                 checked_on='2026-10-30', url=None, independently_verified=False)],
                   coverage=dict(appearances=len(rows), distinct_billings=len({p['display_name'] for p in rows}),
                                 timed=len(timed), unknown_time=len(rows)-len(timed),
                                 unknown_stage=sum(p['stage_id'] is None for p in rows),
                                 by_day=dict(Counter(p['day'] for p in rows)),
                                 historical_only_ids=[p['performance_id'] for p in historical if p['performance_id'] not in active_ids]),
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
