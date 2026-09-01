import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DocxEditor } from '@docx-editor.dev/react';
import { reviewModule } from '@docx-editor.dev/pro/react';
import { DocxEditor as Automation } from '@docx-editor.dev/editor-api/browser';
import '@docx-editor.dev/core/styles/editor.css';

const modules = [reviewModule()];
const runtime = { setDocument: null, editor: null, automation: null };
const wait = async (predicate) => { for (let i = 0; i < 600; i += 1) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error('editor timeout'); };
const decode = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
const encode = (value) => { const bytes = new Uint8Array(value); let binary = ''; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(binary); };

function App() {
  const [document, setDocument] = useState(null);
  runtime.setDocument = setDocument;
  if (!document) return React.createElement('span', null, 'waiting');
  return React.createElement(DocxEditor.Root, {
    key: document,
    document,
    modules,
    author: 'Test Author',
    onReady: (editor) => { runtime.editor = editor; runtime.automation = Automation.createBrowser(editor); },
  }, React.createElement(DocxEditor.Viewport, { style: { height: '700px' } }, React.createElement(DocxEditor.Content)));
}
createRoot(document.getElementById('root')).render(React.createElement(App));
await wait(() => runtime.setDocument);

async function open(contentBase64) {
  runtime.editor = null;
  runtime.automation?.dispose();
  runtime.automation = null;
  runtime.setDocument(decode(contentBase64));
  await wait(() => runtime.editor && runtime.automation);
  runtime.editor.setEditingMode('suggesting');
}
async function exact(quote) {
  return runtime.automation.run(async (context) => {
    const matches = context.document.body.search(quote, { matchCase: true });
    matches.load();
    await context.sync();
    if (matches.items.length !== 1) throw new Error(`cardinality ${matches.items.length}`);
    return matches.items[0];
  });
}
async function format() {
  await runtime.automation.run(async (context) => {
    const run = context.document.body.search('aggregate liability', { matchCase: true });
    const heading = context.document.body.search('Clause 9 — Limitation of Liability', { matchCase: true });
    run.load(); heading.load(); await context.sync();
    if (run.items.length !== 1 || heading.items.length !== 1) throw new Error('unexpected cardinality');
    run.items[0].font.bold = true;
    const paragraphs = heading.items[0].paragraphs;
    paragraphs.load(); await context.sync();
    paragraphs.items[0].alignment = 'Centered';
    await context.sync();
  });
}
async function replace() {
  await runtime.automation.run(async (context) => {
    const matches = context.document.body.search('Receiving Party', { matchCase: true });
    matches.load(); await context.sync();
    if (matches.items.length !== 1) throw new Error(`cardinality ${matches.items.length}`);
    matches.items[0].insertText('Recipient', 'Replace');
    await context.sync();
  });
}
async function save() { const bytes = await runtime.editor.save(); return encode(bytes); }
window.repro = { open, format, replace, save };
