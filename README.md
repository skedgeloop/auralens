# ✨ aura

> **your photos, but make it iconic.**
> 
> Upload a photo → AI detects objects → suggests edits → tells you your aura.
> All in your browser. No signup. No tracking. Just vibes.

**[Live Demo →](https://auralens.pages.dev)**

---

## What it does

Drop a photo. AI instantly analyzes it — detects objects, reads emotions,
classifies your vibe — and hands you the wheel. Or just let it cook.

- 🤖 **3 AI models** — server-side + browser fallback + pixel analysis
- 🎭 **Face analysis** — happiness, sadness, anger, surprise, sassiness
- ✨ **Aura classification** — tells you your photo's vibe
- 🎨 **17 filters** — with live previews and categories
- 📤 **Export** — PNG, JPEG, WebP with quality control

---

## ✨ Aura Tags — What They Mean

The AI reads your photo and picks the vibe that fits. Here's what each tag means:

| Tag | Meaning |
|-----|---------|
| **handsome** | Strong, well-defined features. Good bone structure. |
| **gorgeous** | Striking beauty. Draws the eye immediately. |
| **cute** | Soft, approachable, warm energy. |
| **stunning** | Wow factor. Hard to look away. |
| **beautiful** | Balanced, pleasing composition. |
| **alpha energy** | Confident, dominant presence. |
| **main character** | Center of attention energy. |
| **hot** | Attractive, magnetic pull. |
| **aesthetic** | Visually pleasing, artistic feel. |
| **iconic** | Memorable, stands out. |
| **legendary** | Timeless, unforgettable. |
| **dark vibes** | Moody, intense, mysterious mood. |
| **soft vibes** | Gentle, calm, peaceful energy. |
| **chaotic energy** | Wild, unpredictable, exciting. |
| **elegant** | Refined, sophisticated, polished. |
| **classy** | Timeless style, good taste. |
| **boss energy** | In-charge, powerful presence. |
| **dreamy** | Ethereal, otherworldly feel. |
| **ethereal** | Heavenly, almost too beautiful for this world. |
| **playful** | Fun, lighthearted, youthful. |
| **mysterious** | Intriguing, hard to read, compelling. |

---

## How it works

### Three-tier AI (fallback chain)

```
Upload photo
    ↓
Tier 1: Cloud AI (Cloudflare Worker → Hugging Face)
    ↓ if fails
Tier 2: Browser AI (TensorFlow.js)
    ↓ if fails  
Tier 3: Pixel math (histogram + colors)
    ↓ always works
Show results
```

| Tier | Where it runs | Speed | Accuracy |
|------|--------------|-------|----------|
| **Cloud** | Cloudflare Workers | ~2-3s | Best |
| **Browser** | Your device | ~3-5s | Good |
| **Pixel** | Instant | <1s | Basic |

### The three AI models

1. **Face detection + emotion** — finds faces, reads expressions
2. **CLIP vibe classification** — matches your photo against 21 vibe labels
3. **Object detection** — COCO-SSD finds 80+ object classes

### No cross-user issues

Each request is independent. No shared state. No images stored.
Rate limited to 30 requests/minute per IP.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 13 · React 18 · Tailwind CSS |
| AI (server) | Cloudflare Workers · Hugging Face API |
| AI (browser) | TensorFlow.js · COCO-SSD · face-api |
| Fonts | Space Grotesk · Inter |
| Hosting | Cloudflare Pages · Workers |

---

## Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

To deploy:
```bash
npm run build
npx wrangler pages deploy out --project-name auralens
```

---

## Project structure

```
├── pages/
│   ├── _app.js              # Global styles
│   ├── _document.js         # SEO + fonts
│   └── index.js             # Main app (state + logic)
├── src/
│   ├── components/          # React components
│   │   ├── AIPanel.jsx      # AI analysis display
│   │   ├── FilterControls.jsx
│   │   ├── Toolbar.jsx
│   │   └── ...
│   ├── lib/
│   │   ├── tripleAi.js      # 3-tier AI fallback
│   │   ├── aiEngine.js      # Image analysis
│   │   ├── imageFilters.js  # 17 filters
│   │   └── realAi.js        # Background blur, smart enhance
│   └── styles/globals.css   # Pink + black theme
└── worker/
    └── worker.js            # Cloudflare AI Worker
```

---

## License

MIT — do whatever you want with it.
