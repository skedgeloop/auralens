<div align="center">

# ✨ aura

### your photos, but make it iconic.

**[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-a?style=for-the-badge&color=ff2d6f)](https://auralens.pages.dev)**
**[![GitHub](https://img.shields.io/badge/GITHUB-grey?style=for-the-badge&logo=github)](https://github.com/skedgeloop/auralens)**

<br>

> Upload a photo → AI detects objects → suggests edits → tells you your aura.
> All in your browser. No signup. No tracking. Just vibes.

</div>

---

## 🎯 What It Does

```
yo, drop a photo
       ↓
   AI analyzes it
       ↓
  tells you your aura
       ↓
  you apply edits
       ↓
   export & flex
```

<br>

## ✨ Aura Tags — What They Mean

The AI reads your photo and picks the vibe that fits.

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

## 🤖 How The AI Works

### Three-Tier Fallback Chain

```
Upload photo
    ↓
┌─────────────────────────┐
│  🟢 Tier 1: CLOUD AI    │  ← Cloudflare Worker → Hugging Face
│     Best accuracy        │
└─────────────────────────┘
    ↓ if fails
┌─────────────────────────┐
│  🟡 Tier 2: BROWSER AI  │  ← TensorFlow.js in your browser
│     Good accuracy        │
└─────────────────────────┘
    ↓ if fails
┌─────────────────────────┐
│  ⚪ Tier 3: PIXEL MATH  │  ← Histogram + color analysis
│     Always works         │
└─────────────────────────┘
    ↓
Show results ✨
```

### AI Tier Indicator

When you upload a photo, you'll see a colored dot showing which AI tier is active:

| Dot | Tier | What It Means |
|-----|------|---------------|
| 🟢 **Green** | Cloud AI | Running on Cloudflare's GPU network. Best results. |
| 🟡 **Amber** | Browser AI | Models loaded in your browser. Good results. |
| ⚪ **Gray** | Pixel Analysis | No AI models available. Basic color/histogram analysis. |

### The Three AI Models

| Model | What It Does | Runs On |
|-------|-------------|---------|
| **Face Detection** | Finds faces, reads emotions | Cloud / Browser |
| **CLIP Vibe** | Classifies photo against 21 vibe labels | Cloud / Browser |
| **COCO-SSD** | Detects 80+ object classes | Browser |

---

## 🎨 Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Analysis** | 3 models analyze your photo automatically |
| 🎭 **Face Emotions** | Happiness, sadness, anger, surprise, sassiness |
| ✨ **Aura Classification** | 21 vibe tags with confidence scores |
| 🎨 **17 Filters** | Grayscale, sepia, vintage, cinematic, noir + more |
| 📊 **Filter Previews** | Live thumbnails for every filter before you apply |
| 🔄 **Comparison Slider** | Drag to compare original vs edited |
| 📤 **Export** | PNG, JPEG, WebP with quality control |
| ⌨️ **Keyboard Shortcuts** | Ctrl+Z undo, Ctrl+S export, Space compare |
| 🌙 **Dark Theme** | Pink + black, sassy copy, no AI slop |

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND                        │
│  Next.js 13 · React 18 · Tailwind CSS           │
│  Space Grotesk · Inter fonts                     │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                  AI LAYER                        │
│  ┌─────────────────────────────────────────┐    │
│  │  Cloud: Cloudflare Worker → Hugging Face │    │
│  │  Browser: TensorFlow.js · face-api       │    │
│  │  Fallback: Pixel histogram analysis      │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                  HOSTING                         │
│  Cloudflare Pages (static)                       │
│  Cloudflare Workers (AI backend)                 │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Run Locally

```bash
# Clone
git clone https://github.com/skedgeloop/auralens.git
cd auralens

# Install
npm install

# Dev
npm run dev
# → http://localhost:3000
```

### Deploy

```bash
# Build
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy out --project-name auralens
```

---

## 📁 Project Structure

```
auralens/
├── pages/
│   ├── _app.js              # Global styles
│   ├── _document.js         # SEO + fonts
│   └── index.js             # Main app (state + logic)
├── src/
│   ├── components/
│   │   ├── AIPanel.jsx      # AI analysis display
│   │   ├── Toolbar.jsx      # Top toolbar
│   │   ├── FilterControls.jsx
│   │   ├── AdjustmentPanel.jsx
│   │   ├── ComparisonSlider.jsx
│   │   ├── ExportDialog.jsx
│   │   └── Toast.jsx
│   ├── lib/
│   │   ├── tripleAi.js      # 3-tier AI fallback
│   │   ├── aiEngine.js      # Image analysis
│   │   ├── imageFilters.js  # 17 filters
│   │   └── realAi.js        # Background blur
│   └── styles/
│       └── globals.css      # Pink + black theme
├── worker/
│   └── worker.js            # Cloudflare AI Worker
└── package.json
```

---

## 🔒 Privacy & Limits

| Concern | Answer |
|---------|--------|
| **Do images leave my browser?** | Only if cloud AI is used (sent to Worker, not stored) |
| **Is it free?** | Yes. Cloud tier: 100K req/day. Browser tier: unlimited. |
| **Cross-user data mixing?** | No. Each request is independent. No shared state. |
| **Rate limits?** | 30 requests/minute per IP on the Worker |
| **NSFW content?** | All vibe tags are tasteful. No explicit labels. |

---

## 📄 License

MIT — do whatever you want with it.

---

<div align="center">

**Built with 💗 by [SKEdgeloop](https://github.com/skedgeloop)**

*no servers · no accounts · your photos stay on your device*

</div>
