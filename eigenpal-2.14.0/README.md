# Eigenpal 2.14.0 reproduction results

Every installed `@docx-editor.dev/*` package is pinned to exactly `2.14.0`.

| Reproduction | Observed result |
|---|---|
| Replacement revision-ID collision | **Reproduced** — replacement `w:ins` and `w:del` both use `w:id="0"` |
| Suggesting without an author | **Reproduced** — authorless typing is silently ignored while the authored control succeeds |
| Large document rejected as `InvalidArgument` | **Reproduced** — a valid 1,578,590-byte, 101,322-paragraph DOCX is rejected |
| Visible field result missing from `Body.search` | **Reproduced** — visible field text is present but public search returns zero matches |
| React author prop remains mount-time state | **Reproduced** — revisions remain attributed to `Initial Author` after rerendering with `Updated Author` |
| Restored collaboration review items do not hydrate | **Reproduced 3/3** — restored revisions are in the saved DOCX, but the review rail stays empty until another review mutation |

## Run

```bash
cd <reproduction>
npm ci --ignore-scripts --no-audit --no-fund
npm run repro
```

Exit `0` means the issue reproduced. Machine-readable results: [`results.json`](results.json).

Runtime: Eigenpal 2.14.0, Hocuspocus 4.6.0, Yjs 13.6.32, Node 24.18.0, npm 11.16.0, Chrome 152.0.7977.65, macOS 26.6.2 arm64.
