// Render the site's raster brand files from HTML: the 180px home-screen icon and the
// 1200x630 link-preview image. Run after editing the designs below:
//   NODE_PATH=$(npm root -g) node scripts/render_brand_assets.js
// Output: about-site/brand/apple-touch-icon.png, about-site/brand/og.png (copied to the site root by build_about.py).
const { chromium } = require("playwright");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const OUT = path.join(__dirname, "..", "about-site", "brand");
const FONT = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

const icon = `<body style="margin:0;width:180px;height:180px;background:#0b1020;display:flex;align-items:flex-end;justify-content:center;gap:16px;padding-bottom:38px;box-sizing:border-box">
  <i style="width:28px;height:56px;border-radius:8px;background:#6ff0c4"></i>
  <i style="width:28px;height:106px;border-radius:8px;background:#ff8a78"></i>
  <i style="width:28px;height:78px;border-radius:8px;background:#ffd98a"></i></body>`;

const bars = [38, 70, 52, 92, 60, 84, 44, 100, 66, 80, 50, 88]
  .map((h, i) => `<i style="flex:1;height:${h}%;border-radius:6px 6px 2px 2px;background:${i % 5 === 4 ? "#ffd98a" : i % 3 === 2 ? "#ff8a78" : "#6ff0c4"};opacity:${0.55 + (h / 250)}"></i>`).join("");

const og = `<body style="margin:0;width:1200px;height:630px;overflow:hidden;font-family:${FONT};color:#f2f5ff;
  background:radial-gradient(circle at 18% 30%,#6ff0c42a,transparent 38%),radial-gradient(circle at 82% 18%,#ff8a7826,transparent 40%),#0b1020;position:relative">
  <div style="position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:16px">
    <span style="display:flex;align-items:flex-end;gap:5px;width:44px;height:40px">
      <i style="flex:1;height:55%;border-radius:4px;background:#6ff0c4"></i><i style="flex:1;height:100%;border-radius:4px;background:#ff8a78"></i><i style="flex:1;height:75%;border-radius:4px;background:#ffd98a"></i></span>
    <span style="font-weight:900;letter-spacing:.16em;font-size:26px">LISTENING ROOM</span>
  </div>
  <div style="position:absolute;left:72px;top:150px;width:780px">
    <div style="display:inline-block;border:2px solid #33405f;border-radius:99px;padding:8px 20px;font-size:20px;font-weight:700;letter-spacing:.14em;color:#6ff0c4">EDC ORLANDO 2026 · NOV 6–8</div>
    <div style="margin-top:26px;font-size:66px;line-height:1.04;font-weight:850;letter-spacing:-.04em">Find an artist, check their day, <span style="color:#6ff0c4">try a track.</span></div>
    <div style="margin-top:24px;font-size:28px;color:#b4bdd6;line-height:1.35">An independent guide to the official lineup. Tracks open on YouTube.</div>
  </div>
  <div style="position:absolute;right:72px;bottom:160px;width:250px;height:240px;display:flex;align-items:flex-end;gap:9px">${bars}</div>
  <div style="position:absolute;left:72px;right:72px;bottom:56px;display:flex;justify-content:space-between;align-items:center;font-size:24px">
    <span style="font-weight:750;color:#f2f5ff">listeningroom.app</span>
    <span style="color:#b4bdd6">Independent · Unofficial · No sign-up</span>
  </div></body>`;

(async () => {
  const browser = await chromium.launch();
  for (const [file, html, w, h] of [["apple-touch-icon.png", icon, 180, 180], ["og.png", og, 1200, 630]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(html);
    await page.screenshot({ path: path.join(OUT, file) });
    console.log("rendered", file);
    await page.close();
  }
  await browser.close();
  // Optional: shrink the preview image (gradients make it large) when Pillow is available.
  try {
    execFileSync("python3", ["-c", "import sys\nfrom PIL import Image\nImage.open(sys.argv[1]).convert('RGB').quantize(colors=256, dither=Image.Dither.FLOYDSTEINBERG).save(sys.argv[1], optimize=True)", path.join(OUT, "og.png")]);
  } catch (_e) { console.log("Pillow unavailable; og.png left unoptimized."); }
})().catch(e => { console.error(e); process.exit(1); });
