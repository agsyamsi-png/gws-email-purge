# Google Workspace Email Purge Controller & Web Portal

**Devoteam G Cloud — Enterprise Google Workspace Security Standards**

This solution provides both an intuitive **1-Click Web Containment Portal** and a **Google Sheet + GAM CLI Control Plane** to rapidly identify, audit, and purge malicious emails across Google Workspace tenants.

---

## 1. Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ADMIN INTERACTION LAYER                         │
│                                                                        │
│   Option 1: 1-Click Web Portal         Option 2: Google Sheet UI       │
│   (Standalone Web App / Modal)         (Purge_Control_Center + Tabs)   │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   EXECUTION & CONTAINMENT ENGINE                       │
│                                                                        │
│   Direct Gmail REST API Client         GAM / GAMADV-XTD3 Runner        │
│   (OAuth2 JWT DWD via Apps Script)     (CLI Terminal Automation)       │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   └────────────────┬────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Google Workspace Tenant Gmail Infrastructure              │
│       - Searches user mailboxes via impersonation (sub claim)          │
│       - Soft Purge (trash) / Hard Purge (delete)                       │
│       - Preserved in Google Vault if active legal holds exist          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fast Setup (1-Click Web Portal)

### Step 1: Open Google Sheets & Apps Script
1. Open or create your Google Sheet.
2. In the top menu, go to **Extensions** > **Apps Script**.

### Step 2: Add Script & HTML Files
1. Paste [`Code.gs`](./Code.gs) into the default `Code.gs` file.
2. Click **+** (Add a file) > **HTML**, name it `Dashboard`, and paste the contents of [`Dashboard.html`](./Dashboard.html).
3. (Optional) Click **+** > **HTML**, name it `Sidebar`, and paste the contents of [`Sidebar.html`](./Sidebar.html).
4. Save the project (`Cmd+S` or `Ctrl+S`).

### Step 3: Run the Web Portal
* **Within Google Sheets:** Return to your sheet, refresh the browser, and click **`⚡ GAM Email Purge`** > **`🚀 Open Purge Web Portal (Full Dashboard)`**.
* **As a Dedicated Web App:** In Apps Script, click **Deploy** > **New deployment** > **Web app**. Choose `Execute as: User accessing the web app` and `Who has access: Anyone within your domain`.

---

## 3. Incident Containment Procedure

1. **Input Threat Details:** Fill in the Sender (`from:`), Subject keyword (`subject:`), Message-ID (`rfc822msgid:`), or Date sent (`after:`). The query builder automatically ensures syntax safety.
2. **Select Target Scope:**
   - **Targeted Mailbox List:** Paste victim email addresses or load from the `Target_Mailboxes` sheet tab.
   - **Domain-Wide:** Scans all accounts across the tenant.
   - **Single User:** Remediates a specific account.
3. **Execute Mode:**
   - 🔍 **Dry Run Simulation:** Counts matching messages across inboxes with zero alterations.
   - 🗑️ **Move to Trash (Recommended):** Moves messages to user Trash with a 30-day recovery window.
   - 🚨 **Permanent Delete:** Hard expunge requiring an explicit confirmation checkbox.
4. **View Incident Report:**
   - Review live KPIs (Mailboxes Scanned, Threats Found, Purged Count).
   - Inspect the itemized mailbox results table.
   - Click **📥 Export CSV** to download the containment report.

---

## 4. Enabling Direct In-Browser Purging (Service Account Setup)

To execute purges directly inside the browser without opening a terminal:
1. Open the Web Portal and click **⚙️ Settings & DWD Key**.
2. Paste your Google Cloud Service Account JSON Key (authorized for Domain-Wide Delegation with `https://mail.google.com/`).
3. Click **Save Key**. The key is stored securely in encrypted Google `ScriptProperties`.
4. Web-based 1-click purges are now fully operational.

---

## 5. Emergency Rollback / Recovery Runbook

If emails were moved to Trash by mistake during a Soft Purge (`TRASH`), they can be restored within 30 days:
```bash
# Restore for all targeted mailboxes in Google Sheet:
gam csv gsheet "<SPREADSHEET_ID>" "Target_Mailboxes" gam user ~Email untrash messages query "<QUERY>" doit
```
