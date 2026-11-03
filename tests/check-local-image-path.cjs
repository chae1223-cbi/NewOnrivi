const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const main = fs.readFileSync('main.js', 'utf8');
const start = main.indexOf('function findLocalImageFile(rawPath)');
const end = main.indexOf('\n}', start) + 2;
assert.ok(start > 0 && end > start);
const expected = path.normalize('/media/한글 그림.jpg');
const fakeFs = { existsSync: value => value === expected, statSync: () => ({ isDirectory: () => false }) };
const find = Function('fs','path','process', `${main.slice(start,end)};return findLocalImageFile;`)(fakeFs,path,process);
assert.equal(find('</media/한글 그림.jpg>'), expected);
assert.equal(find('</media/한글 그림.jpg?width=100>'), expected);
assert.equal(find('/media/한글%20그림.jpg'), expected);
// Execute the actual modal cleanup expression against a Markdown destination.
const modal = fs.readFileSync('frontend/src/components/ImageModal.tsx', 'utf8');
const cleanup = modal.split('\n').find(line => line.includes('url = url.replace('));
assert.ok(cleanup);
const clean = Function('url', `${cleanup};return url;`);
assert.equal(clean('</media/한글 그림.jpg?driveId=abc>'), '/media/한글 그림.jpg?driveId=abc');
console.log('PASS: angle-wrapped Markdown paths, query removal for local lookup, Korean filenames, modal destination cleanup');
