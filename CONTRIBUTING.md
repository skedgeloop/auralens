# Contributing to Aura

Thanks for wanting to help! Aura is an open, private, browser-based AI photo
editor. Here's how to contribute well.

## License note

By contributing, you agree that your contributions are licensed under the
project's **dual license** (AGPL-3.0 + Commercial) and that they retain the
provenance marker `AURA-ORIGIN:skedgeloop@proton.me`. See
[LICENSE](./LICENSE) and [COMMERCIAL.md](./COMMERCIAL.md) for details.

## Getting started

```bash
git clone https://github.com/skedgeloop/auralens.git
cd auralens
npm install
npm run dev   # → http://localhost:3000
```

## Reporting bugs

- Check existing issues first — someone may have already reported it.
- Include: browser + version, OS, the steps to reproduce, and what you
  expected vs. what happened.
- A screenshot or short repro description is ideal.

## Suggesting features

- Describe the **use case**, not just the UI: what problem are you solving?
  Aura runs fully in the browser, so consider privacy and performance
  implications of any suggestion.
- Small, focused suggestions are easiest to evaluate.

## Submitting pull requests

1. **Fork** the repo and create a branch (`feature/...` or `fix/...`).
2. **Keep changes small** and focused on one feature or fix.
3. **Follow the existing code style:**
   - Image processing is **pure Canvas 2D** — pixel loops over
     `ImageData`, no DOM work inside the processing helpers.
   - **Zero-new-deps principle:** prefer a few lines of vanilla code over a
     new dependency. Only add a dependency if there is no reasonable way to
     do without it, and discuss it in the PR.
   - Follow the existing patterns in `src/lib` (pure processing/utility
     modules with self-checks) and `src/components` (panel components that
     wire a `src/lib` helper to the editor UI).
4. **Add a self-check** for new pure logic (see the existing
   `*.selfcheck.js` / `*.test.mjs` files).
5. **Verify the build:** `npm run build` (which also inlines CSS and stamps
   provenance).
6. **Open a PR** describing what you changed and why.

## Provenance

All source files carry an **`AURA-ORIGIN:skedgeloop@proton.me`** marker,
embedded through `src/lib/provenance.mjs` and stamped into the build output.
Keep the provenance marker in files you touch — it is a license requirement,
not decoration.

## Commit messages

Use clear, imperative commits (e.g. "Add color palette extractor").

## Security

Found a vulnerability? **Do not open a public issue.** Email
**skedgeloop@proton.me** instead. See [SECURITY.md](./SECURITY.md).

## Contact

Questions about licensing or contributing? Email
**skedgeloop@proton.me**.

## Code of conduct

Be kind, constructive, and assume good faith. We're building something fun
together.

© 2026 SKEdgeloop
