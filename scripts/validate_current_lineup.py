"""Validate the existing current-lineup projection and its Companion joins offline."""
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data/edco-2026'


def read(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


def validate(doc=None, artists=None, venues=None, historical=None, snapshot=None):
    doc = doc if doc is not None else read('current-lineup.json')
    artists = artists if artists is not None else read('artists.json')['artists']
    venues = venues if venues is not None else read('venues.json')
    historical = historical if historical is not None else read('performances.json')['performances']
    snapshot = snapshot if snapshot is not None else read('sources/lineup-text-2026-10-31.json')
    rows = doc['performances']
    def require(condition, message):
        if not condition:
            raise ValueError(message)
    def unique(items, label):
        require(len(items) == len(set(items)), 'Duplicate ' + label)
    unique([p['performance_id'] for p in rows], 'performance ID')
    unique([a['artist_id'] for a in artists], 'artist ID')
    unique([s['stage_id'] for s in venues['stages']], 'stage ID')
    art = {a['artist_id']: a for a in artists}
    stages = {s['stage_id'] for s in venues['stages']}
    old = {p['performance_id']: p for p in historical}
    sources = {s['source_id']: s for s in doc['sources']}
    require(doc['timezone'] == 'America/New_York', 'Timezone must be event-local')
    event_dates = {d['day']: d['event_date'] for d in read('event.json')['days']}
    for day, names in snapshot['by_day'].items():
        require([p['display_name'] for p in rows if p['day'] == day] == names, 'Current day-list mismatch: ' + day)
    require(len(rows) == sum(map(len, snapshot['by_day'].values())), 'Current appearances lost or added')
    for a in artists:
        require(all(i in art for i in a.get('member_artist_ids', [])), 'Unknown project member')
    for p in rows:
        pid = p['performance_id']
        require(p['event_date'] in pid, 'ID/date mismatch: ' + pid)
        require(event_dates.get(p['day']) == p['event_date'], 'Date outside festival: ' + pid)
        require(datetime.fromisoformat(p['event_date']).strftime('%A') == p['day'], 'Day/date mismatch: ' + pid)
        require(p['artist_ids'] and all(i in art for i in p['artist_ids']) or p['performance_type'] == 'program', 'Unknown artist: ' + pid)
        unique(p['artist_ids'], 'participant: ' + pid)
        require({c['artist_id'] for c in p['credits']} == set(p['artist_ids']), 'Credits mismatch: ' + pid)
        if p['performance_type'] == 'b2b':
            require(len(p['artist_ids']) >= 2, 'B2B lost participant: ' + pid)
        require(set(p['source_ids']) <= sources.keys(), 'Unknown source: ' + pid)
        require(doc['lineup_source_id'] in p['source_ids'], 'Missing current source: ' + pid)
        eligibility = p['public_eligibility']
        require(eligibility.get('lineup') is True, 'Ineligible current appearance: ' + pid)
        values = [p['stage_id'], p['starts_at'], p['ends_at'], p['schedule_source_id']]
        if p['schedule_status'] == 'set_times_unverified':
            require(all(v is None for v in values), 'Unknown schedule must use nulls: ' + pid)
            require(not eligibility['stage'] and not eligibility['times'], 'Unknown fields cannot be exported: ' + pid)
        else:
            require(p['schedule_status'] in ('poster_transcribed', 'verified'), 'Unsupported schedule status: ' + pid)
            require(all(values) and p['stage_id'] in stages, 'Missing stage/time/source: ' + pid)
            require(p['schedule_source_id'] in p['source_ids'], 'Schedule provenance lost: ' + pid)
            for field in ('starts_at', 'ends_at'):
                dt = datetime.fromisoformat(p[field])
                require(dt.tzinfo is not None and dt.utcoffset() == dt.astimezone(ZoneInfo(doc['timezone'])).utcoffset(), 'Invalid local offset: ' + pid)
            start, end = (datetime.fromisoformat(p[f]) for f in ('starts_at', 'ends_at'))
            require(start.date().isoformat() == p['event_date'] and start.strftime('%A') == p['day'], 'Wrong start date/day: ' + pid)
            require(0 < (end-start).total_seconds() <= 6*3600, 'Invalid duration/midnight boundary: ' + pid)
            require(end.date() == start.date() or ((end-start).days == 0 and end.hour == 0 and end.minute == 0), 'Invalid next-day close: ' + pid)
            if p['schedule_status'] == 'poster_transcribed':
                require(pid in old, 'Poster slot applied to new appearance: ' + pid)
                require(all(p[f] == old[pid][f] for f in ('artist_ids', 'stage_id', 'starts_at', 'ends_at', 'schedule_source_id')), 'Poster slot changed: ' + pid)
        reconciliation = p['reconciliation']
        if pid in old:
            require(all(p[f] == old[pid][f] for f in ('performance_type', 'artist_ids', 'credits')), 'Historical participants or roles changed: ' + pid)
            require(reconciliation['historical_performance_id'] == pid and reconciliation['historical_billing'] == old[pid]['display_name'], 'Historical lineage lost: ' + pid)
            require(set(old[pid].get('issue_ids', [])) <= set(p['issue_ids']), 'Earlier conflict erased: ' + pid)
        else:
            require(reconciliation['status'] == 'unmatched_current' and not reconciliation['historical_performance_id'], 'New billing falsely matched: ' + pid)
    cov = doc['coverage']
    require(cov['appearances'] == len(rows) and cov['distinct_billings'] == len({p['display_name'] for p in rows}), 'Wrong coverage totals')
    require(cov['by_day'] == dict(Counter(p['day'] for p in rows)), 'Wrong day coverage')
    timed = sum(bool(p['starts_at'] and p['ends_at']) for p in rows)
    require(cov['timed'] == timed and cov['unknown_time'] == len(rows)-timed, 'Wrong schedule coverage')
    require(cov['unknown_stage'] == sum(p['stage_id'] is None for p in rows), 'Wrong stage coverage')
    require(set(cov['historical_only_ids']) == old.keys() - {p['performance_id'] for p in rows}, 'Historical-only accounting mismatch')
    geometry = venues['map']['geometry']
    require(geometry['coordinate_space'] == 'normalized-top-left', 'Unknown coordinate model')
    for stage in venues['stages']:
        position = stage['coordinates']
        if position is None:
            continue
        require(position.get('verification') == 'verified' and position.get('source_ids') and position.get('checked_on'), 'Unsupported hotspot')
        require(all(isinstance(position.get(k), (int, float)) and not isinstance(position[k], bool) and 0 <= position[k] <= 1 for k in ('x', 'y')), 'Out-of-bounds hotspot')
    return cov


if __name__ == '__main__':
    print('Current lineup validated:', json.dumps(validate(), sort_keys=True))
