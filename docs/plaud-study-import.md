# Plaud Study Import

The Lily study page calls:

```text
/api/study/update-transcripts
```

The Cloudflare Pages Function filters Plaud recordings to Lily's recorder:

```text
8810B30300523466
```

Required Cloudflare environment variable:

- `PLAUD_USER_TOKEN`

Optional Cloudflare environment variables:

- `PLAUD_WORKSPACE_ID`
- `PLAUD_API_BASE`

The token should be the long-lived Plaud user token, not the short-lived workspace token. If the value starts working and then fails about a day later, it was probably the workspace token.

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
