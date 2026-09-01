import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright-core';
import JSZip from 'jszip';
import { launchChromium } from '../../browser.mjs';

const root = import.meta.dirname;
const freePort = () => new Promise((resolve) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});
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
  browser = await launchChromium(chromium, { headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => Boolean(window.repro));
  const source = await readFile(path.join(root, 'fixture.docx'));
  await page.evaluate((content) => window.repro.open(content), source.toString('base64'));
  await page.evaluate(() => window.repro.replace('aggregate liability', 'total liability'));
  await page.evaluate(() => window.repro.changeAuthor('Updated Author'));
  await page.evaluate(() => window.repro.replace('fraud or fraudulent misrepresentation', 'fraud'));
  const output = Buffer.from(await page.evaluate(() => window.repro.save()), 'base64');
  await writeFile(path.join(root, 'actual.docx'), output);
  const archive = await JSZip.loadAsync(output);
  const xml = await archive.file('word/document.xml').async('string');
  const revisions = [...xml.matchAll(/<w:(ins|del)\b([^>]*)>([\s\S]*?)<\/w:\1>/g)].map((match) => ({
    kind: match[1],
    author: /w:author="([^"]*)"/.exec(match[2])?.[1],
    text: [...match[3].matchAll(/<w:(?:t|delText)\b[^>]*>([\s\S]*?)<\/w:(?:t|delText)>/g)].map((item) => item[1]).join(''),
  })).filter((item) => ['Initial Author', 'Updated Author'].includes(item.author));
  const updatedAuthorApplied = revisions.some((item) => item.author === 'Updated Author' && item.text === 'fraud');
  const defectReproduced = !updatedAuthorApplied && revisions.some((item) => item.author === 'Initial Author' && item.text === 'fraud');
  const result = {
    expected: 'Updating the React author prop changes attribution without remounting the document.',
    actual: defectReproduced ? 'The second replacement retained the mount-time author.' : 'The second replacement used the updated author.',
    observed: { revisions },
    defectReproduced,
  };
  await writeFile(path.join(root, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = defectReproduced ? 0 : 1;
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
}
