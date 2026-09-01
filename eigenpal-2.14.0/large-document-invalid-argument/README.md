# Valid large DOCX rejected as InvalidArgument — Eigenpal 2.14.0

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run repro
```

Calls `DocxEditor.createServer(bytes)` once with a valid 1,578,590-byte, 101,322-paragraph fixture. Its text, metadata, and media are synthetic.

Exit `0` means the issue reproduced. The call fails with `InvalidArgument: the argument is not one this API accepts`, without identifying a document/resource limit.
