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
