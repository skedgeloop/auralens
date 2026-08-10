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
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-AI%20On--Device-orange?style=for-the-badge&logo=tensorflow)](https://www.tensorflow.org/js)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](./CONTRIBUTING.md)

<br/>

> **No server. No uploads. No subscriptions.**  
> Every pixel stays on your device.

<br/>

[**🚀 Live Demo**](https://auralens.pages.dev) · [**📖 Docs**](#documentation) · [**💼 Commercial License**](#licensing) · [**🐛 Report Bug**](https://github.com/skedgeloop/auralens/issues) · [**✨ Request Feature**](https://github.com/skedgeloop/auralens/issues)

<br/>

![AuraLens Screenshot](https://opengraph.githubassets.com/0136a990071aa4c4fed31cd36d16c6dddd38131c061e19eaa09e2ca9acfe9b02/skedgeloop/auralens)

</div>

---

## What is AuraLens?

AuraLens is a **professional-grade, AI-powered photo editor** that runs entirely inside your web browser — no backend, no cloud processing, no data leaving your device. Built on Next.js and powered by TensorFlow.js, it brings real machine learning to photo editing without requiring a single server call.

It is designed for photographers, designers, content creators, and developers who want a fast, private, embeddable editing experience.

---

## Features

### AI Engine
- **On-device object detection** — COCO-SSD (MobileNet v2) identifies 80 object classes directly in your browser via TensorFlow.js. Zero server round-trips. Your images never leave your machine.
- **AI-driven filter suggestions** — detected scene content (people, transport, nature, animals) automatically recommends the most visually fitting filter for your photo
- **Confidence scoring** — each detected object displays a real-time confidence percentage with glowing bounding box overlays

### Editing Tools
- **17 live filters** — Grayscale, Sepia, Vintage, Blur, Cinematic, Cool Tone, Warm Tone, Invert, Brightness Boost, Contrast Enhance, and more
- **Live filter preview grid** — every filter renders a real thumbnail of your actual photo before you apply it — no blind guessing
- **Canvas pixel processing** — all filter math runs on HTML5 Canvas, frame-accurate and non-destructive until export
- **PNG export** — download your edited result at full resolution

### Interface
- **Dark glassmorphism UI** — premium frosted-glass panels, animated gradient borders, glow micro-interactions
- **Drag & drop upload** — animated gradient drop zone accepting PNG, JPG, WEBP, GIF up to 10MB
- **Fully responsive** — desktop and tablet optimised
- **No ads. No tracking. No accounts.**

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 + React 18 | App shell, routing, SSG |
| Styling | Tailwind CSS + custom CSS | Dark glassmorphism UI |
| AI / ML | TensorFlow.js + COCO-SSD | On-device object detection |
| Rendering | HTML5 Canvas API | Pixel filter processing |
| Fonts | Space Grotesk + Inter | Premium typography |
| Icons | react-icons (Feather) | UI iconography |
| Deployment | Cloudflare Pages | Zero-cost global CDN |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/skedgeloop/auralens.git
cd auralens

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

### Deploy to Cloudflare Pages (Recommended)

```bash
# Install Wrangler CLI
npm install -g wrangler

# Build and deploy
npm run build
wrangler pages deploy ./out
```

Your editor is live globally on Cloudflare's CDN within seconds, with zero backend infrastructure.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│  1. UPLOAD ──► 2. DETECT ──► 3. SUGGEST ──► 4. EDIT ──► 5. EXPORT  │
│                                                                 │
│  Image read     TF.js runs     Scene-aware    Canvas pixel    PNG   │
│  as data URL    COCO-SSD       filter recs    math on GPU    download│
│                 locally                                         │
│                                                                 │
│              ✓ Zero server calls. 100% client-side.            │
└─────────────────────────────────────────────────────────────────┘
```

1. **Upload** — your image is read into browser memory as a data URL. Nothing is sent anywhere.
2. **Detect** — `COCO-SSD lite_mobilenet_v2` runs object detection in the browser via WebGL acceleration. Identifies up to 80 common object classes.
3. **Suggest** — detected classes map to contextual filter suggestions (people → warm/vintage tone, vehicles → cinematic, nature → cool/vivid).
4. **Edit** — filters run on an HTML5 Canvas element using pixel-level math. Live thumbnails preview every filter on your actual photo in real time.
5. **Export** — the edited canvas is serialised to PNG and downloaded directly.

---

## Project Structure

```
auralens/
├── pages/
│   ├── _app.js              # Global styles + providers
│   ├── _document.js         # Font loading + HTML shell
│   └── index.js             # Main editor (layout, state, AI pipeline, export)
│
├── src/
│   ├── components/
│   │   ├── UploadArea.jsx        # Animated drag & drop zone
│   │   ├── FilterControls.jsx    # Live preview filter grid
│   │   └── EditSuggestions.jsx   # AI suggestions panel
│   │
│   ├── lib/
│   │   ├── imageFilters.js       # Canvas pixel filter engine + thumbnail generator
│   │   └── filterSuggestions.js  # Object class → filter recommendation map
│   │
│   └── styles/
│       └── globals.css           # Dark theme, glassmorphism, animations
│
├── next.config.js
├── tailwind.config.js
├── package.json
└── README.md
```

---

## Roadmap

AuraLens v1 is the foundation. The roadmap builds toward a full professional desktop-grade editor in the browser.

- [x] On-device AI object detection (TensorFlow.js COCO-SSD)
- [x] AI-driven filter suggestions
- [x] 17 live canvas filters with real thumbnail previews
- [x] Dark glassmorphism UI
- [x] PNG export
- [ ] **v2** — Layer stack with blend modes, opacity, and non-destructive masks
- [ ] **v2** — Curves, Levels, and HSL color grading via WebGL shaders
- [ ] **v2** — Magic Wand, Lasso, and Color Range selection tools (OpenCV.js)
- [ ] **v2** — Command-pattern undo/redo history tree
- [ ] **v3** — Local AI background removal (ONNX Runtime Web, no server)
- [ ] **v3** — AI portrait retouching — skin smoothing, blemish removal via MediaPipe Face Mesh
- [ ] **v3** — Perspective correction and mesh warp (OpenCV.js WASM)
- [ ] **v3** — RAW file support (.CR2, .NEF, .ARW) via LibRaw WASM
- [ ] **v4** — Cloud AI: generative fill, object removal (Cloudflare Workers AI)
- [ ] **v4** — Hosted SaaS version with Pro tier and team collaboration

Want to accelerate a specific feature? [Open an issue](https://github.com/skedgeloop/auralens/issues) or see [commercial licensing](#licensing) for priority development options.

---

## Licensing

AuraLens uses a **dual-license model** to keep the project open while protecting it from commercial exploitation.

### Free — AGPLv3

```
This software is free to use, modify, and distribute under the
GNU Affero General Public License v3.0 (AGPLv3).

If you use AuraLens in a network-accessible product (a website, SaaS,
or hosted service), AGPLv3 requires you to make your entire project's
source code publicly available under the same license.
```

This means: personal projects, open-source tools, and non-commercial use are **100% free**. No restrictions.

### Commercial License

If you want to:
- Embed AuraLens into a **closed-source commercial product**
- Use it in a **SaaS platform** without open-sourcing your codebase
- **Rebrand and white-label** it as your own product
- Integrate it into an **enterprise or agency workflow**

You need a Commercial License. This exempts you from AGPLv3's open-source requirements.

| Use Case | License Required | Cost |
|---|---|---|
| Personal project / learning | AGPLv3 (free) | $0 |
| Open-source tool (publicly available source) | AGPLv3 (free) | $0 |
| Commercial SaaS or hosted product | Commercial | Contact for pricing |
| White-label / rebrand for resale | Commercial | Contact for pricing |
| Enterprise / agency embed | Commercial | Contact for pricing |

📩 **Enquire about a commercial license:** [skedgeloop@proton.me](mailto:skedgeloop@proton.me)

> **Note:** You may not fork this repository, rebrand it, and release it as your own open-source project. Derivative works must retain the AuraLens name and copyright attribution, or obtain a commercial license. See `LICENSE` and `COMMERCIAL.md` for full terms.

---

## Contributing

Contributions are welcome for bug fixes, new filters, and performance improvements.

**Before contributing**, please note:

1. All contributors must agree to the [Contributor License Agreement (CLA)](./CLA.md). This allows the project to be dual-licensed while keeping the commercial model viable.
2. By submitting a pull request, you confirm that you have read and agree to the CLA.
3. All contributed code becomes part of AuraLens under the dual AGPLv3 / Commercial license structure.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, code style, and PR guidelines.

---

## Privacy

AuraLens processes everything locally in your browser.

- **No images are uploaded** to any server
- **No analytics** are collected about your photos or edits
- **No accounts** are required
- **No cookies** are set for tracking purposes
- The AI model (COCO-SSD) is loaded once from a CDN and cached locally

Your photos are yours. They never leave your device.

---

## Self-Hosting

AuraLens is a static Next.js application. It can be deployed anywhere that serves static files:

| Platform | Command / Method | Cost |
|---|---|---|
| Cloudflare Pages | `wrangler pages deploy ./out` | Free |
| Vercel | `vercel deploy` | Free tier |
| Netlify | Drag & drop `./out` folder | Free tier |
| GitHub Pages | GitHub Actions workflow | Free |
| Any static host | Upload the `./out` folder | Varies |

---

<div align="center">

---

**AuraLens** · Built by [skedgeloop](https://github.com/skedgeloop)

*© 2026 AuraLens. All rights reserved.*  
*Dual-licensed under AGPLv3 and a Commercial License.*  
*Unauthorised rebranding or commercial use without a license is prohibited.*

[![AGPLv3](https://img.shields.io/badge/License-AGPLv3-blueviolet?style=flat-square)](./LICENSE)
[![Made with Next.js](https://img.shields.io/badge/Made%20with-Next.js-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Powered by TensorFlow.js](https://img.shields.io/badge/Powered%20by-TensorFlow.js-orange?style=flat-square&logo=tensorflow)](https://www.tensorflow.org/js)

</div>
