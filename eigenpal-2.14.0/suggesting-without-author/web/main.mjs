import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DocxEditor } from '@docx-editor.dev/react';
import { reviewModule } from '@docx-editor.dev/pro/react';
import '@docx-editor.dev/core/styles/editor.css';

const modules = [reviewModule()];
const runtime = { setConfig: null, editor: null };
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
  const [config, setConfig] = useState(null);
  runtime.setConfig = setConfig;
  if (!config) return React.createElement('span', null, 'waiting');
  return React.createElement(DocxEditor.Root, {
    key: config.key,
    document: config.document,
    modules,
    ...(config.author ? { author: config.author } : {}),
    onReady: (editor) => {
      runtime.editor = editor;
      editor.setEditingMode('suggesting');
    },
  }, React.createElement(DocxEditor.Viewport, { style: { height: '700px' } }, React.createElement(DocxEditor.Content)));
}

createRoot(document.getElementById('root')).render(React.createElement(App));
await wait(() => runtime.setConfig);

async function open(contentBase64, author) {
  runtime.editor = null;
  runtime.setConfig({ key: crypto.randomUUID(), document: decode(contentBase64), author });
  await wait(() => runtime.editor && document.querySelector('[contenteditable=true]'));
}

async function save() {
  return encode(await runtime.editor.save());
}

window.repro = { open, save };
