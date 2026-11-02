const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const ts = createRequire(path.join(root, 'frontend/package.json'))('typescript');
class Element {
  constructor() { this.children = []; this.style = {}; this.dataset = {}; this.classList = { contains: () => false }; }
  appendChild(child) { this.children.push(child); child.parentNode = this; }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); this.parentNode = null; }
}
const body = new Element();
const all = () => { const visit = e => [e, ...e.children.flatMap(visit)]; return visit(body); };
const document = {
  body, documentElement: new Element(), createElement: () => new Element(),
  getElementById: id => all().find(e => e.id === id),
  querySelectorAll: () => all().filter(e => e.dataset.toastGroup === 'drive-auth'),
};
const events = new EventTarget();
const logs = [], timers = [], cleanups = [];
function load(file, imports) {
  const source = fs.readFileSync(path.join(root, 'frontend/src', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React,
  } }).outputText;
  const module = { exports: {} };
  Function('module', 'exports', 'require', 'document', 'window', 'location', 'setTimeout', output)(
    module, module.exports, id => { assert.ok(id in imports, id); return imports[id]; },
    document, events, { pathname: '/' }, fn => timers.push(fn));
  return module.exports;
}
const logging = { reportClientLog: (...args) => logs.push(args) };
const toast = load('utils/toast.ts', { '@/lib/clientLogs': logging });
const react = { createContext: () => ({ Provider: {} }), useEffect: fn => cleanups.push(fn()), createElement: () => null };
const provider = load('components/ToastProvider.tsx', { react: { ...react, default: react }, '@/lib/clientLogs': logging, '@/utils/toast': toast });
provider.ToastProvider({ children: null });
const messages = [
  '구글 드라이브 인증이 만료되었습니다.',
  '구글 드라이브 인증이 만료되었지만 작성 중인 내용은 안전하게 로컬에 보존되었습니다. 재인증 시 클라우드로 자동 동기화됩니다.',
  '구글 드라이브 연결을 갱신한 뒤 다시 열어 주세요.',
];
messages.forEach(message => toast.showToast(message, 'error'));
assert.equal(document.querySelectorAll().length, 1);
assert.equal(logs.length, 1);
toast.showToast('저장 공간이 부족합니다.', 'error');
assert.equal(body.children[0].children.length, 2);
events.dispatchEvent(new Event('onrivi:drive_token_updated'));
assert.equal(document.querySelectorAll().length, 0);
assert.equal(body.children[0].children.length, 1, 'unrelated errors stay visible');
toast.showToast(messages[0], 'warning');
assert.equal(document.querySelectorAll().length, 1, 'new expiry is reported');
document.querySelectorAll()[0].remove();
toast.showToast(messages[0], 'error');
assert.equal(document.querySelectorAll().length, 0, 'dismissed warnings do not repeat before recovery');
cleanups.forEach(fn => fn());
console.log('PASS: one notice per expiry, recovery removes warnings, unrelated errors retained, next expiry reported, dismissed warning stays dismissed');
