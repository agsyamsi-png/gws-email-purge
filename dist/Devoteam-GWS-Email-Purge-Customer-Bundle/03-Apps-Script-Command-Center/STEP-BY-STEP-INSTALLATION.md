# 3-Minute Quick Installation Guide: Threat Containment Control Center

This guide walks you through deploying the **Incident Response Control Center & GAM Command Builder** into your Google Workspace domain.

---

### Step 1: Create a Dedicated Google Sheet
1. Open [sheets.new](https://sheets.new) in your browser.
2. Title the sheet: `[SecOps] Threat Containment Center`.

---

### Step 2: Open the Apps Script Editor
1. In the Google Sheets top menu, click **Extensions** > **Apps Script**.
2. A new browser tab will open showing the script editor.

---

### Step 3: Install `Code.gs`
1. Select all default text in the existing `Code.gs` file and delete it.
2. Copy the entire contents of [`Code.gs`](./Code.gs) and paste it into the editor.

---

### Step 4: Add `Sidebar.html`
1. In the left panel of Apps Script, click the **`+`** icon next to **Files** and select **HTML**.
2. Name the file: `Sidebar` (do NOT type `.html`, Apps Script adds it automatically).
3. Select all default text and delete it.
4. Copy the entire contents of [`Sidebar.html`](./Sidebar.html) and paste it into the file.
5. Click the **Save project** floppy disk icon (`Cmd+S` on Mac or `Ctrl+S` on Windows).

---

### Step 5: Initialize Sheet Tabs
1. Go back to your Google Sheet tab and refresh the page (`Cmd+R` / `F5`).
2. Wait a few seconds: a new menu item **`⚡ GAM Email Purge`** will appear in the top toolbar.
3. Click **`⚡ GAM Email Purge`** > **`⚙️ Initialize / Format Sheet Tabs`**.
4. A Google authorization popup will appear: click **Continue**, select your Admin account, click **Advanced**, and click **Go to Untitled project (unsafe)** to grant the standard spreadsheet permissions.
5. Three formatted tabs will be automatically generated:
   - `Purge_Control_Center`
   - `Target_Mailboxes`
   - `Audit_Log`

---

### Step 6: Launch the Command Builder!
1. Click **`⚡ GAM Email Purge`** > **`📱 Open GAM Command Builder (Sidebar)`**.
2. Configure your query, target scope, and action.
3. Click **Copy GAM Command** or **Download Runner Script (.sh)** and run directly in your terminal!
