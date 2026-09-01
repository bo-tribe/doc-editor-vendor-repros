# Replacement revision-ID collision — Eigenpal 2.14.0

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run repro
```

Replaces one exact range while suggesting as `Test Author`, saves the DOCX, and checks whether the resulting `w:ins` and `w:del` have distinct `w:id` values.

Exit `0` means the issue reproduced. The output assigns both replacement halves `w:id="0"`.

The browser is resolved automatically; set `REPRO_CHROME_PATH` to override it.
