/**
 * Comprehensive Automated Test Suite for Google Workspace Threat Containment Solution
 * Devoteam G Cloud
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('================================================================');
console.log('🚀 RUNNING RIGOROUS TEST SUITE: GWS EMAIL PURGE SOLUTION');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  }
}

// -------------------------------------------------------------
// SETUP APPS SCRIPT MOCK RUNTIME
// -------------------------------------------------------------
const codePath = path.join(__dirname, '../gam-sheet-ui/Code.gs');
const codeContent = fs.readFileSync(codePath, 'utf8');

// Mock Apps Script globals
const mockScriptProperties = new Map();
const mockSpreadsheetData = new Map();

const SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getId: () => '1MockSpreadsheetId12345',
    getSheetByName: (name) => {
      if (!mockSpreadsheetData.has(name)) return null;
      return mockSpreadsheetData.get(name);
    },
    insertSheet: (name) => {
      const sheet = createMockSheet(name);
      mockSpreadsheetData.set(name, sheet);
      return sheet;
    },
    setActiveSheet: () => {},
    toast: () => {}
  }),
  getUi: () => ({
    alert: () => {},
    showSidebar: () => {},
    createMenu: () => ({ addItem: () => ({ addToUi: () => {} }) }),
    ButtonSet: { OK: 'OK' }
  }),
  newDataValidation: () => {
    const builder = {
      requireValueInList: () => builder,
      setAllowInvalid: () => builder,
      build: () => ({})
    };
    return builder;
  }
};

function parseA1(str) {
  const match = str.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: 1, col: 1 };
  const colStr = match[1];
  const row = parseInt(match[2], 10);
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  return { row, col };
}

function createMockSheet(name) {
  let store = [];
  return {
    getName: () => name,
    getRange: (startRow, startCol, numRows, numCols) => {
      if (typeof startRow === 'string') {
        const a1 = startRow.toUpperCase();
        if (a1.includes(':')) {
          const parts = a1.split(':');
          const p1 = parseA1(parts[0]);
          const p2 = parseA1(parts[1]);
          startRow = p1.row;
          startCol = p1.col;
          numRows = p2.row - p1.row + 1;
          numCols = p2.col - p1.col + 1;
        } else {
          const p = parseA1(a1);
          startRow = p.row;
          startCol = p.col;
          numRows = 1;
          numCols = 1;
        }
      }
      const nr = numRows || 1;
      const nc = numCols || 1;
      const rangeObj = {
        getValue: () => (store[startRow - 1] && store[startRow - 1][startCol - 1]) || '',
        setValue: (v) => {
          while (store.length < startRow) store.push([]);
          while (store[startRow - 1].length < startCol) store[startRow - 1].push('');
          store[startRow - 1][startCol - 1] = v;
          return rangeObj;
        },
        getValues: () => {
          const res = [];
          for (let r = 0; r < nr; r++) {
            const rowIdx = startRow - 1 + r;
            const rowData = store[rowIdx] || [];
            const slice = [];
            for (let c = 0; c < nc; c++) {
              slice.push(rowData[startCol - 1 + c] !== undefined ? rowData[startCol - 1 + c] : '');
            }
            res.push(slice);
          }
          return res;
        },
        setValues: (vals) => {
          for (let r = 0; r < vals.length; r++) {
            const rowIdx = startRow - 1 + r;
            while (store.length <= rowIdx) store.push([]);
            for (let c = 0; c < vals[r].length; c++) {
              const colIdx = startCol - 1 + c;
              while (store[rowIdx].length <= colIdx) store[rowIdx].push('');
              store[rowIdx][colIdx] = vals[r][c];
            }
          }
          return rangeObj;
        },
        merge: () => rangeObj,
        setBackground: () => rangeObj,
        setFontColor: () => rangeObj,
        setFontWeight: () => rangeObj,
        setFontStyle: () => rangeObj,
        setFontFamily: () => rangeObj,
        setFontSize: () => rangeObj,
        setHorizontalAlignment: () => rangeObj,
        setVerticalAlignment: () => rangeObj,
        setWrap: () => rangeObj,
        setNote: () => rangeObj,
        setDataValidation: () => rangeObj,
        clearContent: () => {
          for (let r = 0; r < nr; r++) {
            const rowIdx = startRow - 1 + r;
            if (store[rowIdx]) {
              for (let c = 0; c < nc; c++) {
                const colIdx = startCol - 1 + c;
                if (colIdx < store[rowIdx].length) {
                  store[rowIdx][colIdx] = '';
                }
              }
            }
          }
          while (store.length > 1 && store[store.length - 1].every(x => x === '')) {
            store.pop();
          }
          return rangeObj;
        }
      };
      return rangeObj;
    },
    getDataRange: () => ({
      getValues: () => store.slice()
    }),
    getLastRow: () => store.length,
    appendRow: (row) => store.push(row.slice()),
    clear: () => { store = []; },
    setColumnWidth: () => {},
    setFrozenRows: () => {},
    setRowHeight: () => {},
    setTabColor: () => {}
  };
}

const PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => mockScriptProperties.get(key) || null,
    setProperty: (key, val) => mockScriptProperties.set(key, String(val)),
    deleteProperty: (key) => mockScriptProperties.delete(key)
  })
};

const Session = {
  getActiveUser: () => ({
    getEmail: () => 'admin@andhika.com'
  })
};

const Utilities = {
  base64EncodeWebSafe: (str) => Buffer.from(str).toString('base64url'),
  computeRsaSha256Signature: (str, key) => Buffer.from('mock-signature'),
  formatDate: (date) => '2026-10-09 12:00:00',
  DigestAlgorithm: {
    SHA_256: 'SHA_256'
  },
  computeDigest: (algo, str) => crypto.createHash('sha256').update(str).digest()
};

const HtmlService = {
  createHtmlOutputFromFile: (file) => ({
    setTitle: () => ({ setWidth: () => ({ setHeight: () => ({}) }) })
  })
};

let mockGroupsAppLookup = {};
const GroupsApp = {
  getGroupByEmail: (email) => {
    if (mockGroupsAppLookup[email]) {
      return {
        getUsers: () => mockGroupsAppLookup[email].map(e => ({ getEmail: () => e }))
      };
    }
    return null;
  }
};

let mockUrlFetchResponses = {};
const UrlFetchApp = {
  fetch: (url, opts) => {
    for (const [key, resp] of Object.entries(mockUrlFetchResponses)) {
      if (url.includes(key)) {
        return {
          getResponseCode: () => resp.code || 200,
          getContentText: () => JSON.stringify(resp.body || {})
        };
      }
    }
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({})
    };
  }
};

// Evaluate Code.gs in mock sandbox
const vm = require('vm');
const sandbox = {
  SpreadsheetApp,
  PropertiesService,
  Session,
  Utilities,
  HtmlService,
  GroupsApp,
  UrlFetchApp,
  Logger: console,
  Buffer,
  JSON,
  Math,
  Date,
  Error,
  RegExp,
  String,
  Array
};
vm.createContext(sandbox);
vm.runInContext(codeContent, sandbox);

// -------------------------------------------------------------
// TEST SUITE 1: QUERY SAFETY VALIDATION
// -------------------------------------------------------------
console.log('--- TEST SUITE 1: validateQuerySafety() ---');

it('Rejects empty or whitespace-only query', () => {
  const r1 = sandbox.validateQuerySafety('');
  assert.strictEqual(r1.valid, false);
  const r2 = sandbox.validateQuerySafety('   ');
  assert.strictEqual(r2.valid, false);
});

it('Rejects catastrophic wildcard and read/unread queries', () => {
  assert.strictEqual(sandbox.validateQuerySafety('*').valid, false);
  assert.strictEqual(sandbox.validateQuerySafety('""').valid, false);
  assert.strictEqual(sandbox.validateQuerySafety("''").valid, false);
  assert.strictEqual(sandbox.validateQuerySafety('is:unread').valid, false);
  assert.strictEqual(sandbox.validateQuerySafety('is:read').valid, false);
  assert.strictEqual(sandbox.validateQuerySafety('label:inbox').valid, false);
  assert.strictEqual(sandbox.validateQuerySafety('label:sent').valid, false);
});

it('Rejects broad queries lacking a primary threat identifier (modifiers only)', () => {
  const r1 = sandbox.validateQuerySafety('has:attachment');
  assert.strictEqual(r1.valid, false);
  assert.ok(r1.error.includes('lacks a primary threat identifier'));

  const r2 = sandbox.validateQuerySafety('after:2026/09/01');
  assert.strictEqual(r2.valid, false);

  const r3 = sandbox.validateQuerySafety('before:2026/10/01');
  assert.strictEqual(r3.valid, false);

  const r4 = sandbox.validateQuerySafety('after:2026/01/01 has:attachment');
  assert.strictEqual(r4.valid, false);
});

it('Rejects empty primary threat anchor values (e.g. subject:"" or from:"")', () => {
  const r1 = sandbox.validateQuerySafety('subject:""');
  assert.strictEqual(r1.valid, false);
  assert.ok(r1.error.includes('empty threat identifier'));

  const r2 = sandbox.validateQuerySafety('from:"" after:2026/09/01');
  assert.strictEqual(r2.valid, false);
});

it('Accepts valid anchored queries with specific threat criteria', () => {
  assert.strictEqual(sandbox.validateQuerySafety('from:attacker@evil.com').valid, true);
  assert.strictEqual(sandbox.validateQuerySafety('subject:"Phishing Campaign Detected"').valid, true);
  assert.strictEqual(sandbox.validateQuerySafety('rfc822msgid:<CA12345@mail.gmail.com>').valid, true);
  assert.strictEqual(sandbox.validateQuerySafety('filename:malicious_payload.exe').valid, true);
  assert.strictEqual(sandbox.validateQuerySafety('to:victim@andhika.com from:phish@evil.com').valid, true);
  assert.strictEqual(sandbox.validateQuerySafety('from:phish@evil.com after:2026/09/01 subject:"Urgent"').valid, true);
});

// -------------------------------------------------------------
// TEST SUITE 2: GAM COMMAND GENERATOR
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 2: buildGamCommand() ---');

it('Generates correct Single Mailbox GAM command', () => {
  const cmd = sandbox.buildGamCommand({
    scope: 'Single Mailbox',
    targetIdentifier: 'victim@andhika.com',
    action: 'DRY_RUN (Count & List Only)',
    query: 'from:bad@evil.com'
  });
  assert.strictEqual(cmd, 'gam user "victim@andhika.com" print messages query "from:bad@evil.com"');
});

it('Generates correct Google Group command and NEVER collides with OU', () => {
  const cmd = sandbox.buildGamCommand({
    scope: 'Google Group Members',
    targetIdentifier: 'branch.tanahgrogot@andhika.com',
    action: 'TRASH (Soft Purge - 30 Day Recovery Window)',
    query: 'from:ahmad.dikyas@andhika.com subject:"Test email group"'
  });
  assert.strictEqual(
    cmd,
    'gam group "branch.tanahgrogot@andhika.com" trash messages query "from:ahmad.dikyas@andhika.com subject:\\"Test email group\\"" doit'
  );
  assert.ok(!cmd.includes('gam ou '), 'Command must NOT contain "gam ou"');
  assert.ok(cmd.startsWith('gam group '), 'Command must start with "gam group"');
});

it('Generates correct Google Group DELETE command', () => {
  const cmd = sandbox.buildGamCommand({
    scope: 'Google Group Members',
    targetIdentifier: 'branch.tanahgrogot@andhika.com',
    action: 'DELETE (Hard Purge - Permanent Expunge)',
    query: 'from:bad@evil.com subject:"Phish"'
  });
  assert.strictEqual(
    cmd,
    'gam group "branch.tanahgrogot@andhika.com" delete messages query "from:bad@evil.com subject:\\"Phish\\"" doit'
  );
});

it('Generates correct Google Group DRY_RUN command', () => {
  const cmd = sandbox.buildGamCommand({
    scope: 'Google Group Members',
    targetIdentifier: 'branch.tanahgrogot@andhika.com',
    action: 'DRY_RUN (Count & List Only)',
    query: 'from:bad@evil.com subject:"Phish"'
  });
  assert.strictEqual(
    cmd,
    'gam group "branch.tanahgrogot@andhika.com" print messages query "from:bad@evil.com subject:\\"Phish\\""'
  );
});

it('Generates correct Organizational Unit (OU) command', () => {
  const cmd = sandbox.buildGamCommand({
    scope: 'Organizational Unit (OU)',
    targetIdentifier: '/Finance/Invoicing',
    action: 'DELETE (Hard Purge - Permanent Expunge)',
    query: 'filename:invoice.pdf.exe'
  });
  assert.strictEqual(
    cmd,
    'gam ou "/Finance/Invoicing" delete messages query "filename:invoice.pdf.exe" doit'
  );
});

it('Generates correct Domain-Wide command', () => {
  const cmd = sandbox.buildGamCommand({
    scope: 'All Users (Domain-Wide)',
    action: 'DRY_RUN (Count & List Only)',
    query: 'rfc822msgid:<global-threat@evil.com>'
  });
  assert.strictEqual(
    cmd,
    'gam all users print messages query "rfc822msgid:<global-threat@evil.com>"'
  );
});

it('Generates correct Target_Mailboxes Sheet command', () => {
  const cmd = sandbox.buildGamCommand({
    scope: 'Specific Mailbox List (Tab: Target_Mailboxes)',
    spreadsheetId: '1AbC_SpreadsheetId',
    action: 'TRASH (Soft Purge - 30 Day Recovery Window)',
    query: 'from:phish@evil.com'
  });
  assert.strictEqual(
    cmd,
    'gam csv gsheet "1AbC_SpreadsheetId" "Target_Mailboxes" gam user ~Email trash messages query "from:phish@evil.com" doit'
  );
});

it('Properly escapes embedded quotes in search queries', () => {
  const cmd = sandbox.buildGamCommand({
    scope: 'Single Mailbox',
    targetIdentifier: 'user@andhika.com',
    action: 'DRY_RUN',
    query: 'subject:"Test \"nested\" query"'
  });
  assert.ok(cmd.includes('subject:\\"Test \\"nested\\" query\\"'));
});

// -------------------------------------------------------------
// TEST SUITE 3: TARGET MAILBOX SYNCHRONIZATION
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 3: syncTargetMailboxes() ---');

function resetTargetSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let targetSheet = ss.getSheetByName('Target_Mailboxes');
  if (!targetSheet) targetSheet = ss.insertSheet('Target_Mailboxes');
  targetSheet.clear();
  targetSheet.getRange(1, 1, 1, 5).setValues([['Email', 'Type', 'Status', 'Message ID', 'Note']]);
  return targetSheet;
}

it('Synchronizes Target_Mailboxes sheet with GROUP prefix for Google Group scope', () => {
  const targetSheet = resetTargetSheet();

  sandbox.syncTargetMailboxes('Google Group Members', 'branch.tanahgrogot@andhika.com', []);
  const values = targetSheet.getDataRange().getValues();

  assert.strictEqual(values[0][0], 'Email');
  assert.strictEqual(values[1][0], 'GROUP: branch.tanahgrogot@andhika.com');
  assert.strictEqual(values[1][1], 'Google Group');
});

it('Synchronizes Target_Mailboxes sheet with OU prefix for OU scope', () => {
  const targetSheet = resetTargetSheet();

  sandbox.syncTargetMailboxes('Organizational Unit (OU)', '/Sales/BranchA', []);
  const values = targetSheet.getDataRange().getValues();

  assert.strictEqual(values[0][0], 'Email');
  assert.strictEqual(values[1][0], 'OU: /Sales/BranchA');
  assert.strictEqual(values[1][1], 'Organizational Unit');
});

it('Synchronizes explicit user list and ignores dummy placeholders', () => {
  const targetSheet = resetTargetSheet();

  sandbox.syncTargetMailboxes('Specific Mailbox List (Tab: Target_Mailboxes)', '', [
    'user1@andhika.com',
    'victim.user@yourdomain.com', // Dummy placeholder
    'user2@andhika.com'
  ]);
  const values = targetSheet.getDataRange().getValues();

  assert.strictEqual(values.length, 3); // Header + 2 valid users
  assert.strictEqual(values[0][0], 'Email');
  assert.strictEqual(values[1][0], 'user1@andhika.com');
  assert.strictEqual(values[2][0], 'user2@andhika.com');
});

// -------------------------------------------------------------
// TEST SUITE 4: SIDEBAR INTEGRATION & COMMAND UPDATE
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 4: getSidebarData() & updatePurgeSettings() ---');

it('Returns accurate initial state via getSidebarData()', () => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let controlSheet = ss.getSheetByName('Purge_Control_Center');
  if (!controlSheet) controlSheet = ss.insertSheet('Purge_Control_Center');
  sandbox.setupControlCenterSheet(controlSheet);

  const data = sandbox.getSidebarData();
  assert.strictEqual(typeof data, 'object');
  assert.strictEqual(typeof data.isValid, 'boolean');
  assert.strictEqual(typeof data.command, 'string');
});

it('Updates settings and auto-generates GAM command via updatePurgeSettings()', () => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let controlSheet = ss.getSheetByName('Purge_Control_Center');
  if (!controlSheet) controlSheet = ss.insertSheet('Purge_Control_Center');
  sandbox.setupControlCenterSheet(controlSheet);

  const updated = sandbox.updatePurgeSettings({
    query: 'from:threat@attacker.com subject:"Phishing Alert"',
    action: 'TRASH (Soft Purge - 30-Day Recovery)',
    scope: 'Google Group Members',
    targetIdentifier: 'branch.tanahgrogot@andhika.com'
  });

  assert.strictEqual(updated.isValid, true);
  assert.ok(updated.command.includes('gam group "branch.tanahgrogot@andhika.com" trash messages'));
  assert.ok(updated.command.includes('doit'));
});

// -------------------------------------------------------------
// TEST SUITE 5: HTML UI INTEGRITY & BINDINGS (SIDEBAR)
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 5: HTML DOM & Event Binding Verification ---');

const sidebarHtml = fs.readFileSync(path.join(__dirname, '../gam-sheet-ui/Sidebar.html'), 'utf8');

function verifyHtmlBindings(html, name) {
  const idRegex = /document\.getElementById\(['"]([a-zA-Z0-9_-]+)['"]\)/g;
  const ids = Array.from(html.matchAll(idRegex)).map(m => m[1]);
  const existingIds = new Set(Array.from(html.matchAll(/\bid=['"]([a-zA-Z0-9_-]+)['"]/g)).map(m => m[1]));

  const missing = [];
  ids.forEach(id => {
    if (!existingIds.has(id)) missing.push(id);
  });

  assert.strictEqual(missing.length, 0, `Missing IDs in ${name}: ${missing.join(', ')}`);
}

it('Verifies all document.getElementById bindings in Sidebar.html', () => {
  verifyHtmlBindings(sidebarHtml, 'Sidebar.html');
});

it('Verifies client script syntax and safety in Sidebar.html', () => {
  const scripts = sidebarHtml.match(/<script[\s\S]*?<\/script>/gi) || [];
  scripts.forEach(s => {
    const code = s.replace(/<\/?script[^>]*>/gi, '');
    new Function('google', code);
  });
});

// -------------------------------------------------------------
// TEST SUITE 6: BASH SCRIPT RIGOROUS TESTS
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 6: Bash Runner Rigorous Tests ---');

const { execSync } = require('child_process');
const runnerPath = path.join(__dirname, '../gam-sheet-ui/gam-purge-runner.sh');

it('Passes syntax check with standard /bin/bash (bash 3.2+ compatible)', () => {
  execSync(`/bin/bash -n "${runnerPath}"`);
});

it('Prints help message when invoked with --help', () => {
  const out = execSync(`/bin/bash "${runnerPath}" --help`).toString();
  assert.ok(out.includes('Usage:'));
  assert.ok(out.includes('--query'));
  assert.ok(out.includes('--scope'));
  assert.ok(out.includes('--mode'));
});

it('Rejects catastrophic queries in bash runner (exit code 2)', () => {
  try {
    execSync(`/bin/bash "${runnerPath}" --query "has:attachment" --mode dry-run 2>&1`);
    assert.fail('Should have exited with code 2');
  } catch (e) {
    assert.strictEqual(e.status, 2);
    assert.ok(e.stdout.toString().includes('Catastrophic query pattern detected') || e.stdout.toString().includes('lacks a primary threat identifier'));
  }
});

it('Rejects missing query in bash runner (exit code 1)', () => {
  try {
    execSync(`/bin/bash "${runnerPath}" --mode dry-run 2>&1`);
    assert.fail('Should have exited with code 1');
  } catch (e) {
    assert.strictEqual(e.status, 1);
  }
});

// -------------------------------------------------------------
// TEST SUITE 7: BUNDLE REPOSITORY SYNC & DISTRIBUTION
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 7: Customer Bundle Distribution Sync ---');

it('Rebuilds and validates customer distribution bundle', () => {
  execSync('python3 build_customer_bundle.py', { cwd: path.join(__dirname, '..') });
  const zipPath = path.join(__dirname, '../dist/Devoteam-GWS-Email-Purge-Customer-Bundle.zip');
  assert.ok(fs.existsSync(zipPath), 'Customer bundle zip must exist');

  const stats = fs.statSync(zipPath);
  assert.ok(stats.size > 100000, 'Customer bundle zip should be > 100KB');

  // Verify that Code.gs in gam-sheet-ui and bundle are identical
  const bundleCode = fs.readFileSync(path.join(__dirname, '../dist/Devoteam-GWS-Email-Purge-Customer-Bundle/03-Apps-Script-Command-Center/Code.gs'), 'utf8');
  assert.strictEqual(bundleCode, fs.readFileSync(codePath, 'utf8'), 'Bundle Code.gs must match working Code.gs');
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`📊 TEST SUITE RESULTS: ${passedTests}/${totalTests} PASSED (0 FAILURES)`);
console.log('================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
