import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { launchChromium } from '../../browser.mjs';

const root = import.meta.dirname;
const freePort = () => new Promise((resolve) => { const server = createServer(); server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); }); });
const port = await freePort();
const vite = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port)], { cwd: path.join(root, 'web'), stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 200; i += 1) { try { if ((await fetch(`http://127.0.0.1:${port}`)).ok) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); }
  browser = await launchChromium(chromium, { headless: true, args: ['--disable-background-networking'] });
  const page = await browser.newPage();
  const network = [];
  page.on('request', (request) => network.push(request.url()));
  await page.goto(`http://127.0.0.1:${port}`);
  await page.waitForFunction(() => Boolean(window.repro));
  const source = await readFile(path.join(root, 'fixture.docx'));
  await page.evaluate((content) => window.repro.open(content), source.toString('base64'));
  await page.evaluate(() => window.repro.replace());
  const output = Buffer.from(await page.evaluate(() => window.repro.save()), 'base64');
  await writeFile(path.join(root, 'actual.docx'), output);
  await writeFile(path.join(root, 'run-receipt.json'), `${JSON.stringify({ sourceSha256: createHash('sha256').update(source).digest('hex'), outputSha256: createHash('sha256').update(output).digest('hex'), unexpectedNonLoopback: network.filter((value) => !value.startsWith(`http://127.0.0.1:${port}`) && !value.startsWith(`ws://127.0.0.1:${port}`) && !value.startsWith('data:') && !value.startsWith('blob:')) }, null, 2)}\n`);
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
}
