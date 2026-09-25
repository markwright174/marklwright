# Plaud Study Import

## Replacement device pending

Lily's Plaud device was lost, and a replacement has been ordered. When the new device arrives, ask Mark for its serial through an appropriate private channel and review every transcript import path before changing the allowlist. The older direct-Plaud fallback in `functions/api/study/update-transcripts.js` still compares recordings with the lost device's hard-coded serial. Decide how to preserve access to older recordings while accepting the replacement, and keep the new serial out of tracked source if possible.

The current Plaud AutoFlow email -> Worker -> D1 path does **not** check a device serial. Verify whether the replacement's AutoFlow email contains a trustworthy device identifier, update any filtering that can actually use it, and test that a new recording reaches the study page. Also verify the email routing and Worker diagnostics secret before redeploying the Worker. Leave the current import behavior unchanged until the replacement details are available.

The Lily study page calls:

```text
/api/study/update-transcripts
```

The original direct-Plaud plan filtered recordings to Lily's recorder:

```text
8810B30300523466
```

The current preferred path is:

```text
Plaud AutoFlow email -> lily-notes@marklwright.com -> Cloudflare Email Worker -> D1 -> Study page
```

Required Cloudflare resources:

- D1 database: `marklwright-study`
- D1 binding on the Pages project: `STUDY_DB`
- D1 binding on the Email Worker: `STUDY_DB`
- Email Routing rule for `lily-notes@marklwright.com` to Worker `lily-notes-email`

The fallback direct-Plaud path still exists in the endpoint, but it should only be used if a reliable Plaud user token becomes available.

The API returns items shaped for `assets/study.js`:

```json
{
  "items": [
    {
      "sourceId": "plaud-file-id",
      "title": "Recording title",
      "recordedAt": "2026-08-06T14:00:00Z",
      "text": "Transcript text",
      "summary": "Plaud summary text"
    }
  ]
}
```
