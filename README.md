# ✨ AuraLens — AI Photo Editor

> Professional dark-UI photo editor with client-side AI. 
> No uploads. No server. Everything runs in your browser.

![AuraLens Screenshot](./screenshot.png)

**[Live Demo →](auralens.pages.dev))**

---

## What it does

Upload a photo → AI detects what's in it → suggests filters 
based on content → you apply, tweak, and export. All in-browser, 
all private, zero server round-trips.

- 🤖 **AI object detection** — COCO-SSD detects 80 object classes, 
  draws glowing bounding boxes with confidence scores
- 🎨 **17 filters** — grayscale, sepia, vintage, blur, cool/warm, 
  invert + more, each with live preview thumbnails
- 💡 **Smart suggestions** — detected objects map to filter 
  recommendations automatically
- 🔒 **100% client-side** — images never leave your device
- 📤 **Export as PNG** — one click download

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 13 · React 18 |
| Styling | Tailwind CSS · glassmorphism |
| AI/ML | TensorFlow.js · COCO-SSD lite_mobilenet_v2 |
| Canvas | Pixel-level filter processing |
| Fonts | Space Grotesk · Inter |

---

## Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## How the AI works

1. Image loaded into memory as data URL
2. COCO-SSD runs inference entirely in-browser via TensorFlow.js
3. Detected classes (person, car, food etc) map to filter suggestions
4. Filters run pixel math on HTML Canvas — no libraries
5. Live thumbnails generated for every filter before you apply
6. Final image serialized to PNG for download
