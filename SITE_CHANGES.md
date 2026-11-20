# Site changes log

Record of changes made to this repository by the speech-demo side, written so that a person or an AI
assistant working on the image demo can see exactly what changed, why, and what was deliberately left alone.
Newest entry first. Repository convention kept in every commit: author and committer
`Anonymous Authors <anonymous@example.invalid>` (double-blind review: no names, no affiliation anywhere).

---

## 2026-11-21 — One site, two demos (`/image/` and `/speech/`), shared look

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
