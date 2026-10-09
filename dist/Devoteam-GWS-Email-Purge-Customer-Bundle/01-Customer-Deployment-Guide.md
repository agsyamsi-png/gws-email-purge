# Google Workspace Threat Containment & Email Purge Solution
## Customer Handover & Deployment Guide

**Devoteam G Cloud — Google Cloud Premier Partner**
**Document Version:** 2.0.0 (Enterprise Edition)  
**Classification:** Customer Confidential  

---

## 1. Executive Summary
During active phishing campaigns, ransomware lures, or accidental data leaks, SecOps and IT Helpdesk teams must act within minutes to contain the blast radius.

Devoteam G Cloud has engineered this Incident Response Control Center for your Google Workspace tenant. It empowers administrators to:
1. **Design and validate threat search queries** visually with real-time safety guardrails.
2. **Auto-generate 1-click GAM CLI commands** for Single Mailbox, Google Group, OU, Domain-Wide, or Custom Mailbox lists.
3. **Execute high-speed, multi-threaded email containment** (Dry Run count, Soft Trash, or Permanent Delete) via GAM CLI without Apps Script timeout limitations.
4. **Maintain an immutable audit trail** in Google Sheets logging operator identity, incident scope, and cryptographic query hashes (GDPR/PII compliant).

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
├── 03-Apps-Script-Command-Center/
│   ├── Code.gs                                   # Apps Script backend controller & validator
│   ├── Sidebar.html                              # Interactive Quick Sidebar UI for Google Sheets
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
3. **Copy Code.gs:** Copy [`03-Apps-Script-Command-Center/Code.gs`](./03-Apps-Script-Command-Center/Code.gs) into `Code.gs`.
4. **Add Sidebar.html:** Click **+** (Add a file) > **HTML**, name it `Sidebar`, and paste [`03-Apps-Script-Command-Center/Sidebar.html`](./03-Apps-Script-Command-Center/Sidebar.html). Save the project (`Cmd+S` / `Ctrl+S`).
5. **Initialize Sheet:** Return to your Google Sheet, refresh the browser, click **`⚡ GAM Email Purge`** in the top menu, and select **`⚙️ Initialize / Format Sheet Tabs`**.
6. **Launch Sidebar:** Click **`⚡ GAM Email Purge`** > **`📱 Open GAM Command Builder (Sidebar)`** to begin!

---

## 4. Execution Workflow

1. In the **Quick Sidebar**, configure your Threat Query, Target Scope (Single Mailbox, Google Group, OU, Domain, or Sheet list), and Action (Dry Run, Trash, or Delete).
2. Click **Copy GAM Command** or **Download Runner Script (.sh)**.
3. Paste into your administrative terminal with GAM configured and execute.
4. GAM handles multi-threading, Google Group member expansion, and large-scale mailbox iteration natively with zero API timeout risk.

---

## 5. Support & Assistance
Engineered by **Devoteam G Cloud**. For questions or custom security architecture, please contact your Devoteam Account Executive or Cloud Architect.
