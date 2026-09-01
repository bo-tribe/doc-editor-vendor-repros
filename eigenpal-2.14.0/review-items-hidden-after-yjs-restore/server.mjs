import { readFile, writeFile } from 'node:fs/promises';
import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';

export const token = 'vendor-repro-token';

export function createRoomServer(port, statePath) {
  let stores = 0;
  const server = new Server({
    address: '127.0.0.1',
    port,
    quiet: true,
    debounce: 50,
    maxDebounce: 100,
    stopOnSignals: false,
    async onAuthenticate({ token: supplied }) {
      if (supplied !== token) throw new Error('invalid token');
    },
    async onLoadDocument({ document }) {
      try {
        Y.applyUpdate(document, new Uint8Array(await readFile(statePath)));
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      return document;
    },
    async onStoreDocument({ document }) {
      await writeFile(statePath, Y.encodeStateAsUpdate(document));
      stores += 1;
    },
  });
  return { server, storeCount: () => stores };
}
