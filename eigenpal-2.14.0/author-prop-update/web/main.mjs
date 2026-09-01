import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DocxEditor } from '@docx-editor.dev/react';
import { reviewModule } from '@docx-editor.dev/pro/react';
import { DocxEditor as Automation } from '@docx-editor.dev/editor-api/browser';
import '@docx-editor.dev/core/styles/editor.css';

const modules = [reviewModule()];
const runtime = { setDocument: null, setAuthor: null, editor: null, automation: null };
const wait = async (predicate) => {
  for (let i = 0; i < 600; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('editor timeout');
};
const decode = (value) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
const encode = (value) => {
  const bytes = new Uint8Array(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
};

function App() {
  const [document, setDocument] = useState(null);
  const [author, setAuthor] = useState('Initial Author');
  runtime.setDocument = setDocument;
  runtime.setAuthor = setAuthor;
  if (!document) return React.createElement('span', null, 'waiting');
  return React.createElement(DocxEditor.Root, {
    document,
    modules,
    author,
    onReady: (editor) => {
      runtime.editor = editor;
      runtime.automation = Automation.createBrowser(editor);
      editor.setEditingMode('suggesting');
    },
  }, React.createElement(DocxEditor.Viewport, { style: { height: '700px' } }, React.createElement(DocxEditor.Content)));
}

createRoot(document.getElementById('root')).render(React.createElement(App));
await wait(() => runtime.setDocument && runtime.setAuthor);

async function replace(quote, replacement) {
  await runtime.automation.run(async (context) => {
    const matches = context.document.body.search(quote, { matchCase: true });
    matches.load();
    await context.sync();
    if (matches.items.length !== 1) throw new Error(`cardinality ${matches.items.length}`);
    matches.items[0].insertText(replacement, 'Replace');
    await context.sync();
  });
}

window.repro = {
  async open(contentBase64) {
    runtime.setDocument(decode(contentBase64));
    await wait(() => runtime.editor && runtime.automation);
  },
  async changeAuthor(author) {
    runtime.setAuthor(author);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  },
  replace,
  async save() { return encode(await runtime.editor.save()); },
};
