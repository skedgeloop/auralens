# ✨ AuraLens — AI Photo Editor

A premium, futuristic AI-powered photo editing web app built with **Next.js**, **React**, **Tailwind CSS**, and **TensorFlow.js**. Dark glassmorphism UI, animated gradients, and fully client-side AI.

## Features

- **Upload photos** — drag & drop or browse (PNG, JPG, WEBP, GIF, up to 10MB)
- **AI object detection** — COCO-SSD model detects 80 common object classes with glowing bounding boxes + confidence scores
- **Auto edit suggestions** — the AI recommends filters based on what's in the photo
- **Live filter previews** — every filter shows a real thumbnail of your photo before you apply it
- **10 image filters** — grayscale, sepia, vintage, blur, brightness, cool/warm tones, invert & more
- **Export** — download your edited image as PNG

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (React 18) |
| Styling | Tailwind CSS + custom glassmorphism |
| AI/ML | TensorFlow.js + COCO-SSD |
| Icons | react-icons (Feather) |
| Fonts | Space Grotesk + Inter |

## Getting Started

```bash
# Install dependencies
npm install

# Run the dev server
npm run dev

# Open http://localhost:3000
```

> ⚠️ **Windows note:** the folder on disk is `C:\All Saas` (lowercase "a"). npm/webpack are case-sensitive on module paths, so always run commands with `C:\All Saas`, not `C:\All SaaS`.

## Production Build

```bash
npm run build
npm run start
```

## How It Works

1. **Upload** — the image is read into memory as a data URL
2. **Detect** — `COCO-SSD` (lite_mobilenet_v2) runs object detection in the browser via TensorFlow.js. No images leave your device.
3. **Suggest** — detected classes map to filter suggestions (e.g., people → warm/vintage tone, transport → dreamy blur)
4. **Edit** — filters run on a canvas with pixel math; live thumbnails show every filter's effect
5. **Export** — the edited image is serialized to PNG and downloaded

## Project Structure

```
├── pages/
│   ├── _app.js          # Global styles entry
│   ├── _document.js     # Fonts + HTML shell
│   └── index.js         # Main app (layout, state, AI detection, export)
├── src/
│   ├── components/
│   │   ├── UploadArea.jsx       # Animated gradient drag & drop upload
│   │   ├── FilterControls.jsx   # Filter grid with live preview thumbnails
│   │   └── EditSuggestions.jsx  # AI suggestions panel
│   ├── lib/
│   │   ├── imageFilters.js      # Canvas pixel filters + preview generator
│   │   └── filterSuggestions.js # Object → suggestion mapping
│   └── styles/globals.css       # Dark theme, glassmorphism, animations
└── package.json
```

## Portfolio Value

This project demonstrates:
- **Real-time AI in the browser** — no server round-trip for inference
- **Premium UI engineering** — dark glassmorphism, animated gradient borders, glow effects, micro-interactions
- **Interactive canvas processing** — live filter previews generated from pixel data
- **Clean architecture** — separation of detection, filtering, and suggestion logic
- **Modern stack** — Next.js 13, React 18, Tailwind, TensorFlow.js
