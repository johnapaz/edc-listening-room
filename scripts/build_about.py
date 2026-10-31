#!/usr/bin/env python3
"""Render the About & Help section (about-site/) into the public site.

Pages in about-site/pages/ are HTML fragments with a short header. Directives such as
{{stat lineup_entries}} or {{app artist/<id> | name}} are resolved against the same public
lineup and song data the app loads, so counts, lists and deep links stay accurate on every
build. Unknown directives, broken internal links and missing screenshots fail the build.

Usage: python3 scripts/build_about.py [OUT_DIR]     (default: public-site)
Stdlib only, so it runs inside the Cloudflare Pages build.
"""
import html
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path
from urllib.parse import parse_qs

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "about-site"
APP = "/listening-room/"
BASE = "/about/"
SITE = "https://listeningroom.app"
DAYS = [("2026-11-06", "Friday", "Fri"), ("2026-11-07", "Saturday", "Sat"), ("2026-11-08", "Sunday", "Sun")]
YOUTUBE = re.compile(r"^https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}$")
DIRECTIVE = re.compile(r"\{\{\s*(\w+)\s*(.*?)\s*\}\}", re.S)
H2 = re.compile(r'<h2 id="([a-z0-9-]+)">(.*?)</h2>', re.S)
H3 = re.compile(r'<h3 id="([a-z0-9-]+)">(.*?)</h3>', re.S)
TAG = re.compile(r"<[^>]+>")
ESC = html.escape


class BuildError(ValueError):
    pass


def normalize(value):
    """Same folding as the app's search (lib.js normalize): strip accents, lowercase, squeeze spaces."""
    import unicodedata
    v = unicodedata.normalize("NFKD", str(value or ""))
    v = "".join(ch for ch in v if not ("\u0300" <= ch <= "\u036f"))
    return re.sub(r"\s+", " ", v.lower()).strip()


def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def plain(fragment):
    return re.sub(r"\s+", " ", html.unescape(TAG.sub(" ", fragment))).strip()


# ---------------------------------------------------------------- data
class Data:
    def __init__(self):
        perf = load("data/edco-2026/current-lineup.json")
        self.checked_on = perf.get("checked_on")
        self.perf = sorted(perf["performances"], key=lambda p: (p["event_date"], p["source_order"]))
        self.artists = {a["artist_id"]: a for a in load("data/edco-2026/artists.json")["artists"]}
        self.stages = load("data/edco-2026/venues.json")["stages"]
        self.songs = [s for s in load("data/listening-room/songs.json")["songs"]
                      if YOUTUBE.match(s.get("url", "")) and s["artist_id"] in self.artists]
        self.playlist = load("data/listening-room/playlist.json")
        self.by_artist = {}
        for s in self.songs:
            self.by_artist.setdefault(s["artist_id"], []).append(s)
        self.perf_ids = {p["performance_id"] for p in self.perf}

    def has_songs(self, p):
        return any(a in self.by_artist for a in p["artist_ids"])

    def stats(self):
        p = self.perf
        checked = date.fromisoformat(self.checked_on) if self.checked_on else None
        out = {
            "lineup_entries": len(p),
            "days": len(DAYS),
            "songs": len(self.songs),
            "song_artists": len(self.by_artist),
            "entries_with_songs": sum(self.has_songs(x) for x in p),
            "entries_without_songs": sum(not self.has_songs(x) for x in p),
            "b2b": sum(x.get("performance_type") == "b2b" for x in p),
            "poster_times": sum(x.get("schedule_status") == "poster_transcribed" and bool(x.get("starts_at")) for x in p),
            "verified_times": sum(x.get("schedule_status") == "verified" for x in p),
            "no_time": sum(not x.get("starts_at") for x in p),
            "conflicts": sum(x.get("lineup_status") == "official_sources_conflict" for x in p),
            "stages": len(self.stages),
            "checked_on": f"{checked:%B} {checked.day}, {checked.year}" if checked else "an unknown date",
        }
        for key, name, _short in DAYS:
            out["day_" + name.lower()] = sum(x["event_date"] == key for x in p)
        return out


# ---------------------------------------------------------------- pages
def read_pages():
    pages = []
    for path in sorted((SRC / "pages").glob("*.html")):
        text = path.read_text(encoding="utf-8")
        m = re.match(r"\s*<!--(.*?)-->\s*", text, re.S)
        if not m:
            raise BuildError(f"{path.name}: missing header comment")
        meta = {}
        for line in m.group(1).strip().splitlines():
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip()
        for k in ("slug", "title", "nav", "description"):
            if k not in meta:
                raise BuildError(f"{path.name}: header needs '{k}'")
        meta["body"] = text[m.end():]
        meta["url"] = BASE + (meta["slug"] + "/" if meta["slug"] else "")
        meta["file"] = path.name
        pages.append(meta)
    if not pages or pages[0]["slug"] != "":
        raise BuildError("the first page must be the overview with an empty slug")
    return pages


class Renderer:
    def __init__(self, data, pages, shots):
        self.d, self.pages, self.shots = data, pages, shots
        self.stats = data.stats()
        self.slugs = {p["slug"]: p for p in pages}
        self.page_links = []  # (from_page, slug, anchor) checked after all pages render
        self.ui_strings = set()  # UI copy quoted by the help pages; tests check the app still shows it

    def app_href(self, route):
        path, _, query = route.partition("?")
        parts = path.split("/", 1)
        if parts[0] == "artist":
            if len(parts) < 2 or (parts[1] not in self.d.perf_ids and parts[1] not in self.d.artists):
                raise BuildError(f"app link to unknown artist or performance: {route}")
        elif parts[0] not in ("lineup", "listen"):
            raise BuildError(f"unknown app route: {route}")
        q = parse_qs(query).get("q", [""])[0]
        if parts[0] == "lineup" and q and not self.search_hits(q):
            raise BuildError(f"app search link finds no lineup entry: {route}")
        return APP + "#/" + route

    def search_hits(self, query):
        tokens = normalize(query).split(" ")
        hits = []
        for p in self.d.perf:
            names = [p["display_name"]]
            for aid in p["artist_ids"]:
                a = self.d.artists.get(aid) or {}
                names += [a.get("display_name", ""), a.get("search_name", "")] + list(a.get("aliases") or [])
            hay = normalize(" ".join(names))
            if all(t in hay for t in tokens):
                hits.append(p)
        return hits

    def app_link(self, route, text):
        return f'<a class="applink" href="{ESC(self.app_href(route))}">{text}</a>'

    def artist_route(self, artist_id):
        return self.app_href("artist/" + artist_id)

    def directive(self, page, name, arg):
        args = [a.strip() for a in arg.split("|")] if arg else []
        if name == "ui":
            # Quoted interface copy. Rendered as-is; tests/test_about_site.py checks the app still contains it.
            self.ui_strings.add(arg)
            return ESC(arg)
        if name == "stat":
            if args[0] not in self.stats:
                raise BuildError(f"{page['file']}: unknown stat {args[0]}")
            v = self.stats[args[0]]
            return ESC(str(v))
        if name == "app":
            return self.app_link(args[0], args[1] if len(args) > 1 else "Open")
        if name == "page":
            slug, _, anchor = args[0].partition("#")
            if slug not in self.slugs:
                raise BuildError(f"{page['file']}: link to unknown page {slug!r}")
            self.page_links.append((page, slug, anchor))
            href = self.slugs[slug]["url"] + ("#" + anchor if anchor else "")
            text = args[1] if len(args) > 1 else ESC(self.slugs[slug]["title"])
            return f'<a href="{href}">{text}</a>'
        if name == "ext":
            url, text = args[0], args[1]
            if not url.startswith("https://"):
                raise BuildError(f"{page['file']}: external links must be https: {url}")
            return (f'<a class="ext" href="{ESC(url)}" target="_blank" rel="noopener noreferrer">{text}'
                    f'<span class="vh"> (opens in a new tab)</span><span aria-hidden="true"> ↗</span></a>')
        if name == "shot":
            return self.shot(page, *args)
        if name == "list":
            fn = getattr(self, "list_" + args[0], None)
            if not fn:
                raise BuildError(f"{page['file']}: unknown list {args[0]}")
            return fn(page)
        raise BuildError(f"{page['file']}: unknown directive {name}")

    def shot(self, page, name, alt, caption="", variant=""):
        meta = self.shots.get(name)
        if not meta:
            raise BuildError(f"{page['file']}: screenshot {name!r} missing from about-site/img/shots.json")
        if not (SRC / "img" / meta["file"]).exists():
            raise BuildError(f"{page['file']}: screenshot file {meta['file']} missing")
        cls = "shot" + (" " + variant if variant else "")
        cap = f"<figcaption>{caption}</figcaption>" if caption else ""
        return (f'<figure class="{cls}"><img src="{BASE}img/{meta["file"]}" width="{meta["width"]}" '
                f'height="{meta["height"]}" alt="{ESC(alt)}" loading="lazy" decoding="async">{cap}</figure>')

    # Live lists ------------------------------------------------------
    def list_songs(self, page):
        rows = []
        for artist_id, songs in sorted(self.d.by_artist.items(), key=lambda kv: self.d.artists[kv[0]]["display_name"].lower()):
            a = self.d.artists[artist_id]
            items = "".join(
                f'<li><a class="ext" href="{ESC(s["url"])}" target="_blank" rel="noopener noreferrer">{ESC(s["title"])}'
                f'<span class="vh"> by {ESC(a["display_name"])} on YouTube (opens in a new tab)</span><span aria-hidden="true"> ↗</span></a>'
                + ('' if s.get("review_status") == "strong" else ' <span class="tagline">version may differ</span>')
                + "</li>" for s in songs)
            n = len(songs)
            rows.append(f'<li class="cov"><a class="cov-name" href="{ESC(self.artist_route(artist_id))}">{ESC(a["display_name"])}</a>'
                        f'<span class="cov-n">{n} song{"s" if n != 1 else ""}</span><ul>{items}</ul></li>')
        return f'<ul class="coverage">{"".join(rows)}</ul>'

    def list_days(self, page):
        cells = []
        for key, name, _short in DAYS:
            n = sum(p["event_date"] == key for p in self.d.perf)
            with_songs = sum(p["event_date"] == key and self.d.has_songs(p) for p in self.d.perf)
            d = date.fromisoformat(key)
            label = f"{d:%b} {d.day}"
            cells.append(f'<li><a class="daycard" href="{ESC(self.app_href("lineup?day=" + key))}">'
                         f'<span class="dc-day">{name}</span><span class="dc-date">{label}</span>'
                         f'<span class="dc-n">{n} lineup entries</span><span class="dc-s">{with_songs} with a reviewed song</span></a></li>')
        return f'<ul class="days">{"".join(cells)}</ul>'

    def list_stages(self, page):
        return '<ul class="pills">' + "".join(f"<li>{ESC(s['display_name'])}</li>" for s in self.d.stages) + "</ul>"

    def list_b2b(self, page):
        rows = [p for p in self.d.perf if p.get("performance_type") == "b2b"]
        items = "".join(f'<li><a href="{ESC(self.app_href("artist/" + p["performance_id"]))}">{ESC(p["display_name"])}</a></li>' for p in rows)
        return f'<ul class="pills links">{items}</ul>'

    def list_playlist(self, page):
        pl = self.d.playlist
        listen = self.app_link("listen", "Tracks tab")
        if pl.get("status") == "published" and pl.get("verified_cross_account") is True and str(pl.get("url", "")).startswith("https://"):
            return (f'<p>The {ESC(pl.get("label") or "event playlist")} is ready. Open it from the {listen}; it plays on YouTube Music. '
                    "Songs rotate so every matched artist gets a spin before anyone repeats.</p>")
        self.ui_strings.add("Coming soon")
        return ("<p>An event-wide playlist on YouTube Music is planned but not available yet. It won’t appear until it has been "
                f"checked to play for everyone, not just the person who made it. Until then, the {listen} says “Not available” "
                "instead of showing a link that doesn’t work. The plan is for songs to rotate so every artist gets a spin before anyone repeats.</p>")

    def list_guides(self, page):
        cards = []
        for p in self.pages[1:]:
            cards.append(f'<li><a class="guide" href="{p["url"]}"><span class="g-title">{ESC(p["title"])}</span>'
                         f'<span class="g-desc">{ESC(p.get("summary") or p["description"])}</span></a></li>')
        return f'<ul class="guides">{"".join(cards)}</ul>'

    # Page assembly ----------------------------------------------------
    def body(self, page):
        out = DIRECTIVE.sub(lambda m: self.directive(page, m.group(1), m.group(2)), page["body"])
        if "{{" in out or "}}" in out:
            raise BuildError(f"{page['file']}: unresolved directive")
        for tag in ("h2", "h3"):
            for m in re.finditer(rf"<{tag}(?![^>]*\bid=)[^>]*>", out):
                raise BuildError(f"{page['file']}: every <{tag}> needs an id ({m.group(0)})")

        def anchor(tag):
            def sub(m):
                label = ESC(plain(m.group(2)))
                return (f'<{tag} id="{m.group(1)}">{m.group(2)}'
                        f'<a class="anchor" href="#{m.group(1)}" aria-label="Copy link to {label}">#</a></{tag}>')
            return sub
        out = H2.sub(anchor("h2"), out)
        out = H3.sub(anchor("h3"), out)
        page["ids"] = set(re.findall(r'\bid="([^"]+)"', out))
        page["sections"] = [(m.group(1), plain(m.group(2))) for m in H2.finditer(page["body"])]
        page["html"] = out
        return out

    def search_index(self):
        idx = []
        for p in self.pages:
            parts = re.split(r'(?=<h2 id=")', p["html"])
            for part in parts:
                m = re.match(r'<h2 id="([^"]+)">(.*?)<a class="anchor"', part, re.S)
                anchor, heading = (m.group(1), plain(m.group(2))) if m else ("", p["title"])
                text = plain(re.sub(r'<a class="anchor".*?</a>', "", part))
                idx.append({"url": p["url"] + ("#" + anchor if anchor else ""), "page": p["title"],
                            "heading": heading, "text": text[:1200]})
            # Each FAQ answer is also its own result, linking straight to the open question.
            for m in re.finditer(r'<details id="([^"]+)">\s*<summary>(.*?)</summary>(.*?)</details>', p["html"], re.S):
                idx.append({"url": p["url"] + "#" + m.group(1), "page": p["title"],
                            "heading": plain(m.group(2)), "text": plain(m.group(3))[:600]})
        # Every lineup entry too, so searching an act's name jumps straight to its page in the app.
        for perf in self.d.perf:
            names = [perf["display_name"]]
            for aid in perf["artist_ids"]:
                a = self.d.artists.get(aid)
                if a:
                    names += [a["display_name"], a.get("search_name") or ""] + list(a.get("aliases") or [])
            day = next((f"{n}, {date.fromisoformat(k):%b} {date.fromisoformat(k).day}" for k, n, _s in DAYS if k == perf["event_date"]), perf.get("day", ""))
            idx.append({"url": self.app_href("artist/" + perf["performance_id"]), "page": f"On the lineup · {day}",
                        "heading": perf["display_name"], "text": " ".join(n for n in names if n), "act": True})
        return idx

    def check_links(self):
        for page, slug, anchor in self.page_links:
            if anchor and anchor not in self.slugs[slug]["ids"]:
                raise BuildError(f"{page['file']}: link to missing anchor {slug}#{anchor}")


# ---------------------------------------------------------------- layout
def nav_list(pages, current, cls):
    items = []
    for p in pages:
        cur = ' aria-current="page"' if p is current else ""
        items.append(f'<li><a href="{p["url"]}"{cur}>{ESC(p["nav"])}</a></li>')
    return f'<ul class="{cls}">{"".join(items)}</ul>'


SEARCH = """<form class="search" data-search role="search" hidden>
  <label class="vh" for="{id}">Search help</label>
  <input id="{id}" type="search" placeholder="Search help" autocomplete="off" spellcheck="false" aria-describedby="{id}-status">
  <p id="{id}-status" class="vh" role="status" aria-live="polite"></p>
  <ul class="results" aria-label="Help search results"></ul>
</form>"""


def layout(page, pages, i, stats):
    title = page["title"]
    is_home = page["slug"] == ""
    doc_title = "About Listening Room" if is_home else f"{title} · Listening Room"
    toc = ""
    if len(page["sections"]) >= 2:
        links = "".join(f'<li><a href="#{a}">{ESC(t)}</a></li>' for a, t in page["sections"])
        toc = f'<ul>{links}</ul>'
    prev_p = pages[i - 1] if i > 0 else None
    next_p = pages[i + 1] if i + 1 < len(pages) else None
    pager = '<nav class="pager" aria-label="More help">'
    if prev_p:
        pager += f'<a class="prev" href="{prev_p["url"]}" rel="prev"><span>Previous</span>{ESC(prev_p["nav"])}</a>'
    if next_p:
        pager += f'<a class="next" href="{next_p["url"]}" rel="next"><span>Next</span>{ESC(next_p["nav"])}</a>'
    pager += "</nav>"
    crumbs = "" if is_home else (
        '<nav class="crumbs" aria-label="Breadcrumb"><ol>'
        f'<li><a href="{BASE}">About</a></li><li><span aria-current="page">{ESC(title)}</span></li></ol></nav>')
    heading = "" if is_home else f'<h1 id="top">{ESC(title)}</h1>'
    lede = "" if is_home or not page.get("lede") else f'<p class="lede">{page["lede"]}</p>'
    toc_mobile = f'<details class="toc-inline"><summary>On this page</summary>{toc}</details>' if toc else ""
    toc_side = f'<aside class="toc" aria-labelledby="toc-h"><p id="toc-h" class="toc-h">On this page</p>{toc}</aside>' if toc else '<aside class="toc" aria-hidden="true"></aside>'
    desc = ESC(page["description"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b1020">
<title>{ESC(doc_title)}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{SITE}{page['url']}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Listening Room">
<meta property="og:title" content="{ESC(doc_title)}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{SITE}{page['url']}">
<meta property="og:image" content="{SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Listening Room: hear the EDC Orlando 2026 lineup before you go. Independent and unofficial.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="{BASE}assets/about.css">
<script defer src="{BASE}assets/about.js"></script>
</head>
<body class="{'home' if is_home else 'doc'}">
<a class="skip" href="#content">Skip to content</a>
<header class="top">
  <div class="bar">
    <a class="brand" href="{APP}" aria-label="Listening Room app"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span><span class="wordmark">LISTENING ROOM</span></a>
    <a class="section-link" href="{BASE}"{' aria-current="page"' if is_home else ''}>About</a>
    <span class="spacer"></span>
    <details class="menu">
      <summary><span class="burger" aria-hidden="true"></span>Menu</summary>
      <div class="menu-panel">
        {SEARCH.format(id="q-menu")}
        <nav aria-label="About and help, menu">{nav_list(pages, page, "navlist")}</nav>
      </div>
    </details>
    <a class="app-btn" href="{APP}"><span>Open</span><span class="hide-xs">the app</span></a>
  </div>
</header>
<div class="shell">
  <nav class="side" aria-label="About and help">
    {SEARCH.format(id="q-side")}
    {nav_list(pages, page, "navlist")}
  </nav>
  <main id="content" tabindex="-1">
    {crumbs}
    {heading}
    {lede}
    {toc_mobile}
    <article class="prose">
{page['html']}
    </article>
    {pager}
    <p class="stamp">Lineup data last checked {ESC(stats['checked_on'])}. Counts on these pages update with the lineup.</p>
  </main>
  {toc_side}
</div>
<footer class="foot">
  <div class="foot-in">
    <p><strong>Independent and unofficial.</strong> Listening Room isn’t affiliated with, endorsed by or sponsored by EDC or Insomniac. Artist and event names identify performers and the event; trademarks belong to their owners.</p>
    <p class="foot-links"><a href="{APP}">Open Listening Room</a><a href="{BASE}privacy/">Privacy &amp; terms</a><a href="{BASE}accessibility/">Accessibility</a><a href="https://orlando.edc.com/lineup/" target="_blank" rel="noopener noreferrer">Official lineup<span class="vh"> (opens in a new tab)</span><span aria-hidden="true"> ↗</span></a></p>
  </div>
</footer>
<p class="toast" role="status" aria-live="polite"></p>
</body>
</html>
"""


# ---------------------------------------------------------------- build
def build(out=None):
    out = Path(out) if out else ROOT / "public-site"
    data = Data()
    pages = read_pages()
    shots = json.loads((SRC / "img" / "shots.json").read_text(encoding="utf-8"))
    r = Renderer(data, pages, shots)
    for p in pages:
        r.body(p)
    r.check_links()
    dest = out / "about"
    if dest.exists():
        shutil.rmtree(dest)
    for i, p in enumerate(pages):
        target = dest / p["slug"] / "index.html" if p["slug"] else dest / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(layout(p, pages, i, r.stats), encoding="utf-8")
    (dest / "assets").mkdir(parents=True, exist_ok=True)
    for name in ("about.css", "about.js"):
        shutil.copyfile(SRC / "assets" / name, dest / "assets" / name)
    (dest / "img").mkdir(exist_ok=True)
    for meta in shots.values():
        shutil.copyfile(SRC / "img" / meta["file"], dest / "img" / meta["file"])
    (dest / "search.json").write_text(json.dumps(r.search_index(), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    # Site-wide brand files (favicon, home-screen icon, link-preview image) live at the root.
    for f in sorted((SRC / "brand").iterdir()):
        if f.is_file():
            shutil.copyfile(f, out / f.name)
    return {"pages": len(pages), "shots": len(shots), "stats": r.stats, "ui_strings": sorted(r.ui_strings)}


if __name__ == "__main__":
    result = build(sys.argv[1] if len(sys.argv) > 1 else None)
    print(f"About section: {result['pages']} pages, {result['shots']} screenshots.")
