# Site changes log

Record of changes made to this repository by the speech-demo side, written so that a person or an AI
assistant working on the image demo can see exactly what changed, why, and what was deliberately left alone.
Newest entry first. Repository convention kept in every commit: author and committer
`Anonymous Authors <anonymous@example.invalid>` (double-blind review: no names, no affiliation anywhere).

---

## 2026-11-21 — One site, two demos (`/image/` and `/speech/`), shared look  (commit `fb5a7ea`)

Requested by the image-demo author: unify the visual style of the two demos, give the image demo its own
URL `/image/`, and let visitors switch between the two demos. **Only appearance and file location changed.
No behaviour, text, model or computation of the image demo was changed.**

### Resulting URLs

| URL | What |
|---|---|
| `https://numerical-analogy.github.io/numerical-analogy-demo/` | redirects to `image/` (old links keep working) |
| `.../numerical-analogy-demo/image/` | image demo (handwriting analogy solver + power calculator) |
| `.../numerical-analogy-demo/speech/` | speech demo (speaker and emotion conversion) |

The GitHub Actions workflow (`.github/workflows/pages.yml`) is unchanged: it still publishes the whole `dist/`.

### 1. Image demo moved from `dist/` to `dist/image/` (byte-identical)

`git mv`, contents unchanged (git reports R100 for every file):
`app.js`, `inference.js`, `power.js`, `models/` (classifier.onnx, manifest.json, proposed_decoder.onnx,
proposed_encoder.onnx), `vendor/` (ort.wasm.min.js, ort-wasm-simd-threaded.mjs, ort-wasm-simd-threaded.wasm,
LICENSE, ThirdPartyNotices.txt).

This works without code changes because every asset is loaded relative to the module:
`new URL('./vendor/', import.meta.url)` and `new URL('./models/<name>.onnx', import.meta.url)` in `inference.js`.

### 2. `dist/image/index.html` (moved, 3 edits, all in the page frame)

- `<meta name="color-scheme" content="light">` → `content="light dark"` (the site now has a dark mode).
- Added `<link rel="stylesheet" href="../common.css">` before `styles.css`.
- Replaced the old top bar
  `<header class="topbar"><a class="brand" href="./">Numerical analogy <span>on images</span></a></header>`
  with the shared top bar:
  `<nav class="sitenav">` — site name "Numerical analogy" (links to `../`) and two tabs, **Images** (current,
  `aria-current="page"`) and **Speech** (`../speech/`).

Everything inside `<main>` (headings, canvases, ids, buttons, calculator, texts) is unchanged, so `app.js`
finds every element as before.

### 3. `dist/image/styles.css` (moved, restyled)

Same selectors and same layout values (grid columns, gaps, breakpoints 850 px / 620 px, canvas sizes);
the file is no longer minified. Changes:

- Colours now come from the shared tokens in `dist/common.css` (`--accent`, `--ink`, `--muted`, `--line`,
  `--surface`, …) instead of hard-coded blues/greys. `--blue` is kept as an alias of `--accent`.
  Accent colour: maroon `#8e1b2e` (light) / `#e0788a` (dark).
- Font: system UI stack (`--font`) instead of Inter. Georgia is kept for the A / B / C letters and `:` `::`.
- Cards: radius 14 px and a soft shadow; buttons are pill-shaped; inputs follow the theme (also in dark mode).
- `main` max width 1240 → 1120 px and side padding 28 → 16 px, to match the speech demo and the top bar.
- `h1` sized like the speech demo's title (`clamp(1.8rem, 4.2vw, 2.8rem)`); `.intro` padding adjusted.
- Removed the `.topbar` and `.brand` rules (that markup no longer exists; the top bar is styled in `common.css`).
- **The drawing and output canvases stay black** (`#080d16`): `app.js` draws white strokes on black and the
  model reads that, so these colours are functional, not decoration.

### 4. New shared file `dist/common.css`

Colour tokens for light and dark mode (follows the OS setting; `:root[data-theme="dark"|"light"]` can force
one), body font and background, and the top bar (`.sitenav`, sticky). Both demos link it as `../common.css`.
Change the palette here to restyle both demos at once.

### 5. `dist/index.html` (new content: redirect)

The old image page at the root is replaced by a tiny page that redirects to `image/`
(meta refresh + `location.replace`, keeping any query string / hash), with plain fallback links.

### 6. Speech demo (`dist/speech/`)

- `index.html`: links `../common.css`; uses the same top bar (Speech tab current); the earlier
  "← Numerical analogy on images" link was removed (the tabs replace it).
- `style.css`: its own colour tokens moved into `common.css`; white text on accent buttons uses `--on-accent`.

### 7. Developer scripts (path only)

- `scripts/export_models.py`: `OUT = ROOT / 'dist'` → `OUT = ROOT / 'dist' / 'image'`
  (exported models and the ONNX Runtime files go where the page now is; the `dist/...` names inside the
  onnxruntime-web tarball are untouched).
- `scripts/browser_check.py`: `url = 'http://127.0.0.1:8767/dist/'` → `'http://127.0.0.1:8767/dist/image/'`.
  Note its check `assert page.locator('.local-badge').count()==0` still holds (no badge in the page).

### Not changed

`README.md` (still says `dist/`; serving `dist/` still works because the root redirects to `image/`),
`Start_Demo.cmd`, `.gitignore`, `.github/workflows/pages.yml`, all JavaScript, models and vendor files.

### How it was checked (local server on `dist/`, Chrome)

- `/` redirects to `/image/`; models load (Solve button becomes "Solve"); no console errors.
- Drawing 1 : 0 :: 1 : ? → digits recognised as 1, 0, 1; Solve produces a non-empty generated digit;
  the power calculator with the default 1 : 4 :: 7 : 8 gives "power = 2".
- Tabs switch between `/image/` and `/speech/`; the speech demo plays audio.
- Light and dark mode, desktop and phone width (375 px): no horizontal scrolling.

---

## 2026-11-21 — Speech demo: link back to the image demo  (commit `4638dda`)

`dist/speech/index.html` and `dist/speech/style.css` only: a "← Numerical analogy on images" link (`href="../"`)
above the speech demo's title. **Superseded by `fb5a7ea`**: the link was removed and replaced by the shared top bar
with Images / Speech tabs. No file of the image demo was touched.

---

## 2026-11-21 — Add the speech demo under `dist/speech/`  (commit `d28beb5`)

New folder only; no existing file was changed (at that time the image demo was still at the root of `dist/`).

| File | Role |
|---|---|
| `dist/speech/index.html` | page: choose one of 3 sentences, a source recording (4 × 5 grid: speaker × emotion), a target speaker and emotion; play original, conversion, real target recording |
| `dist/speech/app.js` | interaction; one shared `Audio` player; file names `audio/<sentence>_<speaker>_<emotion>_real.mp3` and `audio/<sentence>_<speaker>_<emotion>_to_<speaker'>_<emotion'>.mp3` |
| `dist/speech/faces.js` | face icons drawn as inline SVG (`faceSVG(speaker, emotion)`), one look per speaker, one expression per emotion |
| `dist/speech/style.css` | layout of the speech demo (colour tokens later moved to `dist/common.css`) |
| `dist/speech/audio/` | 1,134 pre-generated mp3 clips (about 30 MB), no ID3 tags |

What the clips are: EmoV-DB (speakers bea, jenie: female; sam, josh: male; emotions Neutral, Amused, Angry, Sleepy,
Disgusted), three held-out test sentences (arctic_a0044, a0046, a0043: the only test sentences recorded by all 18
existing speaker × emotion cells). Each of the 18 recordings per sentence is converted to all 20 targets by a VAE
with separate content / speaker / emotion representations trained with numerical-analogy losses; target vectors are
means over the target speaker's test recordings in that emotion reading other sentences. Josh never recorded Angry
or Disgusted: those two targets are solved by numerical analogy `sam neutral : sam <emotion> :: josh neutral : ?`.
Every clip, real recordings included, goes through the same vocoder (HiFi-GAN of kNN-VC on WavLM layer-6 features).
The audio is generated offline; the page needs no model and no server.

---

## Notes for whoever edits next

- Keep the two demos in their own folders (`dist/image/`, `dist/speech/`); shared look only in `dist/common.css`.
- Add a new entry at the top of this file for every change, with the commit hash.
- Anonymity: commit as `Anonymous Authors <anonymous@example.invalid>` and push with the shared anonymous
  GitHub account; no names, affiliations or e-mail addresses in pages, file names, comments or commit messages.
