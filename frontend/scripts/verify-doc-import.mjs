import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import CFB from 'cfb';

const require = createRequire(import.meta.url);
const source = ts.transpileModule(fs.readFileSync(new URL('../src/lib/docImporter.ts', import.meta.url), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}
}).outputText.replace("'cfb'", JSON.stringify(pathToFileURL(require.resolve('cfb')).href));
const {importDoc} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const word = Buffer.alloc(2048);
word.writeUInt16LE(0xa5ec, 0);
word.writeUInt16LE(0x00c1, 2);
word.writeUInt16LE(0x0200, 0x0a);
word.writeUInt32LE(9, 0x4c);
word.writeUInt32LE(0, 0x1a2);
word.writeUInt32LE(33, 0x1a6);
word.write('Hello\r', 1024, 'latin1');
word.write('한글\r', 1100, 'utf16le');
const table = Buffer.alloc(33);
table[0] = 2;
table.writeUInt32LE(28, 1);
table.writeUInt32LE(0, 5);
table.writeUInt32LE(6, 9);
table.writeUInt32LE(9, 13);
table.writeUInt32LE(0x40000000 | (1024 * 2), 19);
table.writeUInt32LE(1100, 27);
const container = CFB.utils.cfb_new();
CFB.utils.cfb_add(container, 'WordDocument', word);
CFB.utils.cfb_add(container, '1Table', table);
const bytes = CFB.write(container, {type:'array'});
const buffer = Uint8Array.from(bytes).buffer;
assert.equal(await importDoc(buffer), 'Hello\n한글');
await assert.rejects(importDoc(new Uint8Array([0x50, 0x4b]).buffer), /DOCX/);
word.writeUInt16LE(0x0300, 0x0a);
const encrypted = CFB.utils.cfb_new();
CFB.utils.cfb_add(encrypted, 'WordDocument', word);
CFB.utils.cfb_add(encrypted, '1Table', table);
await assert.rejects(importDoc(Uint8Array.from(CFB.write(encrypted, {type:'array'})).buffer), /암호/);
console.log('PASS: DOC compressed and Unicode pieces, paragraph breaks, invalid and encrypted files');
