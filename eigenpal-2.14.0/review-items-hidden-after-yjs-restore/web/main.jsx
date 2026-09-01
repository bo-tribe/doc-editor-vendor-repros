import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { reviewModule } from '@docx-editor.dev/pro';
import {
  DocxEditorCollaborationRoot,
  DocxEditorReview,
  useCollaborationStatus,
} from '@docx-editor.dev/pro/react';
import { useHocuspocusCollaboration } from '@docx-editor.dev/pro/react/hocuspocus';
import { DocxEditor } from '@docx-editor.dev/react';
import { DocxEditor as Automation } from '@docx-editor.dev/editor-api/browser';
import '@docx-editor.dev/core/styles/editor.css';

const params = new URL(location.href).searchParams;
const server = params.get('server');
const roomId = params.get('room');
const actorId = params.get('actor');
if (!server || !roomId || !actorId) throw new Error('missing query parameter');

const modules = [reviewModule()];
const runtime = { editor: null, automation: null, live: false };
const encode = (value) => {
  const bytes = new Uint8Array(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
};

window.repro = {
  ready: () => Boolean(runtime.editor && runtime.automation && runtime.live),
  cardCount: () => document.querySelectorAll('[data-testid="review-card"]').length,
  summaries: () => [...document.querySelectorAll('[data-testid="review-summary"]')].map((item) => item.textContent),
  async replace(quote, replacement) {
    await runtime.automation.run(async (context) => {
      const matches = context.document.body.search(quote, { matchCase: true });
      matches.load();
      await context.sync();
      if (matches.items.length !== 1) throw new Error(`cardinality ${matches.items.length}`);
      matches.items[0].insertText(replacement, 'Replace');
      await context.sync();
    });
  },
  async save() {
    return encode(await runtime.editor.save());
  },
};

function App() {
  const [bytes, setBytes] = useState(null);
  useEffect(() => {
    fetch('/fixture.docx')
      .then((response) => response.arrayBuffer())
      .then((value) => setBytes(new Uint8Array(value)));
  }, []);
  const room = useMemo(() => bytes ? {
    url: server,
    roomId,
    token: 'vendor-repro-token',
    syncedTimeoutMs: 10_000,
    identity: { actorId, name: actorId },
    bootstrap: { kind: 'create-or-join', document: bytes },
  } : null, [bytes]);
  const collaboration = useHocuspocusCollaboration({ modules, room });
  const status = useCollaborationStatus(collaboration.session);
  runtime.live = status.live;

  return React.createElement(
    DocxEditorCollaborationRoot,
    {
      collaboration,
      mode: 'edit',
      onReady(editor) {
        runtime.editor = editor;
        runtime.automation = Automation.createBrowser(editor);
        editor.setEditingMode('suggesting');
      },
      fallback: React.createElement('span', null, 'connecting'),
    },
    React.createElement(
      'div',
      { style: { height: '720px', display: 'flex', flexDirection: 'column' } },
      React.createElement(DocxEditor.Toolbar),
      React.createElement(
        DocxEditor.Viewport,
        { style: { flex: 1 } },
        React.createElement(DocxEditor.Content),
        React.createElement(DocxEditorReview),
      ),
    ),
  );
}

createRoot(document.getElementById('root')).render(React.createElement(App));
