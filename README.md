# marklwright

Personal portfolio and family study site, published through Cloudflare Pages from `markwright174/marklwright`.

The portfolio is public. `/study/` and `/api/study/*` run through Pages Functions middleware. Family members enter the shared password once and receive a signed, Secure, HttpOnly cookie for 30 days. The password is held in the Pages Production secret `STUDY_ACCESS_PASSWORD`; a separate random `STUDY_SESSION_SECRET` signs cookies. Neither belongs in Git or a client asset. The login page and all study responses send `noindex, nofollow` and avoid caching. This is a convenient family gate, so rotate the shared password before using it for sensitive material, especially because an older version was in Git history.

## Cloudflare configuration

- Pages project: `marklwright`, Production branch: `main`, build command: `npm run build:cloudflare`, output directory: `dist`.
- Pages Production secrets: `STUDY_ACCESS_PASSWORD` (family password) and `STUDY_SESSION_SECRET` (independent long random value). Set secrets for Preview as well before using previews with private content.
- Pages bindings: D1 database `STUDY_DB` and Workers AI `AI`, as declared in `wrangler.jsonc`.
- Pages runtime: **Fail closed**. If the free Pages Functions allowance is exhausted, static study files must not bypass middleware.
- The separate `lily-notes-email` Worker uses `STUDY_ACCESS_PASSWORD` for its diagnostics endpoint. Its Wrangler config no longer stores the password; add it as an encrypted Worker secret before redeploying that Worker. Email ingestion does not use the diagnostics password.
- The AI helper reserves at most 25 requests per UTC day in D1 before calling Workers AI. If D1 is unavailable, the helper returns an error rather than using AI without a limit. Free plan platform quotas can still stop service earlier.

Cloudflare's Workers Free plan, Pages Functions free allowance, D1 free allocation, and Workers AI free allocation are used here. Check the account plan and current platform limits before changing bindings or enabling paid usage.

## Local checks

Run from this directory:

```powershell
npm test
npm run check
npm run build:cloudflare
```

The tests cover the login gate and AI request limit. A basic static preview can use `python -m http.server 8788`, but it does not run Pages Functions and therefore cannot verify authentication. Verify the deployed gate through the Cloudflare Pages URL after publication.

The source of record is `Projects/marklwright/` in the parent `codingDesign` repository. Commit there, then use `scripts/publish-portfolio.ps1 -Push` from the parent repository to update the publication repository and trigger Cloudflare Pages.
