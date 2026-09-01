import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright-core';
import JSZip from 'jszip';
import { launchChromium } from '../../browser.mjs';

const root = import.meta.dirname;
const marker = ' AUTHOR_PROBE';
const freePort = () => new Promise((resolve) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});
const containsMarker = async (bytes) => {
  const archive = await JSZip.loadAsync(bytes);
  return (await archive.file('word/document.xml').async('string')).includes(marker);
};
const typeAndSave = async (page, source, author) => {
  await page.evaluate(({ content, author }) => window.repro.open(content, author), {
    content: source.toString('base64'),
    author,
  });
  const editor = page.locator('[contenteditable=true]').first();
  await editor.click();
  await page.keyboard.press('End');
  await page.keyboard.type(marker);
  await page.waitForTimeout(200);
  const output = Buffer.from(await page.evaluate(() => window.repro.save()), 'base64');
  return { output, changed: await containsMarker(output) };
};

const port = await freePort();
const vite = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port)], {
  cwd: path.join(root, 'web'),
  stdio: 'ignore',
});
let browser;
try {
  for (let i = 0; i < 200; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await launchChromium(chromium, {
    headless: true,
    args: ['--disable-background-networking'],
  });
  const page = await browser.newPage();
  const messages = [];
  page.on('console', (message) => messages.push({ type: message.type(), text: message.text() }));
  page.on('pageerror', (error) => messages.push({ type: 'pageerror', text: error.message }));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => Boolean(window.repro));
  const source = await readFile(path.join(root, 'fixture.docx'));
  const withoutAuthor = await typeAndSave(page, source, undefined);
  const withAuthor = await typeAndSave(page, source, 'Test Author');
  await writeFile(path.join(root, 'without-author.docx'), withoutAuthor.output);
  await writeFile(path.join(root, 'with-author.docx'), withAuthor.output);
  const defectReproduced = !withoutAuthor.changed && withAuthor.changed;
  const result = {
    expected: 'Suggesting mode either accepts typing without an author or reports a clear configuration error.',
    actual: defectReproduced ? 'Typing is silently ignored without author while the authored control succeeds.' : 'See observed outcomes.',
    observed: { withoutAuthorChanged: withoutAuthor.changed, withAuthorChanged: withAuthor.changed, messages },
    defectReproduced,
  };
  await writeFile(path.join(root, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = defectReproduced ? 0 : 1;
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
}
