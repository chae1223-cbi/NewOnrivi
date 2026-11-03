// Verify bundled help documents and their application entry points.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const MarkdownIt = require('../frontend/node_modules/markdown-it');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'frontend/public/help');
const documents = fs.readdirSync(folder).filter(name => name.endsWith('.md')).sort();
const assets = JSON.parse(fs.readFileSync(path.join(root, 'frontend/src/lib/helpAssets.json'), 'utf8'));
const modal = fs.readFileSync(path.join(root, 'frontend/src/components/HelpModal.tsx'), 'utf8');
const page = fs.readFileSync(path.join(root, 'frontend/src/app/docs/page.tsx'), 'utf8');
const parser = new MarkdownIt({html:true});
assert.ok(modal.includes('<HelpDocument') && page.includes('<HelpDocument'), 'Help views must share the dedicated style');
let references = 0;
assert.equal(documents.length, 33);
assert.equal(new Set(assets.map(asset => asset.id)).size, assets.length);
for (const name of documents) {
  const source = fs.readFileSync(path.join(folder, name), 'utf8');
  assert.equal(source, fs.readFileSync(path.join(root, 'docs/help', name), 'utf8'), `Mirror differs: ${name}`);
  assert.ok(source.includes('lastUpdated: 2026-10-24'), name);
  assert.ok(/^---\r?\ntitle: "/.test(source), `Invalid metadata opening: ${name}`);
  assert.ok(!source.includes('\ufffd'), `Broken text encoding: ${name}`);
  assert.ok(source.includes('css_profile: onrivi-help'), `Missing help style: ${name}`);
  assert.ok(modal.includes(`"${name}"`) && page.includes(`"${name}"`), `Unregistered document: ${name}`);
  assert.equal(assets.filter(asset => asset.file_name === name).length, 1, `Asset entry: ${name}`);
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const tokens = parser.parse(body, {});
  assert.ok(tokens.length && parser.render(body).length, name);
  for (const token of tokens) {
    if (token.type === 'fence') {
      // All examples must have a closing fence with at least the opening width.
      const lastLine = body.split(/\r?\n/)[token.map[1]-1];
      assert.ok(lastLine.trim().startsWith(token.markup), `Unclosed example: ${name}`);
    }
    for (const child of token.children || []) {
      const target = child.type === 'link_open' ? child.attrGet('href') : child.type === 'image' ? child.attrGet('src') : null;
      if (!target || (!target.startsWith('/help/') && !target.startsWith('./'))) continue;
      const relative = decodeURIComponent(target.replace(/^(?:\/help\/|\.\/)/, '').split(/[?#]/)[0]);
      const resolved = path.resolve(folder, relative);
      assert.ok(resolved.startsWith(folder + path.sep) && fs.existsSync(resolved), `Missing help reference: ${name} -> ${target}`);
      references++;
    }
  }
}
console.log(`PASS: ${documents.length} help documents, metadata, Markdown examples, mirrors, registries and ${references} local references`);
