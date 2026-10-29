"""Bounded read-only evidence collection; never approves a candidate."""
import json
import os
from pathlib import Path

from .musicbrainz import MusicBrainz
from .quota import Budget
from .youtube import YouTube, access_token_from_secrets


def quoted(value):
    return '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'


def collect(mb, yt, artists, recordings, videos, output):
    if len(artists) != 8 or len(recordings) != 41 or len(videos) > 16:
        raise ValueError('Expected the fixed eight-artist, 41-recording pilot pool')
    report = {'artist_relationships': {}, 'recording_searches': {},
              'youtube': {}, 'errors': {}, 'logical_mb_lookups': 0,
              'human_approval': False, 'playback_verified': False}

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
        report['logical_mb_lookups'] += 1
        try:
            report[section][key] = mb.get(path, params)
        except RuntimeError as exc:
            report['errors']['musicbrainz'] = str(exc)
            # The client already exhausted bounded retries. Stop this provider;
            # cached successes are reused on the next approved run.
            save()
            break
        save()
    ids = list(dict.fromkeys(v['video_id'] for v in videos))
    operations = [('existing_videos', 'videos',
                   {'part': 'snippet,contentDetails,status', 'id': ','.join(ids)})]
    for title in ('Bone Breaker', 'Poison Control'):
        operations.append(('benda_' + title, 'search',
                           {'part': 'snippet', 'q': 'Benda ' + title + ' official audio',
                            'type': 'video', 'maxResults': 5}))
    for key, endpoint, params in operations:
        try:
            report['youtube'][key] = yt.request(endpoint, params)
        except RuntimeError as exc:
            report['errors'][key] = str(exc)
            save()
            break
        save()
    report['complete'] = (not report['errors'] and
                          len(report['recording_searches']) == 41)
    save()
    return report


def main():
    remaining = int(os.environ['EDC_REMAINING_GENERAL'])
    searches = int(os.environ['EDC_REMAINING_SEARCH'])
    if not 1 <= remaining <= 10000 or not 2 <= searches <= 100:
        raise ValueError('Confirm at least 1 general unit and 2 search requests')
    # OAuth runs first; it is not written to the evidence artifact or logs.
    yt = YouTube(access_token_from_secrets(), Budget(remaining, searches, maximum_general_per_run=1))
    mb = MusicBrainz(os.environ['EDC_CONTACT_EMAIL'])
    read = lambda p: json.loads(Path(p).read_text())
    report = collect(mb, yt, read('pilot/identity-review.json')['artists'],
                     read('pilot/recording-candidates.json'),
                     read('pilot/video-review-candidates.json'),
                     Path('.state/evidence/report.json'))
    print('Evidence saved; no candidates approved; no playlist writes.')
    print('YouTube general:', report['youtube_general_used'], 'search:', report['youtube_search_used'])
    if not report['complete']:
        raise SystemExit('Partial evidence preserved. Review provider errors before retry.')


if __name__ == '__main__':
    main()
