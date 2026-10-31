#!/usr/bin/env python3
"""Check every public Spotify link against Spotify's public oEmbed endpoint.

No credentials, no Web API. For each track link it confirms the track still resolves
and that Spotify's title agrees with ours; for the official playlist it confirms the
playlist resolves. Runs in CI (network); the deterministic unit tests stay offline.

    python3 scripts/check_spotify_links.py [--report path.json]

Exit status is non-zero when any link is missing, renamed beyond a loose match, or
could not be checked after retries, so a bad link never ships silently.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OEMBED = "https://open.spotify.com/oembed?url="


def norm(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().casefold()
    text = re.sub(r"\s*[\(\[][^)\]]*(feat|with|remix|mix|edit|version|remaster)[^)\]]*[\)\]]", "", text)
    return re.sub(r"[^a-z0-9]", "", text)


def titles_agree(ours, theirs):
    a, b = norm(ours), norm(theirs)
    return bool(a and b) and (a == b or a in b or b in a)


def fetch(url, attempts=4):
    """Return (status, title). Retries 429/5xx with backoff, honoring Retry-After."""
    delay = 2.0
    for attempt in range(attempts):
        req = urllib.request.Request(OEMBED + urllib.parse.quote(url, safe=""),
                                     headers={"User-Agent": "listeningroom.app link check"})
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return 200, json.load(r).get("title", "")
        except urllib.error.HTTPError as e:
            if e.code in (404, 400):
                return e.code, None
            if attempt == attempts - 1:
                return e.code, None
            wait = float(e.headers.get("Retry-After") or delay)
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == attempts - 1:
                return "error: " + str(e), None
            wait = delay
        time.sleep(min(wait, 30))
        delay *= 2
    return "error", None


def main():
    songs = json.loads((ROOT / "data/listening-room/songs.json").read_text(encoding="utf-8"))["songs"]
    playlist = json.loads((ROOT / "data/listening-room/playlist.json").read_text(encoding="utf-8"))
    targets = [(s["spotify_url"], s["title"]) for s in songs if s.get("spotify_url")]
    official = (playlist.get("official_spotify") or {}).get("url")
    if official:
        targets.append((official, None))
    results, problems = [], []
    for i, (url, title) in enumerate(targets):
        status, theirs = fetch(url)
        ok = status == 200 and (title is None or titles_agree(title, theirs or ""))
        row = {"url": url, "our_title": title, "spotify_title": theirs, "status": status, "ok": ok}
        results.append(row)
        if not ok:
            problems.append(row)
        time.sleep(0.25)  # stay well under any public rate limit
        if (i + 1) % 50 == 0:
            print(f"checked {i + 1}/{len(targets)}", flush=True)
    report = {"checked": len(results), "ok": len(results) - len(problems), "problems": problems, "results": results}
    if "--report" in sys.argv:
        Path(sys.argv[sys.argv.index("--report") + 1]).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(f"Spotify links: {report['ok']}/{report['checked']} resolve with matching titles.")
    for p in problems:
        print(f"  PROBLEM {p['status']}: {p['url']}  ours={p['our_title']!r}  spotify={p['spotify_title']!r}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
