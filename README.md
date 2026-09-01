# Eigenpal 2.14.0 issue reproductions

Six standalone reproductions for `@docx-editor.dev/*` 2.14.0. Each directory contains exact package locks, runnable source, generated evidence, and a ZIP archive.

## Issues

| Reproduction | Result |
|---|---|
| [`replacement-revision-id-collision`](eigenpal-2.14.0/replacement-revision-id-collision/README.md) | Replacement `w:ins` and `w:del` share `w:id="0"` |
| [`suggesting-without-author`](eigenpal-2.14.0/suggesting-without-author/README.md) | Authorless typing is silently ignored |
| [`large-document-invalid-argument`](eigenpal-2.14.0/large-document-invalid-argument/README.md) | A valid 1.6 MB, 101,322-paragraph DOCX is rejected as `InvalidArgument` |
| [`field-result-not-searchable`](eigenpal-2.14.0/field-result-not-searchable/README.md) | Visible field text is absent from `Body.search` |
| [`author-prop-update`](eigenpal-2.14.0/author-prop-update/README.md) | Updating the React author prop does not update attribution |
| [`review-items-hidden-after-yjs-restore`](eigenpal-2.14.0/review-items-hidden-after-yjs-restore/README.md) | Restored Yjs review items remain hidden until another review mutation |

Machine-readable results: [`eigenpal-2.14.0/results.json`](eigenpal-2.14.0/results.json).

## Run a reproduction

```bash
cd eigenpal-2.14.0/<reproduction>
npm ci --ignore-scripts --no-audit --no-fund
npm run repro
```

Node `>=22.12.0` is required. Exit `0` means the issue reproduced.

Browsers resolve in this order: `REPRO_CHROME_PATH`, Google Chrome at the operating system's default location, then Playwright's bundled Chromium. Each run prints the selected browser and version.

ZIPs under `eigenpal-2.14.0/packages/` extract as `browser.mjs` plus `eigenpal-2.14.0/<reproduction>/`, preserving the shared browser launcher's relative import.
