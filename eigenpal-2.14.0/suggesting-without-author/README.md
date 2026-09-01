# Suggesting silently ignores typing without author — Eigenpal 2.14.0

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run repro
```

Runs the same keyboard edit twice: first without `author`, then with `author="Test Author"`. It captures console/page errors and inspects both saved DOCX files.

Exit `0` means the issue reproduced. The authorless edit is ignored, the authored control succeeds, and no diagnostic explains the refusal.

The browser is resolved automatically; set `REPRO_CHROME_PATH` to override it.
