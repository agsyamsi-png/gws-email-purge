# Google Workspace Threat Containment & Email Purge Solution
## Customer Handover & Deployment Guide

**Devoteam G Cloud — Google Cloud Premier Partner**
**Document Version:** 2.0.0 (Enterprise Edition)  
**Classification:** Customer Confidential  

---

## 1. Executive Summary
During active phishing campaigns, ransomware lures, or accidental data leaks, SecOps and IT Helpdesk teams must act within minutes to contain the blast radius.

Devoteam G Cloud has engineered this 100% web-based containment solution for your Google Workspace tenant. It empowers administrators to:
1. **Sign in with Google Admin SSO** (no terminal, no CLI commands).
2. **Input threat email details** via an intuitive visual form (Sender, Subject, Message-ID, Date).
3. **Execute 1-click purges** (Dry Run simulation, Soft Trash, or Permanent Delete).
4. **Generate instant incident compliance reports** with live metrics and 1-click CSV download.

---

## 2. Directory Structure of This Customer Bundle

```
Devoteam-GWS-Email-Purge-Customer-Bundle/
├── README.txt                                     # Quick start reading guide
├── 01-Customer-Deployment-Guide.docx             # Branded executive handover guide (.docx)
├── 01-Customer-Deployment-Guide.md               # Markdown companion
├── 02-Operational-SOP-Playbook/
│   ├── DEV-SOP-GWS-Email-Purge-Playbook.docx     # Enterprise Incident Response SOP (.docx)
│   └── DEV-SOP-GWS-Email-Purge-Playbook.md       # Full SOP Markdown reference
├── 03-Apps-Script-Web-Solution/
│   ├── Code.gs                                   # Apps Script backend + DWD token engine
│   ├── Dashboard.html                            # 1-Click web containment portal UI
│   ├── Sidebar.html                              # Quick sidebar UI for Google Sheets
│   └── STEP-BY-STEP-INSTALLATION.md              # 3-minute visual installation guide
├── 04-CLI-Automation/
│   ├── gam-purge-runner.sh                       # Production bash CLI runner
│   └── sample-targets.csv                        # Sample CSV for targeted mailboxes
└── 05-Architecture-and-Security-Assurance/
    ├── product-spec.md                           # Product requirements & PRD
    ├── security-review.md                        # STRIDE threat model & IAM review
    └── adr/                                      # Architecture Decision Records
```

---

## 3. 5-Minute Installation Checklist

1. **Create Sheet:** Open [sheets.new](https://sheets.new) and name it `[SecOps] Threat Containment Center`.
2. **Open Apps Script:** Navigate to **Extensions** > **Apps Script**.
3. **Copy Code.gs:** Copy [`03-Apps-Script-Web-Solution/Code.gs`](./03-Apps-Script-Web-Solution/Code.gs) into `Code.gs`.
4. **Add Dashboard.html:** Click **+** (Add a file) > **HTML**, name it `Dashboard`, and paste [`03-Apps-Script-Web-Solution/Dashboard.html`](./03-Apps-Script-Web-Solution/Dashboard.html).
5. **Add Sidebar.html:** Click **+** > **HTML**, name it `Sidebar`, and paste [`03-Apps-Script-Web-Solution/Sidebar.html`](./03-Apps-Script-Web-Solution/Sidebar.html). Save the project (`Cmd+S` / `Ctrl+S`).
6. **Initialize Sheet:** Return to your Google Sheet, refresh the browser, click **`⚡ GAM Email Purge`** in the top menu, and select **`⚙️ Initialize / Format Sheet Tabs`**.
7. **Launch the Portal:**
   - **In Google Sheets:** Click **`⚡ GAM Email Purge`** > **`🚀 Open Purge Web Portal (Full Dashboard)`**.
   - **As Standalone Web App:** In Apps Script, click **Deploy** > **New deployment** > **Web app** (`Execute as: User accessing the web app`, `Who has access: Anyone within your domain`).

---

## 4. Enabling Direct In-Browser Purging (Service Account Setup)
To execute purges directly inside the browser without using a terminal:
1. Open the Web Portal and click **⚙️ Settings & DWD Key**.
2. Paste your Google Cloud Service Account JSON Key (authorized for Domain-Wide Delegation with scope `https://mail.google.com/`).
3. Click **Save Key**. The key is stored securely in encrypted Google `ScriptProperties`.
4. Direct 1-click in-browser purges are now active.

---

## 5. Support & Assistance
Engineered by **Devoteam G Cloud**. For questions or custom security architecture, please contact your Devoteam Account Executive or Cloud Architect.
