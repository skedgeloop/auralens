import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />

          {/* SEO */}
          <title>aura — AI Photo Editor</title>
          <meta name="description" content="Upload a photo, AI detects objects, applies edits, and tells you your aura. Free, client-side, no signup." />
          <meta name="keywords" content="AI photo editor, free, browser-based, object detection, face analysis, vibes" />

          {/* Open Graph */}
          <meta property="og:title" content="aura — AI Photo Editor" />
          <meta property="og:description" content="Upload a photo, AI detects objects, applies edits, and tells you your aura." />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://auralens.pages.dev" />
          <meta property="og:image" content="https://auralens.pages.dev/og-image.png" />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="aura — AI Photo Editor" />
          <meta name="twitter:description" content="Upload a photo, AI detects objects, applies edits, and tells you your aura." />

          {/* Fonts */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
            rel="stylesheet"
          />

          {/* Favicon */}
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
