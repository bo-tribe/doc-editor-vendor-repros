import { readFile, writeFile } from 'node:fs/promises';
import { DocxEditor } from '@docx-editor.dev/editor-api';
import JSZip from 'jszip';

const quote = '1 January 2030';
const source = await readFile(new URL('fixture.docx', import.meta.url));
const archive = await JSZip.loadAsync(source);
const documentXml = await archive.file('word/document.xml').async('string');
const physicallyPresent = documentXml.includes(quote) && documentXml.includes('fldCharType="separate"');
const runtime = await DocxEditor.createServer(source);
let searchMatches;
try {
  searchMatches = await runtime.run(async (context) => {
    const matches = context.document.body.search(quote, { matchCase: true });
    matches.load();
    await context.sync();
    return matches.items.length;
  });
} finally {
  runtime.dispose?.();
}
const defectReproduced = physicallyPresent && searchMatches === 0;
const result = {
  expected: 'Body.search finds the visible field result after the field separator.',
  actual: `${searchMatches} public search matches.`,
  observed: { quote, physicallyPresent, searchMatches },
  defectReproduced,
};
await writeFile(new URL('result.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
process.exitCode = defectReproduced ? 0 : 1;
