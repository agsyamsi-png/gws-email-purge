# 3-Minute Quick Installation Guide: Web Containment Portal

This guide walks you through deploying the **1-Click Web Containment Portal** into your Google Workspace domain.

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

### Step 4: Add `Dashboard.html`
1. In the left panel of Apps Script, click the **`+`** icon next to **Files** and select **HTML**.
2. Name the file: `Dashboard` (do NOT type `.html`, Apps Script adds it automatically).
3. Select all default text and delete it.
4. Copy the entire contents of [`Dashboard.html`](./Dashboard.html) and paste it into the file.

---

### Step 5: (Optional) Add `Sidebar.html`
1. Click the **`+`** icon next to **Files** and select **HTML**.
2. Name the file: `Sidebar`.
3. Copy the entire contents of [`Sidebar.html`](./Sidebar.html) and paste it into the file.
4. Click the **Save project** floppy disk icon (`Cmd+S` on Mac or `Ctrl+S` on Windows).

---

### Step 6: Initialize Sheet Tabs
1. Go back to your Google Sheet tab and refresh the page (`Cmd+R` / `F5`).
2. Wait a few seconds: a new menu item **`⚡ GAM Email Purge`** will appear in the top toolbar.
3. Click **`⚡ GAM Email Purge`** > **`⚙️ Initialize / Format Sheet Tabs`**.
4. A Google authorization popup will appear: click **Continue**, select your Admin account, click **Advanced**, and click **Go to Untitled project (unsafe)** to grant the standard spreadsheet permissions.
5. Three formatted tabs will be automatically generated:
   - `Purge_Control_Center`
   - `Target_Mailboxes`
   - `Audit_Log`

---

### Step 7: Launch the Web Portal!
You have two ways to open the portal:

* **Inside Google Sheets:** Click **`⚡ GAM Email Purge`** > **`🚀 Open Purge Web Portal (Full Dashboard)`**.
* **As a Standalone Web URL:** In Apps Script, click **Deploy** > **New deployment** > **Web app**.
  - **Execute as:** `User accessing the web app` (or `Me`)
  - **Who has access:** `Anyone within your organization`
  - Click **Deploy** and bookmark the resulting URL!

---

### Enabling Direct In-Browser Purging (Service Account Setup)
1. In the Web Portal, click **⚙️ Settings & DWD Key** in the top-right corner.
2. Paste your Google Cloud Service Account JSON Key (delegated for `https://mail.google.com/`).
3. Click **Save Key**. The key is stored securely in encrypted Google `ScriptProperties`.
4. Now, any purge executed in the portal immediately contacts the Gmail API to trash or expunge matching emails with 1 click!
