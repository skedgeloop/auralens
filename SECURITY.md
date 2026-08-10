# Security Policy — Aura

## Supported versions

| Version | Supported |
|---------|-----------|
| main (latest) | ✅ |
| Older releases | ❌ |

## Reporting a vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Email **skedgeloop@proton.me** with:

- A description of the vulnerability.
- Steps to reproduce (or a minimal PoC).
- Impact assessment (if known).

You will receive a response within **7 days**. We ask that you allow time for
a fix before public disclosure.

## Provenance

All copies of this software carry the embedded provenance marker
`AURA-ORIGIN:skedgeloop@proton.me`. If you suspect a copy is not from the
original author or repository, contact **skedgeloop@proton.me** to verify.

## Security model

- Images are processed **entirely in the browser** — they are never uploaded
  to a server.
- No accounts, no tracking, no analytics.
- Cloud AI features run through a Pages Function with rate limiting and a KV
  cache; no image bytes are stored long-term.
- The provenance watermark is embedded in the build output.

© 2026 SKEdgeloop
