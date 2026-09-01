# React author prop remains mount-time state — Eigenpal 2.14.0

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run repro
```

Mounts once as `Initial Author`, creates a tracked replacement, rerenders the same `DocxEditor.Root` with `author="Updated Author"`, creates a second replacement, then inspects revision authors.

Exit `0` means the issue reproduced. Both replacements are attributed to `Initial Author`; changing author requires a document remount.

The browser is resolved automatically; set `REPRO_CHROME_PATH` to override it.
