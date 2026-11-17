// Run with: node tests/math-core.test.js
// Tests the actual arithmetic parser in index.html, without executing the app or network.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function _fmt(v)');
const end = html.indexOf('/* 방정식 수치 솔버:', start);
if (start < 0 || end < 0) throw new Error('Math core not found');
const ctx = vm.createContext({});
vm.runInContext(html.slice(start, end), ctx);
const cases = [
  ['2+3*4', 14], ['(2+3)*4', 20], ['2^3^2', 512], ['-2^2', -4],
  ['(-2)^2', 4], ['2^-2', 0.25], ['3!', 6], ['2(3+4)', 14],
  ['sqrt(9)', 3], ['abs-2', 2], ['abs(-2)', 2], ['3.5+1.25', 4.75], ['1/0', null], ['2+', null],
  ['(2+3', null], ['2+3)', null], ['1..2+1', null], ['.', null]
];
let failures = 0;
for (const [input, expected] of cases) {
  const actual = ctx.mEvalStr(input);
  try { assert.equal(actual, expected); console.log('PASS', input); }
  catch { failures++; console.log('FAIL', input, 'expected', expected, 'got', actual); }
}
console.log(`${cases.length - failures}/${cases.length} passed`);
if (failures) process.exitCode = 1;
