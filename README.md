<div align="center">

# ✨ aura

### your photos, but make it iconic.

**[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-a?style=for-the-badge&color=ff2d6f)](https://auralens.pages.dev)**
**[![GitHub](https://img.shields.io/badge/GITHUB-grey?style=for-the-badge&logo=github)](https://github.com/skedgeloop/auralens)**

<br>

> Upload a photo → AI reads your face & vibe → auto-enhances it → you fine-tune
> with a full professional editing suite → export & flex.
> **All in your browser. No signup. No tracking. Your photos never leave your device.**

</div>

---

## 🎯 What It Does

```
yo, drop a photo
       ↓
   AI analyzes it (cloud vision + 3 in-browser models)
       ↓
   tells you your aura + reads your emotions
       ↓
   auto-applies the perfect smart-enhance
       ↓
   you fine-tune with 25+ pro tools
       ↓
   compare · export · share
```

---

## ✨ Aura Tags — What They Mean

The AI reads your photo and picks the vibe that fits. 21 labels, each with a confidence score.

| Tag | Meaning | Vibe |
|-----|---------|------|
| **handsome** | Strong, well-defined features | 💪 |
| **gorgeous** | Striking beauty, draws the eye | 👁️ |
| **cute** | Soft, approachable, warm energy | 🧸 |
| **stunning** | Wow factor, hard to look away | ✨ |
| **beautiful** | Balanced, pleasing composition | 🎨 |
| **alpha energy** | Confident, dominant presence | 🦁 |
| **main character** | Center of attention energy | ⭐ |
| **hot** | Attractive, magnetic pull | 🔥 |
| **aesthetic** | Visually pleasing, artistic feel | 🖼️ |
| **iconic** | Memorable, stands out | 👑 |
| **legendary** | Timeless, unforgettable | 🏆 |
| **dark vibes** | Moody, intense, mysterious | 🌑 |
| **soft vibes** | Gentle, calm, peaceful | 🌙 |
| **chaotic energy** | Wild, unpredictable, exciting | ⚡ |
| **elegant** | Refined, sophisticated, polished | 💎 |
| **classy** | Timeless style, good taste | 🎩 |
| **boss energy** | In-charge, powerful presence | 💼 |
| **dreamy** | Ethereal, otherworldly feel | 💭 |
| **ethereal** | Heavenly, almost too beautiful | 🌌 |
| **playful** | Fun, lighthearted, youthful | 🎮 |
| **mysterious** | Intriguing, hard to read, compelling | 🕵️ |

---

## 🤖 The AI Engine

A multi-model pipeline — **server + client**, with graceful fallback so you always get results.

| Model | Runs On | What It Does |
|-------|---------|-------------|
| **Llama 3.2 Vision** | Cloud (Workers AI) | Reads the photo, picks your aura + facial expression |
| **CLIP** | Cloud (Workers AI) | Zero-shot vibe classification across the 21 aura tags |
| **DETR** | Cloud (Workers AI) | Object detection + person/face boxes |
| **face-api** | Browser | Face landmarks + expression scoring |
| **Blazeface** | Browser | Fast face-bounding-box detection |
| **COCO-SSD** | Browser | 80+ object classes, runs locally |

**Smart pipeline features:**
- ⚡ **Auto-enhance** — after analysis, the recommended smart-enhance auto-applies (toggleable)
- 🔄 **Compare slider** — pops open automatically so you can drag original ↔ enhanced
- 💾 **KV-cached samples** — analyzed results persist in Cloudflare KV (instant re-visits)
- 🔁 **Server retry** — the fixed server models are always preferred; pixel analysis is a last-resort fallback

---

## 🎨 The Editing Suite

### 🖌️ Core Editing
| Feature | Description |
|---------|-------------|
| ✂️ **Crop** | Aspect-ratio presets (16:9, 1:1…) + free crop |
| 🔄 **Rotate / Flip** | 90° steps, horizontal/vertical flip |
| ⏪ **Undo / Redo** | Step-by-step history with a visual timeline |
| ↩️ **Undo All** | One-tap reset to the original image |
| 🌗 **Compare Slider** | Drag to compare original vs edited, auto-opens after AI |
| 📤 **Export** | PNG / JPEG / WebP with quality control |
| 🔗 **Share** | Web Share API (files) with clipboard fallback |

### 🌈 Color & Tone
| Feature | Description |
|---------|-------------|
| 📈 **Curves** | Cubic-spline per-channel (R/G/B/Master) LUT with draggable control points |
| ⚖️ **Levels** | Black point / white point / gamma |
| 🎚️ **Adjustments** | Brightness, contrast, saturation, temp, hue, sharpness, exposure |
| 🌡️ **Color Balance & HSL** | Shadow/mid/highlight balance + hue-band saturation/lightness |
| 🌈 **Color Grade** | Per-channel RGB gain + split-tone gradient + temperature + vibrance |
| 🖼️ **17 Filters** | Grayscale, sepia, vintage, cinematic, noir, matte, dreamy, neon, HDR pop + more |
| 🔦 **Vignette** | Radial darkening with radius/feather control |
| 🎞️ **Film Grain** | Deterministic seeded noise (preview matches apply) |

### 🔬 Professional Analysis
| Feature | Description |
|---------|-------------|
| 📊 **Histogram Scope** | Live luminance + RGB histograms, exposure clipping stats |
| 📈 **Waveform / Vectorscope** | Chroma scatter scope overlay |
| 🎨 **Palette Extractor** | Median-cut 5 dominant colors with HEX/RGB/share, click-to-copy |
| 🏷️ **EXIF Viewer** | Reads Make, Model, ISO, aperture, shutter, focal length, date |

### ✨ Retouching & Portraits
| Feature | Description |
|---------|-------------|
| 🧴 **Skin Smoothing** | Skin-mask + light blur that preserves texture & edges |
| 🦷 **Teeth Whitening** | Mouth-landmark targeted de-yellow + brighten |
| 👁️ **Red-Eye Fix** | Red-channel spike detection → natural dark correction |
| ✨ **Frequency Separation** | Split high (texture) / low (color) layers for pro retouching |
| 🖌️ **Dodge & Burn** | Brush strokes gated to shadows / midtones / highlights |
| 🔪 **Sharpen / Clarity** | Unsharp mask with amount / radius / threshold |

### 🧙 Advanced Tools
| Feature | Description |
|---------|-------------|
| 🪄 **Magic Wand** | 8-way flood-fill selection by color distance, with tolerance |
| 🎯 **Selective Effects** | Apply blur / desaturate only inside a selection, invert masks |
| 📐 **Perspective** | 3×3 homography (DLT) — tilt / keystone / skew |
| 🌀 **Mesh Warp** | Grid deformation — bulge, pinch, wave |
| 🌫️ **Bokeh / DOF** | Radial disk-blur with a focus point |
| 💨 **Motion Blur** | Directional Gaussian blur along any angle |

### 🧩 UX & Performance
| Feature | Description |
|---------|-------------|
| ⌨️ **Keyboard Shortcuts** | Ctrl+Z undo, Ctrl+S export, Space compare, + more |
| 📐 **Zoom** | Zoom in / out / fit |
| 🖱️ **Adjustable AI panel** | Width slider (200–520px) — resize to taste |
| 📍 **Floating tools** | Selection & Dodge/Burn panels move to any corner |
| 🔄 **AI auto-enhance toggle** | Turn off to work fully manually |
| ⚡ **Parallel model analysis** | Client models run concurrently — ~3× faster repeat analysis |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                        │
│  Next.js static export · Canvas 2D image engine              │
│  Pure-JS pixel pipelines (zero heavy deps)                   │
│  face-api / Blazeface / COCO-SSD (client ML)                 │
└──────────────────────────────┬───────────────────────────────┘
                               │ /api/ai
┌──────────────────────────────▼───────────────────────────────┐
│                    CLOUDFLARE PAGES (CDN)                    │
│  Static assets served globally · Pages Functions             │
│  Workers AI (Llama 3.2 vision · CLIP · DETR)                 │
│  Cloudflare KV (persistent sample-result cache)              │
└──────────────────────────────────────────────────────────────┘
```

**Stack:** React + Next.js 13 (static export) · Tailwind CSS · Cloudflare Pages + Workers AI + KV
**Philosophy:** every pixel operation runs client-side on a Canvas 2D engine — no image is ever sent to a server, no account, no tracking.

---

## 🚀 Run Locally

```bash
git clone https://github.com/skedgeloop/auralens.git
cd auralens
npm install
npm run dev
# → http://localhost:3000
```

> The AI cloud features need a Cloudflare Worker with the Workers AI binding + KV
> (see `worker/` and `wrangler.jsonc`). Without it, the app still works fully
> client-side via face-api / Blazeface / COCO-SSD + pixel analysis.

---

## 📄 License

MIT — do whatever you want with it.

---

<div align="center">

**Built with 💗 by [SKEdgeloop](https://github.com/skedgeloop)**

*no servers · no accounts · your photos stay on your device*

</div>
