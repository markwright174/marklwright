# Cloudflare Local Testing

Use `.local/cloudflare.env` for local Cloudflare credentials. The `.local/` folder is ignored by git.

Start from `docs/cloudflare-env.example` and fill in:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`

Then run:

```powershell
npm run check:cloudflare
```

The script verifies the token and, if an account ID is present, checks that the token can list Cloudflare Pages projects.

## Study Email Import

The Plaud AutoFlow email route needs a few Cloudflare resources:

- D1 database named `marklwright-study`
- Pages D1 binding named `STUDY_DB`
- Email Worker named `lily-notes-email`
- Email Routing rule: `lily-notes@marklwright.com` -> Worker `lily-notes-email`

The current Cloudflare API token must include D1 and Email Routing permissions before Codex can create and deploy all of this from the repo.

Suggested added permissions:

- `Account` -> `D1` -> `Edit`
- `Zone` -> `Email Routing Rules` -> `Edit`
- `Zone` -> `Email Routing Addresses` -> `Edit`
- `Zone` -> `Zone` -> `Read`

Keep the token scoped to the same account and only the `marklwright.com` zone.
