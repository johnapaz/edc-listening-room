"""Bounded read-only evidence collection; never approves a candidate."""
import json
import os
import hashlib
from datetime import datetime, timezone
from pathlib import Path

from .musicbrainz import MusicBrainz
from .quota import Budget
from .youtube import YouTube, access_token_from_secrets


def quoted(value):
    return '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'


def request_key(path, params):
    return hashlib.sha256(json.dumps([path, params], sort_keys=True).encode()).hexdigest()


def require_complete(report):
    if report.get('outcome') != 'COLLECTION_COMPLETE':
        raise ValueError('Collection is incomplete; acceptance remains blocked')


def collect(mb, yt, artists, recordings, videos, output, youtube_cache=None,
            provider='both', checkpoint=None):
    if provider not in ('both', 'musicbrainz', 'youtube'):
        raise ValueError('Unknown provider')
    if len(artists) != 8 or len(recordings) != 41 or len(videos) > 16:
        raise ValueError('Expected the fixed eight-artist, 41-recording pilot pool')
    report = {'artist_relationships': {}, 'recording_searches': {},
              'youtube': {}, 'errors': {}, 'logical_mb_lookups': 0,
              'human_approval': False, 'playback_verified': False}
    requests = dict((checkpoint or {}).get('requests', {}))
    for key, entry in requests.items():
        if key != request_key(entry['path'], entry['params']):
            raise ValueError('Checkpoint request identity mismatch')
    report['requests'] = requests
    report['provider'] = provider

    def save():
        report['youtube_general_used'] = yt.quota.used_general
        report['youtube_search_used'] = yt.quota.used_search
        temporary = output.with_suffix('.tmp')
        temporary.write_text(json.dumps(report, indent=2, ensure_ascii=False))
        temporary.replace(output)

    output.parent.mkdir(parents=True, exist_ok=True)
    save()
    # Look up relationships for exact existing candidate IDs. These are not
    # catalog imports. Recording search uses names, never an unverified ID join.
    lookups = [('artist_relationships', a['name'], 'artist/' + a['musicbrainz_candidate_id'],
                {'inc': 'url-rels+aliases+artist-rels'}) for a in artists]
    lookups += [('recording_searches', r['candidate_id'], 'recording',
                 {'query': 'recording:' + quoted(r['title']) + ' AND artist:' + quoted(r['pilot_artist']),
                  'limit': '5'}) for r in recordings]
    for section, key, path, params in lookups:
        digest = request_key(path, params)
        if digest in requests:
            report[section][key] = requests[digest]['response']
            continue
        if provider == 'youtube':
            continue
        report['logical_mb_lookups'] += 1
        try:
            report[section][key] = mb.get(path, params)
            requests[digest] = {'path': path, 'params': params,
                                'response': report[section][key],
                                'status': 'collected',
                                'fetched_at': datetime.now(timezone.utc).isoformat()}
        except RuntimeError as exc:
            if any('HTTP ' + str(code) in str(exc) for code in (400, 401, 403, 404)):
                raise
            report['errors']['musicbrainz'] = str(exc)
            report['failed_lookup'] = {'section': section, 'key': key}
            # The client already exhausted bounded retries. Stop this provider;
            # cached successes are reused on the next approved run.
            save()
            break
        save()
    ids = list(dict.fromkeys(v['video_id'] for v in videos))
    # Exact approved discovery scope: metadata only; no repeated Benda searches.
    operations = [('existing_videos', 'videos',
                   {'part': 'snippet,contentDetails,status', 'id': ','.join(ids)})]
    if provider == 'musicbrainz':
        operations = []
    for key, endpoint, params in operations:
        cache_file = None
        if youtube_cache is not None:
            youtube_cache.mkdir(parents=True, exist_ok=True)
            today = datetime.now(timezone.utc).date().isoformat()
            digest = hashlib.sha256(json.dumps([today, endpoint, params], sort_keys=True).encode()).hexdigest()
            cache_file = youtube_cache / (digest + '.json')
        if cache_file is not None and cache_file.is_file():
            report['youtube'][key] = json.loads(cache_file.read_text())
            report.setdefault('youtube_cache_hits', []).append(key)
            save()
            continue
        try:
            report['youtube'][key] = yt.request(endpoint, params)
            if cache_file is not None:
                temporary = cache_file.with_suffix('.tmp')
                temporary.write_text(json.dumps(report['youtube'][key]))
                temporary.replace(cache_file)
        except RuntimeError as exc:
            if any('HTTP ' + str(code) in str(exc) for code in (400, 401, 403)):
                raise
            report['errors'][key] = str(exc)
            save()
            break
        save()
    report['complete'] = (not report['errors'] and
                          len(report['artist_relationships']) == 8 and
                          len(report['recording_searches']) == 41)
    report['outcome'] = 'COLLECTION_COMPLETE' if report['complete'] else 'COLLECTION_PARTIAL'
    report['pending_recordings'] = [r['candidate_id'] for r in recordings
                                    if r['candidate_id'] not in report['recording_searches']]
    save()
    return report


def main():
    provider = os.environ.get('EDC_EVIDENCE_PROVIDER', 'musicbrainz')
    remaining = int(os.environ['EDC_REMAINING_GENERAL'])
    searches = int(os.environ['EDC_REMAINING_SEARCH'])
    if not 0 <= remaining <= 10000 or not 0 <= searches <= 100:
        raise ValueError('Invalid quota input')
    if provider != 'musicbrainz' and remaining < 1:
        raise ValueError('Metadata lookup needs at least 1 general unit')
    # MB-only recovery never refreshes OAuth or calls YouTube.
    token = access_token_from_secrets() if provider != 'musicbrainz' else ''
    yt = YouTube(token, Budget(remaining, searches, maximum_general_per_run=1))
    mb = MusicBrainz(os.environ['EDC_CONTACT_EMAIL'], throttle_seconds=2) if provider != 'youtube' else None
    read = lambda p: json.loads(Path(p).read_text())
    report = collect(mb, yt, read('pilot/identity-review.json')['artists'],
                     read('pilot/recording-candidates.json'),
                     read('pilot/video-review-candidates.json'),
                     Path('.state/evidence/report.json'), Path('.cache/evidence-youtube'),
                     provider, read('pilot/evidence-checkpoint.json'))
    print('Evidence saved; no candidates approved; no playlist writes.')
    print('YouTube general:', report['youtube_general_used'], 'search:', report['youtube_search_used'])
    summary = ('## Pilot evidence collection\n\n'
               + ('Collection complete; review still required.' if report['complete'] else 'PARTIAL — not approved for playlist execution.')
               + '\n\nRecording searches collected: ' + str(len(report['recording_searches'])) + '/41'
               + '\n\nPending: ' + ', '.join(report['pending_recordings'])
               + '\n\nProvider errors: ' + json.dumps(report['errors'])
               + '\n\nFailed lookup: ' + json.dumps(report.get('failed_lookup'))
               + '\n\nYouTube quota this attempt: general ' + str(report['youtube_general_used'])
               + ', search ' + str(report['youtube_search_used'])
               + '. Playlist writes: 0. Paid services: $0.\n')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as handle:
            handle.write(summary)
    print(summary)
    # Partial capture is successful evidence preservation, not acceptance.
    # Unexpected code/auth/IO errors still fail the job. No publishing command
    # consumes this report, and acceptance must check outcome separately.


if __name__ == '__main__':
    main()
