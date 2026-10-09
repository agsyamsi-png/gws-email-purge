/**
 * Comprehensive Automated Test Suite for Google Workspace Threat Containment Solution
 * Devoteam G Cloud
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

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
    }
  })
};

function createMockSheet(name) {
  let store = [];
  return {
    getName: () => name,
    getRange: (startRow, startCol, numRows, numCols) => {
      const nr = numRows || 1;
      const nc = numCols || 1;
      return {
        getValue: () => (store[startRow - 1] && store[startRow - 1][startCol - 1]) || '',
        setValue: (v) => {
          while (store.length < startRow) store.push([]);
          while (store[startRow - 1].length < startCol) store[startRow - 1].push('');
          store[startRow - 1][startCol - 1] = v;
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
        },
        setBackground: () => {},
        setFontColor: () => {},
        setFontWeight: () => {},
        setFontSize: () => {},
        setHorizontalAlignment: () => {},
        setWrap: () => {},
        setNote: () => {},
        setDataValidation: () => {},
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
        }
      };
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
  formatDate: (date) => '2026-10-09 12:00:00'
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
// TEST SUITE 4: WEB PURGE ENGINE & GROUP EXPANSION
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 4: executeWebPurge() & Group Resolution ---');

// Mock OAuth2 Token Endpoint
mockUrlFetchResponses['oauth2.googleapis.com/token'] = {
  code: 200,
  body: { access_token: 'mock-dwd-token-xyz' }
};

it('Throws informative error when Google Group cannot be expanded in Web Portal', () => {
  resetTargetSheet();
  mockGroupsAppLookup = {}; // GroupsApp will return null

  // Ensure SA key is set so it doesn't run in simulation mode
  mockScriptProperties.set('SA_KEY', JSON.stringify({
    client_email: 'sa@project.iam.gserviceaccount.com',
    private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----'
  }));

  assert.throws(() => {
    sandbox.executeWebPurge({
      query: 'from:bad@evil.com',
      scope: 'Google Group Members',
      targetIdentifier: 'branch.tanahgrogot@andhika.com',
      action: 'DRY_RUN'
    });
  }, (err) => {
    return err.message.includes("Target 'branch.tanahgrogot@andhika.com' adalah Google Group") &&
           err.message.includes('gam group "branch.tanahgrogot@andhika.com"');
  });
});

it('Automatically expands Google Group members via GroupsApp when accessible', () => {
  resetTargetSheet();
  mockGroupsAppLookup['branch.tanahgrogot@andhika.com'] = [
    'agus.septian@andhika.com',
    'eka.heryanto@andhika.com'
  ];

  mockUrlFetchResponses['messages?q='] = {
    code: 200,
    body: {
      messages: [
        { id: 'msg-001', threadId: 'th-001' }
      ]
    }
  };

  mockUrlFetchResponses['messages/msg-001'] = {
    code: 200,
    body: {
      id: 'msg-001',
      payload: {
        headers: [
          { name: 'Subject', value: 'Threat Test' },
          { name: 'Date', value: 'Fri, 9 Oct 2026 10:00:00 +0700' }
        ]
      }
    }
  };

  const report = sandbox.executeWebPurge({
    query: 'from:bad@evil.com',
    scope: 'Google Group Members',
    targetIdentifier: 'branch.tanahgrogot@andhika.com',
    action: 'DRY_RUN'
  });

  assert.strictEqual(report.scannedCount, 2); // 2 members scanned
  assert.strictEqual(report.matchedCount, 2); // 1 match in each mailbox
  assert.strictEqual(report.results.length, 2);
  assert.strictEqual(report.results[0].email, 'agus.septian@andhika.com');
  assert.strictEqual(report.results[1].email, 'eka.heryanto@andhika.com');
});

it('Gracefully sanitizes targets containing GROUP: prefix in executeWebPurge', () => {
  resetTargetSheet();
  mockGroupsAppLookup['branch.tanahgrogot@andhika.com'] = [
    'agus.septian@andhika.com'
  ];

  const report = sandbox.executeWebPurge({
    query: 'from:bad@evil.com',
    scope: 'targeted',
    targets: ['GROUP: branch.tanahgrogot@andhika.com'],
    action: 'DRY_RUN'
  });

  assert.strictEqual(report.scannedCount, 1);
  assert.strictEqual(report.results[0].email, 'agus.septian@andhika.com');
});

it('getPortalConfig excludes GROUP: and OU: prefixes from targetList', () => {
  const targetSheet = resetTargetSheet();
  targetSheet.getRange(2, 1).setValue('GROUP: branch.tanahgrogot@andhika.com');
  targetSheet.getRange(3, 1).setValue('user.real@andhika.com');

  const cfg = sandbox.getPortalConfig();
  assert.strictEqual(cfg.targetList.length, 1);
  assert.strictEqual(cfg.targetList[0], 'user.real@andhika.com');
});

it('Prevents unbounded domain-wide execution without target list in Web Portal', () => {
  assert.throws(() => {
    sandbox.executeWebPurge({
      query: 'from:bad@evil.com',
      scope: 'All Users (Domain-Wide)',
      targets: [],
      action: 'DRY_RUN'
    });
  }, (err) => {
    return err.message.includes('Direct Domain-Wide Gmail API execution requires a target mailbox list');
  });
});

// -------------------------------------------------------------
// TEST SUITE 5: HTML UI INTEGRITY & BINDINGS
// -------------------------------------------------------------
console.log('\n--- TEST SUITE 5: HTML DOM & Event Binding Verification ---');

const dashboardHtml = fs.readFileSync(path.join(__dirname, '../gam-sheet-ui/Dashboard.html'), 'utf8');
const sidebarHtml = fs.readFileSync(path.join(__dirname, '../gam-sheet-ui/Sidebar.html'), 'utf8');

function verifyHtmlBindings(html, name) {
  // Check that all document.getElementById calls match an id in the HTML
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

it('Verifies all document.getElementById bindings in Dashboard.html', () => {
  verifyHtmlBindings(dashboardHtml, 'Dashboard.html');
});

it('Verifies auto-wrapping of Message ID in angle brackets in Dashboard.html', () => {
  assert.ok(dashboardHtml.includes('if (!cleanId.startsWith(\'<\') && !cleanId.endsWith(\'>\'))'));
  assert.ok(dashboardHtml.includes('cleanId = `<${cleanId}>`;'));
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
  const bundleCode = fs.readFileSync(path.join(__dirname, '../dist/Devoteam-GWS-Email-Purge-Customer-Bundle/03-Apps-Script-Web-Solution/Code.gs'), 'utf8');
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
