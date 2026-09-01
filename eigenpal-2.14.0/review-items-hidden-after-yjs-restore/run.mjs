import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createServer as createNetServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright-core';
import JSZip from 'jszip';
import { createCollaborationRoomId } from '@docx-editor.dev/pro/collaboration/hocuspocus';
import { createRoomServer } from './server.mjs';
import { launchChromium } from '../../browser.mjs';

const root = import.meta.dirname;
const freePort = () => new Promise((resolve) => {
  const server = createNetServer();
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});
const waitFor = async (label, predicate) => {
  for (let i = 0; i < 300; i += 1) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`timeout waiting for ${label}`);
};
const inspect = async (bytes) => {
  const archive = await JSZip.loadAsync(bytes);
  const xml = await archive.file('word/document.xml').async('string');
  return {
    trackedMarkerPresent: xml.includes('TOTAL LIABILITY'),
    trackedInsertions: (xml.match(/<w:ins\b/g) ?? []).length,
  };
};

const [collaborationPort, webPort] = await Promise.all([freePort(), freePort()]);
const stateDir = await mkdtemp(path.join(tmpdir(), 'eigenpal-review-restore-'));
const statePath = path.join(stateDir, 'room.ydoc');
const roomId = createCollaborationRoomId();
const vite = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(webPort)], {
  cwd: path.join(root, 'web'),
  stdio: 'ignore',
});
let browser;
let activeServer;
const startRoomServer = async () => {
  activeServer = createRoomServer(collaborationPort, statePath);
  await activeServer.server.listen();
};
const stopRoomServer = async () => {
  await activeServer?.server.destroy();
  activeServer = null;
};
const openPeer = async (actor) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const url = new URL(`http://127.0.0.1:${webPort}`);
  url.searchParams.set('server', `ws://127.0.0.1:${collaborationPort}`);
  url.searchParams.set('room', roomId);
  url.searchParams.set('actor', actor);
  await page.goto(url.toString());
  await page.waitForFunction(() => window.repro?.ready(), null, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Comments & Changes' }).click();
  return { context, page };
};

try {
  await waitFor('Vite', async () => {
    try { return (await fetch(`http://127.0.0.1:${webPort}`)).ok; } catch { return false; }
  });
  await startRoomServer();
  browser = await launchChromium(chromium, {
    headless: true,
  });

  const first = await openPeer('Reviewer A');
  const baselineStores = activeServer.storeCount();
  await first.page.evaluate(() => window.repro.replace('aggregate liability', 'TOTAL LIABILITY'));
  await first.page.waitForFunction(() => window.repro.cardCount() >= 1);
  const liveCardsBeforeRestart = await first.page.evaluate(() => window.repro.cardCount());
  await waitFor('persisted review mutation', () => activeServer.storeCount() > baselineStores);
  await first.context.close();
  await stopRoomServer();
  await copyFile(statePath, path.join(root, 'persisted-before-restart.ydoc'));

  await startRoomServer();
  const restored = await openPeer('Reviewer B');
  await restored.page.waitForTimeout(750);
  const cardsBeforeTrigger = await restored.page.evaluate(() => window.repro.cardCount());
  await restored.page.screenshot({ path: path.join(root, 'before-trigger.png'), fullPage: true });
  const beforeTrigger = Buffer.from(await restored.page.evaluate(() => window.repro.save()), 'base64');
  const restoredDocument = await inspect(beforeTrigger);
  await writeFile(path.join(root, 'restored-before-trigger.docx'), beforeTrigger);

  await restored.page.evaluate(() => window.repro.replace('fraud or fraudulent misrepresentation', 'FRAUD'));
  await restored.page.waitForFunction(() => window.repro.cardCount() >= 2);
  const cardsAfterTrigger = await restored.page.evaluate(() => window.repro.cardCount());
  const summariesAfterTrigger = await restored.page.evaluate(() => window.repro.summaries());
  await restored.page.screenshot({ path: path.join(root, 'after-trigger.png'), fullPage: true });
  const afterTrigger = Buffer.from(await restored.page.evaluate(() => window.repro.save()), 'base64');
  await writeFile(path.join(root, 'restored-after-trigger.docx'), afterTrigger);

  const defectReproduced = liveCardsBeforeRestart >= 1
    && restoredDocument.trackedMarkerPresent
    && restoredDocument.trackedInsertions >= 1
    && cardsBeforeTrigger === 0
    && cardsAfterTrigger >= 2;
  const result = {
    expected: 'Persisted review items render when a fresh peer joins a restored Yjs room.',
    actual: defectReproduced
      ? 'The restored tracked change is present in DOCX but the review rail stays empty until another review mutation.'
      : 'The issue did not reproduce with this output shape.',
    observed: {
      liveCardsBeforeRestart,
      ...restoredDocument,
      cardsBeforeTrigger,
      cardsAfterTrigger,
      summariesAfterTrigger,
    },
    defectReproduced,
  };
  await writeFile(path.join(root, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = defectReproduced ? 0 : 1;
  await restored.context.close();
} finally {
  await browser?.close();
  await stopRoomServer();
  vite.kill('SIGTERM');
  await rm(stateDir, { recursive: true, force: true });
}
