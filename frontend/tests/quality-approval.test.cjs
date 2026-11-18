const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = readFileSync(path.join(__dirname, '../lib/qualityApproval.ts'), 'utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { calculateBoardApproval } = context.exports;

test('approval is unavailable without consistent confirmed board counts', () => {
  for (const counts of [null, { plannedLot: 500, defectOccurrences: 251 },
    { inspectedBoards: 0, approvedBoards: 0 }, { inspectedBoards: 4, approvedBoards: 5 },
    { inspectedBoards: 4, approvedBoards: -1 }, { inspectedBoards: 4.5, approvedBoards: 2 }]) {
    assert.equal(calculateBoardApproval(counts), null);
  }
});

test('confirmed counts distinguish real zero approval from unavailable data', () => {
  assert.equal(calculateBoardApproval({ inspectedBoards: 4, approvedBoards: 0 }).percent, 0);
  assert.equal(calculateBoardApproval({ inspectedBoards: 4, approvedBoards: 3 }).percent, 75);
  assert.equal(calculateBoardApproval({ inspectedBoards: 4, approvedBoards: 4 }).percent, 100);
});
