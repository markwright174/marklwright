# marklwright

Personal web home for Mark L. Wright.

This repository is intended to grow into a unified web workspace for:

- a personal portfolio and experience site
- portfolio case studies and selected work samples
- a migrated archive of older blog writing
- education transcript/notes tools and sites
- possibly a future web-accessible version of the self-hosted dashboard

## Current shape

The first draft is a plain static site with no build dependencies. This keeps the
initial Cloudflare Pages setup simple while the content strategy is still forming.

Suggested Cloudflare Pages settings:

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `/`
- Production branch: `main`

Later, this can move to Astro, Next.js static export, or another content-oriented
framework if the blog/archive/transcript features need it.

## Local preview

Open `index.html` directly, or run a simple static server from this folder:

```powershell
python -m http.server 8788
```

Then open `http://localhost:8788`.

## Validation

```powershell
node scripts/check-site.mjs
```
