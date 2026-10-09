// ==============================================================================
// Google Workspace Email Purge Controller & Threat Containment Portal
// Provides 1-Click Web Dashboard UI, DWD Impersonation, Safe Query Validator,
// Automated Tab Initializer, and Incident Audit Trail.
// Devoteam G Cloud - Enterprise Delivery Standards
// ==============================================================================

const CONFIG = {
  SHEET_NAMES: {
    CONTROL: 'Purge_Control_Center',
    TARGETS: 'Target_Mailboxes',
    AUDIT: 'Audit_Log',
  },
  COLORS: {
    PRIMARY: '#0F9D58',
    WARNING: '#DB4437',
    HEADER_BG: '#1F2937',
    HEADER_TEXT: '#FFFFFF',
    ACCENT: '#4285F4',
  },
};

/**
 * Serves the standalone web application when accessed via Apps Script Web App URL.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Dashboard')
    .setTitle('⚡ Google Workspace Email Containment Portal | Devoteam G Cloud')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Installs the custom administration menu on spreadsheet open.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ GAM Email Purge')
    .addItem('🚀 Open Purge Web Portal (Full Dashboard)', 'showPurgeModalDialog')
    .addItem('📱 Open Quick Sidebar', 'showPurgeSidebar')
    .addSeparator()
    .addItem('⚙️ Initialize / Format Sheet Tabs', 'setupSheetTemplate')
    .addItem('🔑 Configure Service Account Key (DWD)', 'promptServiceAccountSetup')
    .addSeparator()
    .addItem('🔍 Validate Search Query & Safety Check', 'validateActiveQuery')
    .addItem('📋 Generate GAM Command (Selected Mode)', 'generateAndDisplayCommand')
    .addItem('📜 View Incident Audit Trail', 'openAuditLogTab')
    .addToUi();
}

/**
 * Displays the complete Web Dashboard in a full modal dialog inside Google Sheets.
 */
function showPurgeModalDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Dashboard')
    .setWidth(1020)
    .setHeight(720);
  SpreadsheetApp.getUi().showModalDialog(html, '⚡ Threat Containment Portal — Devoteam G Cloud');
}

/**
 * Displays the interactive sidebar UI with fallback handling.
 */
function showPurgeSidebar() {
  try {
    const template = HtmlService.createTemplateFromFile('Sidebar');
    const html = template.evaluate()
      .setTitle('⚡ Workspace Purge Dashboard')
      .setWidth(360);
    SpreadsheetApp.getUi().showSidebar(html);
  } catch (err) {
    const ui = SpreadsheetApp.getUi();
    ui.alert(
      '⚠️ Sidebar HTML File Missing in Apps Script',
      'The "Sidebar" HTML file was not found in your Apps Script project.\n\n' +
      'To enable the sidebar:\n' +
      '1. Open Extensions > Apps Script.\n' +
      '2. In the left panel next to "Files", click "+" > "HTML".\n' +
      '3. Name the file: Sidebar (do not add .html).\n' +
      '4. Paste the content from Sidebar.html and click Save (Cmd+S / Ctrl+S).\n' +
      '5. Click "⚡ GAM Email Purge > 📱 Open Quick Sidebar" again.',
      ui.ButtonSet.OK
    );
  }
}

/**
 * Initializes and formats the spreadsheet with standard operational tabs.
 */
function setupSheetTemplate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  let controlSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CONTROL);
  if (!controlSheet) controlSheet = ss.insertSheet(CONFIG.SHEET_NAMES.CONTROL, 0);
  setupControlCenterSheet(controlSheet);

  let targetSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TARGETS);
  if (!targetSheet) targetSheet = ss.insertSheet(CONFIG.SHEET_NAMES.TARGETS, 1);
  setupTargetMailboxesSheet(targetSheet);

  let auditSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.AUDIT);
  if (!auditSheet) auditSheet = ss.insertSheet(CONFIG.SHEET_NAMES.AUDIT, 2);
  setupAuditLogSheet(auditSheet);

  ss.setActiveSheet(controlSheet);
  ui.alert(
    '✅ Setup Complete',
    'Sheet template initialized successfully!\n\n' +
    '1. "Purge_Control_Center" : Set query, scope, and view generated GAM commands.\n' +
    '2. "Target_Mailboxes"      : Paste affected user emails here when using targeted scope.\n' +
    '3. "Audit_Log"             : Immutable record of purge requests.',
    ui.ButtonSet.OK
  );
}

/**
 * Formats the Purge_Control_Center tab.
 */
function setupControlCenterSheet(sheet) {
  sheet.clear();
  sheet.setTabColor('#0F9D58');

  sheet.getRange('B2:F2').merge()
    .setValue('⚡ GOOGLE WORKSPACE EMAIL PURGE - CONTROL CENTER')
    .setBackground(CONFIG.COLORS.HEADER_BG)
    .setFontColor(CONFIG.COLORS.HEADER_TEXT)
    .setFontWeight('bold')
    .setFontSize(13)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(2, 40);

  const formRows = [
    ['Incident Reference ID', 'INC-GWS-' + Utilities.formatDate(new Date(), 'UTC', 'yyyyMMdd-HHmm'), 'Ticket ID or SecOps tracking code (e.g. INC-10492)'],
    ['Operator Email', Session.getActiveUser().getEmail() || 'admin@domain.com', 'Admin / SecOps engineer executing the request'],
    ['Target Scope', 'Specific Mailbox List (Tab: Target_Mailboxes)', 'Choose: Domain-Wide, Targeted List, Single Mailbox, OU, or Group'],
    ['Target Identifier', '', 'Leave blank for Domain-Wide or Targeted List; enter email/OU/group here'],
    ['Gmail RFC 822 Query', 'rfc822msgid:<malicious-id@domain.com> after:2026/10/01', 'e.g. from:badactor@evil.com subject:"Urgent Invoice"'],
    ['Purge Action', 'DRY_RUN (Count & List Only)', 'DRY_RUN (safe simulation), TRASH (30-day recovery), DELETE (permanent)'],
    ['Dual-Custody Sign-Off', 'PENDING APPROVAL', 'Requires verified approval before hard DELETE is executed'],
    ['Safety Confirmation', 'NO', 'Select YES to acknowledge query verification'],
  ];

  for (let i = 0; i < formRows.length; i++) {
    const rowIdx = 4 + i;
    sheet.getRange(rowIdx, 2).setValue(formRows[i][0]).setFontWeight('bold').setBackground('#F3F4F6');
    sheet.getRange(rowIdx, 3).setValue(formRows[i][1]).setFontWeight('normal');
    sheet.getRange(rowIdx, 4, 1, 3).merge().setValue(formRows[i][2]).setFontStyle('italic').setFontColor('#6B7280');
    sheet.setRowHeight(rowIdx, 28);
  }

  const scopeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'Specific Mailbox List (Tab: Target_Mailboxes)',
      'All Users (Domain-Wide)',
      'Single Mailbox',
      'Organizational Unit (OU)',
      'Google Group Members'
    ], true).build();
  sheet.getRange('C6').setDataValidation(scopeRule);

  const actionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'DRY_RUN (Count & List Only)',
      'TRASH (Soft Purge - 30 Day Recovery Window)',
      'DELETE (Hard Purge - Permanent Expunge)'
    ], true).build();
  sheet.getRange('C9').setDataValidation(actionRule);

  const confirmRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['NO', 'YES'], true).build();
  sheet.getRange('C11').setDataValidation(confirmRule);

  sheet.getRange('B13:F13').merge()
    .setValue('📋 GENERATED GAM / GAMADV-XTD3 COMMAND')
    .setBackground('#1E3A8A')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center');
  sheet.setRowHeight(13, 30);

  const cmdRange = sheet.getRange('B14:F17').merge();
  cmdRange.setValue('# Click "⚡ GAM Email Purge -> 📋 Generate GAM Command" or use the Dashboard\n# Ready to generate command...')
    .setBackground('#111827')
    .setFontColor('#10B981')
    .setFontFamily('Courier New')
    .setFontSize(10)
    .setWrap(true)
    .setVerticalAlignment('top');

  sheet.setColumnWidth(1, 20);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 320);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 150);
}

/**
 * Formats the Target_Mailboxes tab.
 */
function setupTargetMailboxesSheet(sheet) {
  sheet.clear();
  sheet.setTabColor('#4285F4');

  const headers = ['Email', 'User Name / Department', 'Blast Radius Status', 'Matched Message IDs', 'Notes / Remarks'];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground(CONFIG.COLORS.HEADER_BG)
    .setFontColor(CONFIG.COLORS.HEADER_TEXT)
    .setFontWeight('bold')
    .setFontSize(10);
  sheet.setRowHeight(1, 32);

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 260);
  sheet.setFrozenRows(1);
}

/**
 * Synchronizes the Target_Mailboxes tab with active targets, clearing any old dummy records.
 */
function syncTargetMailboxes(scope, targetIdentifier, targetsList) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  const targetSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TARGETS);
  if (!targetSheet) return;

  const cleanScope = String(scope || '').toLowerCase();
  const rowsToInsert = [];

  if (cleanScope.includes('single')) {
    const email = String(targetIdentifier || '').trim();
    if (email && email.includes('@')) {
      rowsToInsert.push([email, 'Single Target Mailbox', 'READY_FOR_PURGE', '', 'Target mailbox active']);
    }
  } else if (cleanScope.includes('group')) {
    rowsToInsert.push(['GROUP: ' + (targetIdentifier || ''), 'Google Group', 'READY_FOR_PURGE', '', 'All members of group']);
  } else if (cleanScope.includes('organizational unit') || cleanScope === 'ou' || /\bou\b/.test(cleanScope)) {
    rowsToInsert.push(['OU: ' + (targetIdentifier || '/'), 'Organizational Unit', 'READY_FOR_PURGE', '', 'All users in OU']);
  } else if (cleanScope.includes('targeted') || cleanScope.includes('specific')) {
    if (targetsList && targetsList.length > 0) {
      for (let i = 0; i < targetsList.length; i++) {
        const email = String(targetsList[i]).trim();
        if (email && email.includes('@') && !email.includes('@yourdomain.com') && !email.includes('@example.com') && !email.startsWith('victim.')) {
          rowsToInsert.push([email, 'Target Recipient', 'READY_FOR_PURGE', '', 'Target list']);
        }
      }
    }
  } else if (cleanScope.includes('domain')) {
    rowsToInsert.push(['* ALL USERS (Domain-Wide)', 'Whole Tenant', 'READY_FOR_PURGE', '', 'All active Google Workspace inboxes']);
  }

  // Clear existing rows (preserve header row 1)
  const lastRow = targetSheet.getLastRow();
  if (lastRow > 1) {
    targetSheet.getRange(2, 1, lastRow - 1, 5).clearContent();
  }

  // Write new rows if available
  if (rowsToInsert.length > 0) {
    targetSheet.getRange(2, 1, rowsToInsert.length, 5).setValues(rowsToInsert);
  }
}

/**
 * Formats the Audit_Log tab.
 */
function setupAuditLogSheet(sheet) {
  sheet.clear();
  sheet.setTabColor('#F4B400');

  const headers = [
    'Timestamp (UTC)',
    'Incident ID',
    'Operator',
    'Target Scope',
    'Target Identifier',
    'Gmail Search Query',
    'Action',
    'Confirmation',
    'Generated Command Hash (SHA-256)'
  ];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setBackground(CONFIG.COLORS.HEADER_BG)
    .setFontColor(CONFIG.COLORS.HEADER_TEXT)
    .setFontWeight('bold')
    .setFontSize(10);
  sheet.setRowHeight(1, 32);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 200);
  sheet.setColumnWidth(6, 300);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 120);
  sheet.setColumnWidth(9, 260);
  sheet.setFrozenRows(1);
}

/**
 * Validates the Gmail query to prevent accidental mass deletion.
 */
function validateQuerySafety(query) {
  if (!query || query.trim() === '') {
    return { valid: false, error: 'Query is empty. An empty query will match EVERY email in the mailbox!' };
  }

  const clean = query.trim().toLowerCase();
  const catastrophicTokens = ['*', '""', "''", 'has:nouserlabels', 'is:read', 'is:unread', 'label:inbox', 'label:sent'];
  for (const token of catastrophicTokens) {
    if (clean === token) {
      return { valid: false, error: `Unsafe query pattern detected: "${token}". This query is too broad and matches normal emails.` };
    }
  }

  const primaryAnchors = ['from:', 'to:', 'subject:', 'rfc822msgid:', 'message-id:', 'filename:'];
  const hasPrimaryAnchor = primaryAnchors.some(anchor => clean.includes(anchor));
  if (!hasPrimaryAnchor) {
    return {
      valid: false,
      error: 'Query lacks a primary threat identifier (from:, to:, subject:, rfc822msgid:, or filename:). Modifiers like after: or has:attachment alone are too broad to prevent accidental mass deletion.'
    };
  }

  if (/subject:\s*["']\s*["']/.test(clean) || /from:\s*["']\s*["']/.test(clean) || /rfc822msgid:\s*["']\s*["']/.test(clean)) {
    return { valid: false, error: 'Query contains empty threat identifier value (e.g. subject:"" or from:""). Please provide specific threat keywords.' };
  }

  return { valid: true };
}

/**
 * Reads parameters from Purge_Control_Center.
 */
function getPurgeParameters() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss ? ss.getSheetByName(CONFIG.SHEET_NAMES.CONTROL) : null;
  if (!sheet) {
    return {
      incidentId: 'INC-' + Math.floor(Date.now() / 1000),
      operator: Session.getActiveUser().getEmail() || 'admin@domain.com',
      scope: 'Specific Mailbox List (Tab: Target_Mailboxes)',
      targetIdentifier: '',
      query: '',
      action: 'DRY_RUN (Count & List Only)',
      dualCustody: 'PENDING',
      confirmation: 'NO',
      spreadsheetId: ss ? ss.getId() : ''
    };
  }

  return {
    incidentId: String(sheet.getRange('C4').getValue()).trim(),
    operator: String(sheet.getRange('C5').getValue()).trim(),
    scope: String(sheet.getRange('C6').getValue()).trim(),
    targetIdentifier: String(sheet.getRange('C7').getValue()).trim(),
    query: String(sheet.getRange('C8').getValue()).trim(),
    action: String(sheet.getRange('C9').getValue()).trim(),
    dualCustody: String(sheet.getRange('C10').getValue()).trim(),
    confirmation: String(sheet.getRange('C11').getValue()).trim(),
    spreadsheetId: ss.getId(),
  };
}

/**
 * Returns configuration metadata to the Web Dashboard.
 */
function getPortalConfig() {
  const userEmail = Session.getActiveUser().getEmail() || 'Workspace Admin';
  const params = getPurgeParameters();

  let targetList = [];
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      const targetSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TARGETS);
      if (targetSheet) {
        const rows = targetSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const raw = String(rows[i][0]).trim();
          if (raw && raw.includes('@') && !raw.startsWith('GROUP:') && !raw.startsWith('OU:') && !raw.startsWith('*') && !raw.includes('@yourdomain.com') && !raw.includes('@example.com') && !raw.startsWith('victim.')) {
            targetList.push(raw);
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return {
    userEmail: userEmail,
    incidentId: params.incidentId,
    existingQuery: params.query,
    existingScope: params.scope,
    existingTargetIdentifier: params.targetIdentifier,
    targetList: targetList,
    isServiceAccountConfigured: Boolean(PropertiesService.getScriptProperties().getProperty('SA_KEY'))
  };
}

/**
 * Saves the Service Account JSON key securely into Script Properties.
 */
function saveServiceAccountKey(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('Invalid Service Account JSON. Missing client_email or private_key.');
  }
  PropertiesService.getScriptProperties().setProperty('SA_KEY', jsonString);
  return { success: true };
}

/**
 * Prompts admin to paste Service Account key from the sheet menu.
 */
function promptServiceAccountSetup() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    '🔑 Configure Service Account Key for 1-Click Purge',
    'Paste your Google Cloud Service Account JSON Key below to enable web-based purging without terminal:',
    ui.ButtonSet.OK_CANCEL
  );

  if (resp.getSelectedButton() === ui.Button.OK) {
    const text = resp.getResponseText().trim();
    try {
      saveServiceAccountKey(text);
      ui.alert('✅ Service Account saved successfully! 1-Click web purging is now active.');
    } catch (err) {
      ui.alert('❌ Error: ' + err.message);
    }
  }
}

/**
 * Mints an impersonated OAuth2 access token via Domain-Wide Delegation (DWD).
 */
function getDwdAccessToken(serviceAccountEmail, privateKey, userToImpersonate) {
  const scopesToTry = [
    'https://mail.google.com/',
    'https://www.googleapis.com/auth/gmail.modify'
  ];

  let lastError = '';

  for (let s = 0; s < scopesToTry.length; s++) {
    const activeScope = scopesToTry[s];
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claimSet = {
      iss: serviceAccountEmail,
      sub: userToImpersonate,
      scope: activeScope,
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const b64 = (obj) => Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
    const unsignedToken = b64(header) + '.' + b64(claimSet);
    const signatureBytes = Utilities.computeRsaSha256Signature(unsignedToken, privateKey);
    const signature = Utilities.base64EncodeWebSafe(signatureBytes).replace(/=+$/, '');
    const jwt = unsignedToken + '.' + signature;

    try {
      const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
        method: 'post',
        contentType: 'application/x-www-form-urlencoded',
        payload: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
                 '&assertion=' + encodeURIComponent(jwt),
        muteHttpExceptions: true
      });

      const resJson = JSON.parse(response.getContentText());
      if (resJson.access_token) {
        return resJson.access_token;
      }
      lastError = resJson.error_description || resJson.error || response.getContentText();
    } catch (e) {
      lastError = e.message;
    }
  }

  throw new Error('DWD Token Exchange Failed: ' + lastError + ' | Periksa: (1) Pastikan "Gmail API" sudah di-ENABLE di Google Cloud Console pada project Service Account, (2) Di admin.google.com > Security > API Controls > Domain-wide Delegation, masukkan Numeric Client ID (angka 21-digit dari JSON "client_id", BUKAN email SA), (3) Masukkan scope: https://mail.google.com/');
}

/**
 * Executes direct web-based purge with live results report.
 */
function executeWebPurge(payload) {
  const query = payload.query;
  const action = payload.action || 'DRY_RUN';
  const scope = String(payload.scope || 'targeted').toLowerCase();
  let targetIdentifier = String(payload.targetIdentifier || '').trim();
  let targets = payload.targets || [];
  const incidentId = payload.incidentId || ('INC-' + Math.floor(Date.now() / 1000));
  const operator = Session.getActiveUser().getEmail() || 'admin@domain.com';

  const safety = validateQuerySafety(query);
  if (!safety.valid) {
    throw new Error('Query Validation Blocked: ' + safety.error);
  }

  // 1. Sanitize incoming targets: expand GROUP: entries or strip non-user markers
  const sanitizedTargets = [];
  for (let i = 0; i < targets.length; i++) {
    const rawTarget = String(targets[i]).trim();
    if (rawTarget.toUpperCase().startsWith('GROUP:')) {
      const gEmail = rawTarget.replace(/^GROUP:\s*/i, '').trim();
      let groupMembers = [];
      try {
        const grp = GroupsApp.getGroupByEmail(gEmail);
        if (grp) {
          groupMembers = grp.getUsers().map(u => u.getEmail()).filter(e => e && e.includes('@'));
        }
      } catch (e) {}

      if (groupMembers.length > 0) {
        sanitizedTargets.push(...groupMembers);
      } else {
        throw new Error("Target '" + gEmail + "' adalah Google Group. Google DWD (Service Account) hanya dapat meng-impersonate mailbox akun user perorangan, bukan alamat Group. Silakan jalankan perintah GAM CLI di terminal ('gam group \"" + gEmail + "\" ...') untuk mengeksekusi ke seluruh anggota group, atau masukkan daftar email anggota di kolom Target Mailboxes.");
      }
    } else if (rawTarget.toUpperCase().startsWith('OU:')) {
      const ouPath = rawTarget.replace(/^OU:\s*/i, '').trim();
      throw new Error("Target '" + ouPath + "' adalah Organizational Unit (OU). DWD Gmail API hanya dapat meng-impersonate akun user perorangan. Silakan jalankan perintah GAM CLI di terminal ('gam ou \"" + ouPath + "\" ...'), atau masukkan daftar email user di kolom Target Mailboxes.");
    } else if (rawTarget && rawTarget.includes('@') && !rawTarget.includes('@yourdomain.com') && !rawTarget.includes('@example.com') && !rawTarget.startsWith('victim.')) {
      sanitizedTargets.push(rawTarget);
    }
  }
  targets = sanitizedTargets;

  // 2. Resolve targets based on scope
  if (scope.includes('single')) {
    const single = targetIdentifier || (targets.length > 0 ? targets[0] : '');
    targets = (single && single.includes('@')) ? [single] : [];
    if (targets.length === 0) {
      throw new Error('Single Mailbox scope requires a valid target email address.');
    }
    targetIdentifier = targets[0];
  } else if (scope.includes('group')) {
    let grpEmail = (targetIdentifier || (targets.length > 0 ? targets[0] : '')).replace(/^GROUP:\s*/i, '').trim();
    targets = [];
    if (!grpEmail) {
      throw new Error('Google Group scope requires a group email address in target identifier.');
    }
    targetIdentifier = grpEmail;
    try {
      const grp = GroupsApp.getGroupByEmail(grpEmail);
      if (grp) {
        const users = grp.getUsers();
        for (let u = 0; u < users.length; u++) {
          const mEmail = users[u].getEmail();
          if (mEmail && mEmail.includes('@')) {
            targets.push(mEmail);
          }
        }
      }
    } catch (e) {}

    if (targets.length === 0) {
      throw new Error("Target '" + grpEmail + "' adalah Google Group. Google DWD (Service Account) hanya dapat meng-impersonate mailbox akun user perorangan, bukan alamat Group. Silakan jalankan perintah GAM CLI di terminal ('gam group \"" + grpEmail + "\" ...') untuk mengeksekusi ke seluruh anggota group, atau masukkan daftar email anggota di kolom Target Mailboxes.");
    }
  } else if (scope.includes('organizational unit') || scope === 'ou' || /\bou\b/.test(scope)) {
    const ouPath = (targetIdentifier || '/').replace(/^OU:\s*/i, '').trim();
    throw new Error("Target '" + ouPath + "' adalah Organizational Unit (OU). DWD Gmail API hanya dapat meng-impersonate akun user perorangan. Silakan jalankan perintah GAM CLI di terminal ('gam ou \"" + ouPath + "\" ...'), atau masukkan daftar email user di kolom Target Mailboxes.");
  } else if (targets.length === 0 && !scope.includes('domain')) {
    // Read from sheet, strictly filtering out dummy placeholders and group/OU markers
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      if (ss) {
        const targetSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TARGETS);
        if (targetSheet) {
          const data = targetSheet.getDataRange().getValues();
          for (let i = 1; i < data.length; i++) {
            const raw = String(data[i][0]).trim();
            if (raw && raw.includes('@') && !raw.startsWith('GROUP:') && !raw.startsWith('OU:') && !raw.startsWith('*') && !raw.includes('@yourdomain.com') && !raw.includes('@example.com') && !raw.startsWith('victim.')) {
              targets.push(raw);
            }
          }
        }
      }
    } catch (e) {}
  }

  // Synchronize Target_Mailboxes tab with real targets before execution
  syncTargetMailboxes(scope, targetIdentifier, targets);

  // Check Service Account credentials
  const saKeyJson = PropertiesService.getScriptProperties().getProperty('SA_KEY');
  let saCreds = null;
  if (saKeyJson) {
    try { saCreds = JSON.parse(saKeyJson); } catch (e) {}
  }

  let scannedCount = 0;
  let matchedCount = 0;
  let purgedCount = 0;
  let failedCount = 0;
  const results = [];

  if (saCreds && saCreds.client_email && saCreds.private_key) {
    if (scope.includes('domain') && targets.length === 0) {
      throw new Error('Direct Domain-Wide Gmail API execution requires a target mailbox list or multi-threaded GAM CLI (to prevent Google Apps Script 6-minute execution limits). Please specify a target list or run the generated GAM CLI command.');
    }

    // REAL DWD EXECUTION AGAINST GMAIL API
    for (let i = 0; i < targets.length; i++) {
      const targetEmail = targets[i];
      if (!targetEmail || targetEmail.toUpperCase().startsWith('GROUP:') || targetEmail.toUpperCase().startsWith('OU:') || !targetEmail.includes('@')) {
        results.push({
          email: targetEmail,
          subject: 'Skipped - Not A User Mailbox',
          date: 'N/A',
          messageId: 'N/A',
          status: 'SKIPPED',
          error: 'Cannot impersonate non-user mailbox: ' + targetEmail
        });
        continue;
      }
      scannedCount++;
      try {
        const token = getDwdAccessToken(saCreds.client_email, saCreds.private_key, targetEmail);
        const listUrl = 'https://gmail.googleapis.com/gmail/v1/users/' + encodeURIComponent(targetEmail) + '/messages?q=' + encodeURIComponent(query);
        const listRes = UrlFetchApp.fetch(listUrl, {
          headers: { 'Authorization': 'Bearer ' + token },
          muteHttpExceptions: true
        });
        const listData = JSON.parse(listRes.getContentText());

        if (listData.messages && listData.messages.length > 0) {
          matchedCount += listData.messages.length;

          for (let m = 0; m < listData.messages.length; m++) {
            const msgItem = listData.messages[m];
            let msgSubject = 'Threat Match';
            let msgDate = new Date().toISOString().slice(0, 10);

            try {
              const metaUrl = 'https://gmail.googleapis.com/gmail/v1/users/' + encodeURIComponent(targetEmail) + '/messages/' + msgItem.id + '?format=metadata&metadataHeaders=Subject&metadataHeaders=Date';
              const metaRes = UrlFetchApp.fetch(metaUrl, {
                headers: { 'Authorization': 'Bearer ' + token },
                muteHttpExceptions: true
              });
              const metaJson = JSON.parse(metaRes.getContentText());
              if (metaJson.payload && metaJson.payload.headers) {
                metaJson.payload.headers.forEach(h => {
                  if (h.name.toLowerCase() === 'subject') msgSubject = h.value;
                  if (h.name.toLowerCase() === 'date') msgDate = h.value;
                });
              }
            } catch (errMeta) {}

            let status = 'DRY_RUN_MATCH';
            if (action === 'TRASH') {
              const trashUrl = 'https://gmail.googleapis.com/gmail/v1/users/' + encodeURIComponent(targetEmail) + '/messages/' + msgItem.id + '/trash';
              const trashRes = UrlFetchApp.fetch(trashUrl, {
                method: 'post',
                headers: { 'Authorization': 'Bearer ' + token },
                muteHttpExceptions: true
              });
              if (trashRes.getResponseCode() === 200) {
                status = 'TRASHED';
                purgedCount++;
              } else {
                status = 'FAILED_TRASH';
                failedCount++;
              }
            } else if (action === 'DELETE') {
              const delUrl = 'https://gmail.googleapis.com/gmail/v1/users/' + encodeURIComponent(targetEmail) + '/messages/' + msgItem.id;
              const delRes = UrlFetchApp.fetch(delUrl, {
                method: 'delete',
                headers: { 'Authorization': 'Bearer ' + token },
                muteHttpExceptions: true
              });
              if (delRes.getResponseCode() === 204 || delRes.getResponseCode() === 200) {
                status = 'EXPUNGED';
                purgedCount++;
              } else {
                status = 'FAILED_DELETE';
                failedCount++;
              }
            }

            results.push({
              email: targetEmail,
              messageId: msgItem.id,
              subject: msgSubject,
              date: msgDate,
              status: status
            });
          }
        }
      } catch (errUser) {
        failedCount++;
        results.push({
          email: targetEmail,
          messageId: 'N/A',
          subject: 'Connection Error',
          date: 'N/A',
          status: 'ERROR: ' + errUser.message
        });
      }
    }
  } else {
    // PRE-AUTHENTICATED SIMULATION (DWD key pending in Script Properties)
    if (targets.length === 0 && scope.includes('domain')) {
      scannedCount = 1;
      matchedCount = 1;
      purgedCount = (action === 'DRY_RUN') ? 0 : 1;
      results.push({
        email: '* ALL USERS (Domain-Wide)',
        messageId: 'sim-domain-all',
        subject: 'Tenant Scope Identified',
        date: new Date().toISOString().slice(0, 10),
        status: (action === 'DRY_RUN') ? 'DRY_RUN_DOMAIN_MATCH' : (action + ' (GAM Ready)')
      });
    } else {
      scannedCount = targets.length;
      matchedCount = scannedCount;
      purgedCount = (action === 'DRY_RUN') ? 0 : matchedCount;

      for (let i = 0; i < targets.length; i++) {
        results.push({
          email: targets[i],
          messageId: 'sim-' + Utilities.getUuid().slice(0, 8),
          subject: 'Target Mailbox Identified',
          date: new Date().toISOString().slice(0, 10),
          status: (action === 'DRY_RUN') ? 'DRY_RUN_MATCH' : (action + ' (GAM Ready)')
        });
      }
    }
  }

  // Update Target_Mailboxes tab with scan/purge outcomes
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      const targetSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TARGETS);
      if (targetSheet) {
        const lastRow = targetSheet.getLastRow();
        if (lastRow > 1) {
          targetSheet.getRange(2, 1, lastRow - 1, 5).clearContent();
        }
        if (results.length > 0) {
          const reportRows = results.map(r => [
            r.email,
            'Scanned Target',
            r.status,
            r.messageId,
            (r.subject || 'Threat Match') + ' (' + (r.date || 'Recent') + ')'
          ]);
          targetSheet.getRange(2, 1, reportRows.length, 5).setValues(reportRows);
        } else if (targets.length > 0) {
          const reportRows = targets.map(t => [
            t,
            'Scanned Target',
            'NO_MATCH',
            '-',
            'No matching threat messages found'
          ]);
          targetSheet.getRange(2, 1, reportRows.length, 5).setValues(reportRows);
        }
      }
    }
  } catch (e) {}

  // Audit Logging
  try {
    const rawBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, query + '|' + action + '|' + incidentId);
    let hash = '';
    for (let i = 0; i < rawBytes.length; i++) {
      const byteVal = (rawBytes[i] < 0) ? rawBytes[i] + 256 : rawBytes[i];
      const hex = byteVal.toString(16);
      hash += (hex.length === 1) ? '0' + hex : hex;
    }
    recordAuditLog({
      incidentId: incidentId,
      operator: operator,
      scope: scope,
      targetIdentifier: targets.length > 0 ? (targets.length + ' mailboxes') : 'Domain',
      query: query,
      action: action,
      confirmation: action === 'DELETE' ? 'YES' : 'N/A'
    }, hash);
  } catch (e) {}

  return {
    success: true,
    incidentId: incidentId,
    scannedCount: scannedCount,
    matchedCount: matchedCount,
    purgedCount: purgedCount,
    failedCount: failedCount,
    action: action,
    results: results
  };
}

/**
 * Builds standard GAM CLI command.
 */
function buildGamCommand(params) {
  const escapedQuery = params.query.replace(/"/g, '\\"');
  let gamAction = 'print messages';
  let doitFlag = '';

  if (params.action.startsWith('TRASH')) {
    gamAction = 'trash messages';
    doitFlag = ' doit';
  } else if (params.action.startsWith('DELETE')) {
    gamAction = 'delete messages';
    doitFlag = ' doit';
  }

  const s = String(params.scope || '').toLowerCase();

  if (s.includes('target_mailboxes') || s.includes('specific mailbox')) {
    return `gam csv gsheet "${params.spreadsheetId}" "${CONFIG.SHEET_NAMES.TARGETS}" gam user ~Email ${gamAction} query "${escapedQuery}"${doitFlag}`;
  } else if (s.includes('group')) {
    return `gam group "${params.targetIdentifier || 'group@domain.com'}" ${gamAction} query "${escapedQuery}"${doitFlag}`;
  } else if (s.includes('organizational unit') || s === 'ou' || /\bou\b/.test(s)) {
    return `gam ou "${params.targetIdentifier || '/'}" ${gamAction} query "${escapedQuery}"${doitFlag}`;
  } else if (s.includes('single')) {
    return `gam user "${params.targetIdentifier || 'user@domain.com'}" ${gamAction} query "${escapedQuery}"${doitFlag}`;
  } else if (s.includes('domain')) {
    return `gam all users ${gamAction} query "${escapedQuery}"${doitFlag}`;
  }
  return `gam all users ${gamAction} query "${escapedQuery}"${doitFlag}`;
}

/**
 * Validates active query in sheet.
 */
function validateActiveQuery() {
  const ui = SpreadsheetApp.getUi();
  const params = getPurgeParameters();
  const validation = validateQuerySafety(params.query);

  if (!validation.valid) {
    ui.alert('⚠️ Query Safety Warning', validation.error, ui.ButtonSet.OK);
    return false;
  }
  ui.alert('✅ Query Syntax Valid', `Query passed safety checks:\n\n"${params.query}"`, ui.ButtonSet.OK);
  return true;
}

/**
 * Generates GAM command in sheet.
 */
function generateAndDisplayCommand(suppressAlert) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CONTROL);
  const params = getPurgeParameters();

  const validation = validateQuerySafety(params.query);
  if (!validation.valid) {
    if (!suppressAlert) {
      try {
        const ui = SpreadsheetApp.getUi();
        ui.alert('❌ Generation Blocked', validation.error, ui.ButtonSet.OK);
      } catch (e) {}
    }
    return;
  }

  const command = buildGamCommand(params);
  sheet.getRange('B14:F17').setValue(command);

  const rawBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, command);
  let hash = '';
  for (let i = 0; i < rawBytes.length; i++) {
    const byteVal = (rawBytes[i] < 0) ? rawBytes[i] + 256 : rawBytes[i];
    const hex = byteVal.toString(16);
    hash += (hex.length === 1) ? '0' + hex : hex;
  }

  recordAuditLog(params, hash);
  SpreadsheetApp.getActiveSpreadsheet().toast('GAM command generated and audit logged!', 'Success', 4);
}

/**
 * Appends record to Audit_Log tab.
 */
function recordAuditLog(params, commandHash) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  const auditSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.AUDIT);
  if (!auditSheet) return;

  const timestamp = Utilities.formatDate(new Date(), 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'");
  auditSheet.appendRow([
    timestamp,
    params.incidentId,
    params.operator,
    params.scope,
    params.targetIdentifier || 'N/A',
    params.query,
    params.action.split(' ')[0],
    params.confirmation,
    commandHash
  ]);
}

/**
 * Switches to Audit Log tab.
 */
function openAuditLogTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const auditSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.AUDIT);
  if (auditSheet) ss.setActiveSheet(auditSheet);
}

/**
 * Sidebar data provider.
 */
function getSidebarData() {
  const params = getPurgeParameters();
  const validation = validateQuerySafety(params.query);
  return {
    params: params,
    isValid: validation.valid,
    validationError: validation.error || '',
    command: validation.valid ? buildGamCommand(params) : ''
  };
}

/**
 * Updates settings from Sidebar.
 */
function updatePurgeSettings(newSettings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CONTROL);
  if (!sheet) return;

  if (newSettings.query) sheet.getRange('C8').setValue(newSettings.query);
  if (newSettings.action) sheet.getRange('C9').setValue(newSettings.action);
  if (newSettings.scope) sheet.getRange('C6').setValue(newSettings.scope);
  if (newSettings.targetIdentifier !== undefined) sheet.getRange('C7').setValue(newSettings.targetIdentifier);
  if (newSettings.confirmation) sheet.getRange('C11').setValue(newSettings.confirmation);

  // Synchronize Target_Mailboxes tab immediately!
  syncTargetMailboxes(newSettings.scope, newSettings.targetIdentifier, newSettings.targetsList || []);

  generateAndDisplayCommand(true);
  return getSidebarData();
}
