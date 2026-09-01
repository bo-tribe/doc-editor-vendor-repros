# Visible field result missing from Body.search — Eigenpal 2.14.0

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run repro
```

Verifies that `1 January 2030` is physically present after the OOXML field separator, opens the DOCX through the public server runtime, and searches the main body for that exact visible result.

Exit `0` means the issue reproduced. Eigenpal 2.14.0 returns zero matches.
