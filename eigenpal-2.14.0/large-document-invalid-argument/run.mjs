import { performance } from 'node:perf_hooks';
import { readFile, writeFile } from 'node:fs/promises';
import { DocxEditor } from '@docx-editor.dev/editor-api';

const source = await readFile(new URL('fixture.docx', import.meta.url));
const startedAt = performance.now();
let runtime;
let error = null;
try {
  runtime = await DocxEditor.createServer(source);
} catch (caught) {
  error = { name: caught?.name, code: caught?.code, message: caught?.message };
} finally {
  runtime?.dispose?.();
}
const defectReproduced = error?.code === 'InvalidArgument' && error?.message?.includes('argument is not one this API accepts');
const result = {
  expected: 'A valid large DOCX opens, or a typed resource-limit error identifies the exceeded limit.',
  actual: error ?? 'Document opened successfully.',
  observed: { sourceBytes: source.length, paragraphs: 101322, elapsedMs: Number((performance.now() - startedAt).toFixed(1)) },
  defectReproduced,
};
await writeFile(new URL('result.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exitCode = defectReproduced ? 0 : 1;
