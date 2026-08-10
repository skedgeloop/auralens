<div align="center">

<br/>

```
 █████╗ ██╗   ██╗██████╗  █████╗ ██╗     ███████╗███╗   ██╗███████╗
██╔══██╗██║   ██║██╔══██╗██╔══██╗██║     ██╔════╝████╗  ██║██╔════╝
███████║██║   ██║██████╔╝███████║██║     █████╗  ██╔██╗ ██║███████╗
██╔══██║██║   ██║██╔══██╗██╔══██║██║     ██╔══╝  ██║╚██╗██║╚════██║
██║  ██║╚██████╔╝██║  ██║██║  ██║███████╗███████╗██║ ╚████║███████║
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝
```

**AI-Powered Professional Photo Editor — Runs 100% In Your Browser**

[![License](https://img.shields.io/badge/license-AGPLv3%20%2F%20Commercial-blueviolet?style=for-the-badge)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-ff2d6f?style=for-the-badge&logo=vercel&logoColor=white)](https://auralens.pages.dev)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-AI%20On--Device-orange?style=for-the-badge&logo=tensorflow)](https://www.tensorflow.org/js)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20AI-f38020?style=for-the-badge&logo=cloudflare)](https://workers.cloudflare.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](./CONTRIBUTING.md)

<br/>

> **No server. No uploads. No subscriptions.**
> Every pixel stays on your device.

<br/>

[**🚀 Live Demo**](https://auralens.pages.dev) · [**📖 Documentation**](#-the-ai-engine) · [**💼 Commercial License**](#licensing) · [**🐛 Report Bug**](https://github.com/skedgeloop/auralens/issues) · [**✨ Request Feature**](https://github.com/skedgeloop/auralens/issues)

<br/>

![AuraLens Screenshot](https://opengraph.githubassets.com/0136a990071aa4c4fed31cd36d16c6dddd38131c061e19eaa09e2ca9acfe9b02/skedgeloop/auralens)

</div>

---

## ✨ What is Aura?

**Aura** is a **professional-grade, AI-powered photo editor** that runs entirely in your browser — your images never leave your device. It pairs a **multi-model AI engine** (cloud vision + on-device ML) with a **desktop-class editing suite** — curves, frequency separation, magic wand, dodge & burn, and more — all served statically from Cloudflare Pages.

Built for photographers, designers, and creators who want a fast, private, embeddable editing experience.

---

## 🤖 The AI Engine

A resilient multi-model pipeline — **server + client** — that always returns results.

| Model | Runs On | What It Does |
|-------|---------|-------------|
| **Llama 3.2 Vision** | Cloud · Workers AI | Reads the photo, picks your aura + facial expression |
| **CLIP** | Cloud · Workers AI | Zero-shot vibe classification across **21 aura tags** |
| **DETR** | Cloud · Workers AI | Object detection + person/face boxes |
| **face-api** | Browser | Face landmarks + expression scoring |
| **Blazeface** | Browser | Fast face-bounding-box detection |
| **COCO-SSD** | Browser | 80+ object classes, runs locally |

**Smart pipeline:**
- ⚡ **Auto-enhance** — the recommended smart-enhance auto-applies after analysis (toggleable)
- 🔄 **Compare slider** — pops open automatically to drag original ↔ enhanced
- 💾 **KV-cached results** — aura/emotion results persist in Cloudflare KV (instant re-visits)
- 🔁 **Server retry** — the fixed server models are always preferred; pixel analysis is a last-resort fallback

### ✨ Aura Tags

`handsome` `gorgeous` `cute` `stunning` `beautiful` `alpha energy` `main character` `hot` `aesthetic` `iconic` `legendary` `dark vibes` `soft vibes` `chaotic energy` `elegant` `classy` `boss energy` `dreamy` `ethereal` `playful` `mysterious`

---

## 🎨 Editing Suite

### 🖌️ Core
| | |
|---|---|
| ✂️ **Crop / Rotate / Flip** | Aspect presets + free crop, 90° steps, H/V flip |
| ⏪ **Undo / Redo / Undo-All** | Stepwise history with visual timeline + one-tap reset |
| 🌗 **Compare Slider** | Drag original ↔ edited, auto-opens after AI |
| 📤 **Export** | PNG / JPEG / WebP with quality control |
| 🔗 **Share** | Web Share API with clipboard fallback |

### 🌈 Color & Tone
| | |
|---|---|
| 📈 **Curves** | Cubic-spline per-channel LUT (R/G/B/Master) with draggable points |
| ⚖️ **Levels** | Black point / white point / gamma |
| 🌡️ **Color Balance & HSL** | Shadow/mid/highlight balance + hue-band targeting |
| 🌈 **Color Grade** | RGB channel gain + split-tone gradient + temperature + vibrance |
| 🖼️ **17 Filters** | Grayscale, sepia, vintage, cinematic, noir, matte, dreamy, neon, HDR + more |
| 🔦 **Vignette** | Radial darkening with radius/feather |
| 🎞️ **Film Grain** | Deterministic seeded noise |

### 🔬 Professional Analysis
| | |
|---|---|
| 📊 **Histogram Scope** | Live luminance + RGB histograms, exposure stats |
| 📈 **Waveform / Vectorscope** | Chroma scatter scope |
| 🎨 **Palette Extractor** | Median-cut 5 dominant colors, HEX/RGB/share, click-to-copy |
| 🏷️ **EXIF Viewer** | Make, model, ISO, aperture, shutter, focal length, date |

### ✨ Retouching
| | |
|---|---|
| 🧴 **Skin Smoothing** | Skin-mask + light blur that preserves texture & edges |
| 🦷 **Teeth Whitening** | Mouth-landmark targeted de-yellow + brighten |
| 👁️ **Red-Eye Fix** | Red-channel spike detection → natural correction |
| ✨ **Frequency Separation** | High (texture) / low (color) layer split for pro retouching |
| 🖌️ **Dodge & Burn** | Brush strokes gated to shadows / midtones / highlights |
| 🔪 **Sharpen / Clarity** | Unsharp mask with amount / radius / threshold |

### 🧙 Advanced Tools
| | |
|---|---|
| 🪄 **Magic Wand** | 8-way flood-fill selection by color distance, tolerance-tuned |
| 🎯 **Selective Effects** | Blur / desaturate only inside a selection, invert masks |
| 📐 **Perspective** | 3×3 homography — tilt / keystone / skew |
| 🌀 **Mesh Warp** | Grid deformation — bulge, pinch, wave |
| 🌫️ **Bokeh / DOF** | Radial disk-blur with a focus point |
| 💨 **Motion Blur** | Directional Gaussian blur along any angle |

### 🧩 UX & Performance
| | |
|---|---|
| ⌨️ **Keyboard Shortcuts** | Ctrl+Z undo · Ctrl+S export · Space compare |
| 🖱️ **Drag-resizable sidebar** | Resize the whole edit panel (240–560px) |
| 📍 **Floating tools** | Move to any corner; AI panel width slider |
| 🔄 **AI toggle** | Turn off auto-enhance to work fully manually |
| ⚡ **Parallel analysis** | Client models run concurrently — ~3× faster |

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
│  Static assets · Pages Functions                             │
│  Workers AI (Llama 3.2 vision · CLIP · DETR)                 │
│  Cloudflare KV (persistent result cache)                     │
└──────────────────────────────────────────────────────────────┘
```

**Stack:** React + Next.js · Tailwind CSS · Canvas 2D · TensorFlow.js · Cloudflare Pages + Workers AI + KV
**Philosophy:** every pixel operation runs client-side — no image is ever sent to a server, no account, no tracking.

---

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/skedgeloop/auralens.git
cd auralens

# Install
npm install

# Dev
npm run dev          # → http://localhost:3000

# Production build
npm run build
npm run start
```

### Deploy to Cloudflare Pages

```bash
npm install -g wrangler
npm run build
wrangler pages deploy ./out
```

> The cloud AI features need a Worker with the Workers AI binding + KV (see `functions/`
> and `wrangler.jsonc`). Without it, the app still works fully client-side via
> face-api / Blazeface / COCO-SSD + pixel analysis.

---

## 📁 Project Structure

```
auralens/
├── pages/
│   ├── _app.js / _document.js     # App shell + fonts
│   └── index.js                   # Main editor (layout, state, AI pipeline, export)
├── src/
│   ├── components/                # 25+ panels & tools (Curves, Palette, Warp…)
│   ├── lib/                       # imageFilters, colorTools, portrait, exif,
│   │                              # floodFill, medianCut, frequencyLayers, aiEngine
│   ├── hooks/                     # useEditHistory, useKeyboardShortcuts
│   └── styles/globals.css         # Dark pink theme
├── functions/api/ai.js            # Pages Function (Workers AI + KV cache)
├── scripts/                       # Post-build CSS inlining + self-checks
├── next.config.js · tailwind.config.js
└── package.json
```

---

## 📄 Licensing

This project is **dual-licensed**:

| License | Use |
|---------|-----|
| **AGPL-3.0** | Open-source / community use. Derivative works must remain open-source under AGPL. |
| **Commercial** | Proprietary use, SaaS, internal tooling, or closed-source derivatives. Contact `skedgeloop@gmail.com` for a commercial license. |

See [LICENSE](./LICENSE) for full terms.

---

<div align="center">

**Built with 💗 by [SKEdgeloop](https://github.com/skedgeloop)**

*no servers · no accounts · your photos stay on your device*

[⬆ Back to top](#aura)

</div>

<!-- ci: pr-agent trigger -->
