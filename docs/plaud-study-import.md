# Plaud Study Import

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
