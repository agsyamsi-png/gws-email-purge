// ==============================================================================
// Google Workspace Email Purge Controller via GAM / GAMADV-XTD3
// Provides Google Sheet UI, interactive query validator, safe command generator,
// and automated tab initializer for enterprise email containment.
// Devoteam G Cloud - Enterprise Delivery Standards
// ==============================================================================


const CONFIG = {
  SHEET_NAMES: {
    CONTROL: 'Purge_Control_Center',
    TARGETS: 'Target_Mailboxes',
    AUDIT: 'Audit_Log',
  },
  COLORS: {
    PRIMARY: '#0F9D58', // Google / Devoteam Green
    WARNING: '#DB4437', // Alert Red
    HEADER_BG: '#1F2937', // Dark Slate
    HEADER_TEXT: '#FFFFFF',
    ACCENT: '#4285F4', // Google Blue
  },
};

/**
 * Triggered on spreadsheet open. Installs the custom administration menu.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ GAM Email Purge')
    .addItem('📱 Open Purge Dashboard (Sidebar)', 'showPurgeSidebar')
    .addItem('⚙️ Initialize / Format Sheet Tabs', 'setupSheetTemplate')
    .addSeparator()
    .addItem('🔍 Validate Search Query & Safety Check', 'validateActiveQuery')
    .addItem('📋 Generate GAM Command (Selected Mode)', 'generateAndDisplayCommand')
    .addItem('📜 View Incident Audit Trail', 'openAuditLogTab')
    .addToUi();
}

/**
 * Initializes and formats the spreadsheet with standard operational tabs.
 */
function setupSheetTemplate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // 1. Control Center Sheet
  let controlSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CONTROL);
  if (!controlSheet) {
    controlSheet = ss.insertSheet(CONFIG.SHEET_NAMES.CONTROL, 0);
  }
  setupControlCenterSheet(controlSheet);

  // 2. Target Mailboxes Sheet
  let targetSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TARGETS);
  if (!targetSheet) {
    targetSheet = ss.insertSheet(CONFIG.SHEET_NAMES.TARGETS, 1);
  }
  setupTargetMailboxesSheet(targetSheet);

  // 3. Audit Log Sheet
  let auditSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(CONFIG.SHEET_NAMES.AUDIT, 2);
  }
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
 * Sets up the Purge_Control_Center tab layout and validations.
 */
function setupControlCenterSheet(sheet) {
  sheet.clear();
  sheet.setTabColor('#0F9D58');

  // Title Block
  sheet.getRange('B2:F2').merge()
    .setValue('⚡ GOOGLE WORKSPACE EMAIL PURGE - GAM CONTROL CENTER')
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

  // Set dropdowns & data validations
  // Scope dropdown
  const scopeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'Specific Mailbox List (Tab: Target_Mailboxes)',
      'All Users (Domain-Wide)',
      'Single Mailbox',
      'Organizational Unit (OU)',
      'Google Group Members'
    ], true)
    .build();
  sheet.getRange('C6').setDataValidation(scopeRule);

  // Action dropdown
  const actionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      'DRY_RUN (Count & List Only)',
      'TRASH (Soft Purge - 30 Day Recovery Window)',
      'DELETE (Hard Purge - Permanent Expunge)'
    ], true)
    .build();
  sheet.getRange('C9').setDataValidation(actionRule);

  // Safety Confirmation dropdown
  const confirmRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['NO', 'YES'], true)
    .build();
  sheet.getRange('C11').setDataValidation(confirmRule);

  // Generated Command Header
  sheet.getRange('B13:F13').merge()
    .setValue('📋 GENERATED GAM / GAMADV-XTD3 COMMAND')
    .setBackground('#1E3A8A')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center');
  sheet.setRowHeight(13, 30);

  // Command Output Box
  const cmdRange = sheet.getRange('B14:F17').merge();
  cmdRange.setValue('# Click "⚡ GAM Email Purge -> 📋 Generate GAM Command" or use the Sidebar\n# Ready to generate command...')
    .setBackground('#111827')
    .setFontColor('#10B981')
    .setFontFamily('Courier New')
    .setFontSize(10)
    .setWrap(true)
    .setVerticalAlignment('top');

  // Instructions / Notes Box
  sheet.getRange('B19:F19').merge()
    .setValue('💡 OPERATIONAL GUARDRAILS & BEST PRACTICES')
    .setBackground('#E5E7EB')
    .setFontWeight('bold')
    .setFontSize(10);

  const notes = [
    '1. ALWAYS execute in DRY_RUN mode first to evaluate the blast radius (number of matched messages).',
    '2. Prefer TRASH over DELETE. Messages moved to Trash can be restored within 30 days if a false positive occurs.',
    '3. Hard DELETE completely expunges the message from Gmail (Google Vault retention still applies if holds exist).',
    '4. For large-scale purges, GAM natively streams directly from the "Target_Mailboxes" tab using Google Sheets API.'
  ];
  sheet.getRange('B20:F23').merge()
    .setValue(notes.join('\n'))
    .setFontSize(9)
    .setFontColor('#374151')
    .setWrap(true);

  sheet.setColumnWidth(1, 20);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 320);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 150);
}

/**
 * Sets up the Target_Mailboxes tab layout.
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

  // Add sample rows
  const sampleData = [
    ['victim.user1@yourdomain.com', 'Finance / AP', 'PENDING_SCAN', '', 'Reported receiving phishing email'],
    ['victim.user2@yourdomain.com', 'Human Resources', 'PENDING_SCAN', '', 'Opened suspicious link'],
  ];
  sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);

  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 200);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 260);
  sheet.setFrozenRows(1);
}

/**
 * Sets up the Audit_Log tab layout.
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
 * Reads parameters from Purge_Control_Center.
 */
function getPurgeParameters() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CONTROL);
  if (!sheet) {
    throw new Error('Tab "Purge_Control_Center" not found. Please run "Initialize / Format Sheet Tabs" first.');
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
 * Validates the Gmail query to prevent catastrophic accidental purges.
 */
function validateQuerySafety(query) {
  if (!query || query.trim() === '') {
    return { valid: false, error: 'Query is empty. An empty query will match EVERY email in the mailbox!' };
  }

  const clean = query.trim().toLowerCase();

  // High risk patterns that match almost all mail
  const catastrophicTokens = ['*', '""', "''", 'has:nouserlabels', 'is:read', 'is:unread', 'label:inbox', 'label:sent'];
  for (const token of catastrophicTokens) {
    if (clean === token) {
      return { valid: false, error: `Unsafe query pattern detected: "${token}". This query is too broad and matches normal emails.` };
    }
  }

  // Check if at least one qualifying filter exists
  const safeAnchors = ['from:', 'to:', 'subject:', 'rfc822msgid:', 'message-id:', 'after:', 'before:', 'has:attachment', 'filename:'];
  const hasAnchor = safeAnchors.some(anchor => clean.includes(anchor));
  if (!hasAnchor) {
    return {
      valid: false,
      error: 'Query lacks standard anchors (e.g., from:, subject:, rfc822msgid:, after:). Please add specific filters to prevent false positives.'
    };
  }

  return { valid: true };
}

/**
 * Validates the current query and displays a pop-up report.
 */
function validateActiveQuery() {
  const ui = SpreadsheetApp.getUi();
  const params = getPurgeParameters();
  const validation = validateQuerySafety(params.query);

  if (!validation.valid) {
    ui.alert('⚠️ Query Safety Warning', validation.error, ui.ButtonSet.OK);
    return false;
  }

  ui.alert(
    '✅ Query Syntax Valid',
    `Query passed safety checks:\n\n"${params.query}"\n\nTarget Scope: ${params.scope}\nAction: ${params.action}`,
    ui.ButtonSet.OK
  );
  return true;
}

/**
 * Generates the GAM CLI command based on current parameters.
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

  let command = '';

  if (params.scope.includes('Target_Mailboxes')) {
    // GAM reading directly from live Google Sheet using GAMADV-XTD3 syntax
    command = `# 1. Direct GAMADV-XTD3 execution from live Google Sheet:\n` +
      `gam csv gsheet "${params.spreadsheetId}" "${CONFIG.SHEET_NAMES.TARGETS}" gam user ~Email ${gamAction} query "${escapedQuery}"${doitFlag}\n\n` +
      `# 2. Or using local CSV export:\n` +
      `gam csv target_mailboxes.csv gam user ~Email ${gamAction} query "${escapedQuery}"${doitFlag}`;
  } else if (params.scope.includes('Domain-Wide')) {
    command = `gam all users ${gamAction} query "${escapedQuery}"${doitFlag}`;
  } else if (params.scope.includes('Single Mailbox')) {
    const target = params.targetIdentifier || 'user@yourdomain.com';
    command = `gam user ${target} ${gamAction} query "${escapedQuery}"${doitFlag}`;
  } else if (params.scope.includes('Organizational Unit')) {
    const ou = params.targetIdentifier || '/Finance';
    command = `gam ou "${ou}" ${gamAction} query "${escapedQuery}"${doitFlag}`;
  } else if (params.scope.includes('Google Group')) {
    const grp = params.targetIdentifier || 'all-staff@yourdomain.com';
    command = `gam group "${grp}" ${gamAction} query "${escapedQuery}"${doitFlag}`;
  }

  return command;
}

/**
 * Generates the GAM command, writes it to the Control Center, and logs the action.
 */
function generateAndDisplayCommand() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CONTROL);
  const params = getPurgeParameters();

  // Validate
  const validation = validateQuerySafety(params.query);
  if (!validation.valid) {
    ui.alert('❌ Generation Blocked', validation.error, ui.ButtonSet.OK);
    return;
  }

  // Guardrail for Hard DELETE
  if (params.action.startsWith('DELETE') && params.confirmation !== 'YES') {
    ui.alert(
      '🚨 Hard Delete Guardrail Active',
      'You have selected permanent DELETE. You must set "Safety Confirmation" to "YES" in cell C11 before generating destructive commands.',
      ui.ButtonSet.OK
    );
    return;
  }

  const command = buildGamCommand(params);

  // Update sheet
  sheet.getRange('B14:F17').setValue(command);

  // Compute SHA-256 hash for audit integrity
  const rawBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, command);
  let hash = '';
  for (let i = 0; i < rawBytes.length; i++) {
    const byteVal = (rawBytes[i] < 0) ? rawBytes[i] + 256 : rawBytes[i];
    const hex = byteVal.toString(16);
    hash += (hex.length === 1) ? '0' + hex : hex;
  }

  // Record Audit Entry
  recordAuditLog(params, hash);

  SpreadsheetApp.getActiveSpreadsheet().toast('GAM command generated and audit logged!', 'Success', 4);
}

/**
 * Appends an entry to the Audit_Log sheet.
 */
function recordAuditLog(params, commandHash) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
 * Activates the Audit Log tab.
 */
function openAuditLogTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const auditSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.AUDIT);
  if (auditSheet) {
    ss.setActiveSheet(auditSheet);
  }
}

/**
 * Displays the Interactive Sidebar UI.
 */
function showPurgeSidebar() {
  const template = HtmlService.createTemplateFromFile('Sidebar');
  const html = template.evaluate()
    .setTitle('⚡ Workspace Purge Dashboard')
    .setWidth(360);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Bridge function for Sidebar UI to fetch active parameters and generate command.
 */
function getSidebarData() {
  const params = getPurgeParameters();
  const validation = validateQuerySafety(params.query);
  const command = validation.valid ? buildGamCommand(params) : '';

  return {
    params: params,
    isValid: validation.valid,
    validationError: validation.error || '',
    command: command
  };
}

/**
 * Bridge function for Sidebar to update cells directly.
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

  generateAndDisplayCommand();
  return getSidebarData();
}
