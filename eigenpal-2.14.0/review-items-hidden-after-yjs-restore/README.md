# Review items hidden after persisted Yjs room restore — Eigenpal 2.14.0

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run repro
```

## Expected

A fresh peer joining a restored collaboration room immediately sees persisted tracked changes in `DocxEditorReview`.

## Actual

The tracked replacement is synchronized and present as `w:ins`/`w:del` in a fresh peer's saved DOCX, but the review rail renders zero cards. Creating one new tracked replacement makes both the restored and new review cards appear.

[`before-trigger.png`](before-trigger.png) shows restored tracked markup with an empty review rail. [`after-trigger.png`](after-trigger.png) shows all four cards after `Reviewer B` makes an unrelated review mutation.

The runner:

1. Creates a Hocuspocus room from `web/fixture.docx`.
2. Creates a tracked replacement and verifies its live review cards.
3. Persists `Y.encodeStateAsUpdate(document)`.
4. Destroys and recreates Hocuspocus from that update.
5. Joins with a fresh browser context and saves before any new mutation.
6. Confirms the restored DOCX contains the tracked marker and `w:ins`, while the review card count is zero.
7. Creates another tracked replacement and confirms all cards appear.

Exit `0` means the issue reproduced. Generated evidence is written to `result.json`, `restored-before-trigger.docx`, `restored-after-trigger.docx`, `persisted-before-restart.ydoc`, `before-trigger.png`, and `after-trigger.png`.

Exact graph: Eigenpal 2.14.0, Hocuspocus 4.6.0, Yjs 13.6.32.

The browser is resolved automatically; set `REPRO_CHROME_PATH` to override it.
