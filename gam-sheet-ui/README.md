# Google Workspace Email Purge Controller (GAM + Google Sheets UI)

**Devoteam G Cloud — Enterprise Google Workspace Security Standards**

This solution provides an enterprise-ready, white-label Google Sheet control plane combined with GAM / GAMADV-XTD3 automation to rapidly identify, audit, and purge malicious emails (e.g., phishing outbreaks, accidental data spills) across Google Workspace tenants.

---

## 1. Architectural Overview

```
┌────────────────────────────────────────────────────────┐
│               1. Google Sheet Control Plane            │
│  - Purge_Control_Center (Query, Scope, Mode, Approvals)│
│  - Target_Mailboxes     (List of victim email inboxes) │
│  - Audit_Log            (Tamper-evident incident log)  │
└───────────────────────────┬────────────────────────────┘
                            │
               [Interactive Apps Script UI]
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ Option A: Direct Live   │     │ Option B: CLI Runner    │
│ GAMADV-XTD3 Connector   │     │ gam-purge-runner.sh     │
│ Reads live Google Sheet │     │ Dry-run -> Confirmation │
│ via Sheets API          │     │ -> Purge Execution      │
└───────────┬─────────────┘     └───────────┬─────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│        Google Workspace Gmail & Directory APIs         │
│     (Domain-Wide Delegation Service Account via GAM)   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Quick Setup Guide

### Step 1: Prepare the Google Sheet
1. Open a new Google Sheet: [sheets.new](https://sheets.new).
2. Name the spreadsheet: `[SecOps] Workspace Email Purge Control Center`.

### Step 2: Install Apps Script Controller
1. In the menu bar, navigate to **Extensions** > **Apps Script**.
2. Replace the default `Code.gs` with the contents of [`Code.gs`](./Code.gs).
3. Click **+** (Add a file) > **HTML**, name it `Sidebar`, and paste the contents of [`Sidebar.html`](./Sidebar.html).
4. Save the project (`Cmd+S` or `Ctrl+S`).

### Step 3: Initialize the Sheet Interface
1. Return to the Google Sheet tab and refresh the browser.
2. A new custom menu **`⚡ GAM Email Purge`** will appear in the top toolbar.
3. Click **`⚡ GAM Email Purge`** > **`⚙️ Initialize / Format Sheet Tabs`**.
4. Grant the initial Google authorization permissions when prompted.
5. The script automatically sets up three formatted tabs:
   - **`Purge_Control_Center`**: The master command dashboard.
   - **`Target_Mailboxes`**: The recipient list for targeted purges.
   - **`Audit_Log`**: Immutable record of all purge requests and cryptographic command hashes.

---

## 3. How to Execute an Email Purge

### Phase 1: Configure & Validate the Query
1. Open the interactive UI: **`⚡ GAM Email Purge`** > **`📱 Open Purge Dashboard (Sidebar)`**.
2. Enter your **Incident Reference ID** (e.g., `INC-2026-10-092`).
3. Enter the **Gmail RFC 822 Search Query**:
   - By Message-ID: `rfc822msgid:<unique-id@attacker.com>`
   - By Sender & Subject: `from:phishing@evil.com subject:"Urgent Invoice"`
   - With Date Guardrail: `from:spammer@evil.com after:2026/10/01`
4. Choose the **Target Scope**:
   - `Specific Mailbox List (Tab: Target_Mailboxes)`: For targeted containment (paste victim emails into the `Target_Mailboxes` tab).
   - `All Users (Domain-Wide)`: For domain-wide phishing campaigns.
   - `Single Mailbox`, `Organizational Unit (OU)`, or `Google Group`.

### Phase 2: Mandatory Dry-Run Simulation
Always select **`DRY_RUN (Count & List Only)`** first.
- The UI generates the dry-run command:
  ```bash
  # For targeted mailboxes in Google Sheet:
  gam csv gsheet "<SPREADSHEET_ID>" "Target_Mailboxes" gam user ~Email print messages query "..."
  
  # For all domain users:
  gam all users print messages query "..."
  ```
- Review the count of matching messages to verify zero false positives.

### Phase 3: Containment Execution

#### Option 1: Soft Purge (Recommended)
Set **Purge Action** to `TRASH (Soft Purge - 30 Day Recovery Window)`.
- Moves matching messages directly to the users' Trash folder.
- Users cannot see or open the malicious message in their Inbox.
- Admins can easily restore emails within 30 days if a false positive occurs.
- GAM syntax:
  ```bash
  gam all users trash messages query "..." doit
  ```

#### Option 2: Hard Purge (Permanent Expunge)
Set **Purge Action** to `DELETE (Hard Purge - Permanent Expunge)` and toggle **Safety Confirmation** to `YES`.
- Permanently deletes the message bypassing Trash.
- *Note:* If Google Vault retention holds exist, messages remain retained in Vault for compliance and legal discovery.
- GAM syntax:
  ```bash
  gam all users delete messages query "..." doit
  ```

---

## 4. Using the Shell Runner Script (`gam-purge-runner.sh`)

For automated, protected execution from your macOS/Linux workstation or Google Cloud Shell:

```bash
# 1. Dry-run audit scan against a live Google Sheet:
./gam-purge-runner.sh \
  --query 'from:attacker@evil.com subject:"Overdue Payment"' \
  --scope sheet \
  --sheet-id "YOUR_SPREADSHEET_ID" \
  --mode dry-run

# 2. Execute soft purge (Trash) with blast-radius confirmation prompt:
./gam-purge-runner.sh \
  --query 'rfc822msgid:<1234567@evil.com>' \
  --scope all \
  --mode trash

# 3. Permanent delete across a specific CSV list:
./gam-purge-runner.sh \
  --query 'from:badactor@domain.com' \
  --scope csv \
  --csv target_mailboxes.csv \
  --mode delete
```

---

## 5. Security & Operational Guardrails

1. **Pre-flight Safety Filter:** Empty queries or wildcards (`*`, `""`, `is:unread`, `label:inbox`) are strictly blocked by both Apps Script and the bash runner to prevent catastrophic domain-wide deletions.
2. **Dual-Custody Sign-off:** The sheet enforces a verified approval state and explicit confirmation checkbox before enabling hard DELETE command generation.
3. **Audit Trail Integrity:** Every command generated registers an immutable entry into the `Audit_Log` tab with UTC timestamp, operator identity, scope, query, and SHA-256 hash.
4. **Google Vault Compliance:** GAM message deletion does not destroy messages under active Google Vault litigation holds.
