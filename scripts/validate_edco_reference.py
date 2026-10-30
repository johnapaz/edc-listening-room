"""Validate the EDCO reference pack offline; never access services or approvals."""
import csv
import hashlib
import json
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/edco-2026'


def read(path):
    return json.loads((ROOT / path).read_text())


def pointer(ref):
    path, fragment = ref.split('#', 1)
    value = read(path)
    for part in fragment.lstrip('/').split('/'):
        part = part.replace('~1', '/').replace('~0', '~')
        value = value[int(part)] if isinstance(value, list) else value[part]
    return value


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate():
    load = lambda name: json.loads((DATA / name).read_text())
    event, venues, sources = [load(n + '.json') for n in ('event', 'venues', 'sources')]
    performances = load('performances.json')['performances']
    artist_rows = load('artists.json')['artists']
    artists = {a['artist_id']: a for a in artist_rows}
    require(len(artists) == len(artist_rows), 'Duplicate artist ID')
    require(len({p['performance_id'] for p in performances}) == len(performances), 'Duplicate performance ID')
    source_ids = {s['source_id'] for s in sources['sources']}
    stage_ids = {s['stage_id'] for s in venues['stages']}
    issues = {i['issue_id']: i for i in sources['issues']}
    poster = load('sources/lineup-poster-2026-10-30.json')['by_day']
    text = load('sources/lineup-text-2026-10-30.json')
    require(Counter(text['alphabetical']) == Counter(x for v in text['by_day'].values() for x in v),
            'HTML alphabetical/day lists disagree')
    require(Counter(text['by_day']['Friday'])['Josh Baker'] == 2, 'Lost source duplicate evidence')
    for day, rows in poster.items():
        require([p['display_name'] for p in performances if p['day'] == day] == rows,
                'Poster coverage/order mismatch: ' + day)
        additions = set(rows) - set(text['by_day'][day])
        require(additions == ({'Prospa', 'Prospa B2B Josh Baker'} if day == 'Friday' else set()),
                'Unexpected poster/text difference: ' + day)
        require(set(text['by_day'][day]) <= set(rows), 'Dropped HTML act: ' + day)

    tz = ZoneInfo(event['timezone'])
    windows = {d['event_date']: d for d in event['days']}
    for d in event['days']:
        start, end, last = [datetime.fromisoformat(d[k]) for k in ('opens_at', 'closes_at', 'last_entry_at')]
        require(start == start.astimezone(tz) and start.utcoffset() == timedelta(hours=-5), 'Wrong event offset')
        require(start.date().isoformat() == d['event_date'], 'Wrong event day')
        require(end.date() == start.date() + timedelta(days=1) and end.hour == 0, 'Midnight must roll over')
        require(end - start == timedelta(hours=11) and end - last == timedelta(hours=1), 'Wrong hours/entry window')

    for p in performances:
        require(p['event_date'] in windows and p['day'] == windows[p['event_date']]['day'], 'Invalid performance date/day')
        require(set(p['artist_ids']) <= artists.keys(), 'Unknown artist reference')
        require({c['artist_id'] for c in p['credits']} == set(p['artist_ids']), 'Credit/artist mismatch')
        require(set(p['source_ids']) <= source_ids and set(p['issue_ids']) <= issues.keys(), 'Unknown source/issue')
        require(p['source_order_is_running_order'] is False, 'Source order is not a timetable')
        require(p['performance_type'] != 'b2b' or len(p['artist_ids']) == 2, 'B2B needs two artists')
        require(p['performance_type'] != 'program' or p['artist_ids'] == [], 'Program has invented artist')
        if p['schedule_status'] == 'set_times_unverified':
            require(all(p[k] is None for k in ('starts_at', 'ends_at', 'stage_id', 'schedule_source_id')),
                    'Unverified row contains inferred timetable data')
        else:
            require(p['schedule_status'] == 'official_schedule_verified', 'Unknown schedule status')
            require(p['stage_id'] in stage_ids and p['schedule_source_id'] in source_ids, 'Missing official schedule provenance')
            require(all(datetime.fromisoformat(p[k]).tzinfo is not None for k in ('starts_at', 'ends_at')), 'Naive set timestamp')
            require(datetime.fromisoformat(p['starts_at']) < datetime.fromisoformat(p['ends_at']), 'Set end precedes start')
        if p['issue_ids']:
            require(p['lineup_status'] == 'official_sources_conflict', 'Source conflict hidden')
    for a in artist_rows:
        require(set(a['member_artist_ids']) <= artists.keys(), 'Unknown project member')
        if a['identity_evidence_ref']:
            require(pointer(a['identity_evidence_ref'])['name'] == a['display_name'], 'Identity pointer mismatch')

    with (DATA / 'schedule.csv').open(newline='') as f:
        csv_rows = list(csv.DictReader(f))
    require(len(csv_rows) == len(performances), 'CSV row count mismatch')
    for c, p in zip(csv_rows, performances):
        for k, value in c.items():
            expected = '|'.join(p[k]) if k == 'artist_ids' else str(p[k] or '')
            require(value == expected, 'CSV projection mismatch: ' + k)

    index = load('music-lookup-index.json')
    for path, digest in index['source_file_sha256'].items():
        current = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        require(current == digest, 'Music index source changed; regenerate/check references: ' + path)
    for r in index['recordings']:
        require(r['artist_id'] in artists, 'Unknown indexed artist')
        candidate = pointer(r['candidate_ref'])
        require(candidate['candidate_id'] == r['candidate_id'] and candidate['title'] == r['title'], 'Candidate pointer mismatch')
        require([pointer(ref)['video_id'] for ref in r['preview_refs']] == r['known_video_ids'], 'Candidate/video mismatch')
    for v in index['videos']:
        require(pointer(v['review_ref'])['video_id'] == v['video_id'], 'Video pointer mismatch')
        if v['approved_manifest_ref']:
            require(pointer(v['approved_manifest_ref'])['video_id'] == v['video_id'], 'Manifest pointer mismatch')
        require(not any(k in v for k in ('human_verified', 'source_verified', 'rank', 'score')), 'Index is not approval/scoring data')

    checkpoint = read('pilot/evidence-checkpoint.json')
    delta = load('evidence/musicbrainz-delta-40966874986.json')
    require(not (set(checkpoint['requests']) & set(delta['requests'])), 'Delta repeats committed requests')
    merged = {**checkpoint['requests'], **delta['requests']}
    for key, entry in merged.items():
        actual = hashlib.sha256(json.dumps([entry['path'], entry['params']], sort_keys=True).encode()).hexdigest()
        require(actual == key, 'Recovered request identity mismatch')
    require(sum(e['path'] == 'recording' for e in merged.values()) == 41, 'Recovery does not cover 41 searches')
    require(len(merged) == 49, 'Expected 8 artist plus 41 recording requests')
    benda = load('evidence/benda-video-metadata-40968098075.json')
    require(benda['video']['id'] == 'oXhWSs0mRH4' and benda['video']['snippet']['title'] == 'Poison Control', 'Wrong recovered Benda video')
    require(benda['status'] == 'recovered_metadata_requires_review_not_approval', 'Recovery must not approve tracks')
    require(benda['refresh_or_delete_by'] == '2026-11-28', 'YouTube freshness date missing')
    print(f'Validated {len(performances)} lineup rows, {len(artists)} artist/participant entities, '
          f'{len(index["recordings"])} music candidates, {len(index["videos"])} known videos, '
          'and 49 recovered/committed request identities. No network calls.')


if __name__ == '__main__':
    validate()
