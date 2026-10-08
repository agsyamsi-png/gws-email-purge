# Google Workspace Email Purge Automation (`gws-email-purge`)

Enterprise-grade Google Workspace email purge, clawback, and containment toolkit engineered to Devoteam G Cloud standards.

---

## Overview

This repository contains tools, architecture specifications, operational playbooks, and security sign-offs for executing rapid, surgical, and auditable email clawback operations across Google Workspace tenants during active phishing outbreaks or accidental data leaks.

### Solutions Provided

1. **🚀 1-Click Web Containment Portal (`Dashboard.html` + `Code.gs`):**
   - **Zero Terminal / Zero CLI:** Web dashboard deployed either as an Apps Script Web App URL or as a full-screen modal inside Google Sheets.
   - **Direct Gmail API Execution:** Uses Domain-Wide Delegation (DWD) to search, trash, or expunge messages in real-time across mailboxes.
   - **Visual Query Builder:** Guided fields for Sender, Subject, Date range, and Message-ID that automatically prevent catastrophic mass deletions.
   - **Live Incident Report:** Displays summary KPI metrics, itemized mailbox logs, and provides a 1-click CSV export.

2. **📊 Google Sheet Control Center & GAM CLI Suite (`gam-sheet-ui/`):**
   - **Apps Script Controller (`Code.gs`):** Initializes a 3-tab operational sheet (`Purge_Control_Center`, `Target_Mailboxes`, `Audit_Log`), validates RFC 822 query syntax, and logs SHA-256 audit hashes.
   - **Interactive Sidebar (`Sidebar.html`):** Quick sidebar widget in Google Sheets for real-time parameter tweaking.
   - **CLI Runner Script (`gam-purge-runner.sh`):** Bash wrapper implementing pre-flight checks, dry-run simulation, blast-radius calculation, and dual-custody typed confirmation (`CONFIRM`).

3. **📘 Formal SecOps Playbooks & Engineering Governance (`docs/`):**
   - [**Incident Response SOP Playbook (Native Word .docx)**](./docs/DEV-SOP-GWS-Email-Purge-Playbook.docx): Devoteam-branded SOP playbook adhering to April 2026 brand identity (Montserrat typography, Red Poppy `#f8485e`, Dark Grey `#3c3c3a`).
   - [**Incident Response SOP Playbook (Markdown)**](./docs/DEV-SOP-GWS-Email-Purge-Playbook.md): GitHub-viewable SOP reference.
   - [`product-spec.md`](./docs/product-spec.md): Comprehensive product specification document (PRD v1.0.0).
   - [`security-review.md`](./docs/security-review.md): Security gatekeeper review and STRIDE threat analysis.
   - [`adr/`](./docs/adr/): Architecture Decision Records covering Domain-Wide Delegation (DWD), rate limits, and audit trail integrity.

---

## Quick Start Guide

### Option 1: 1-Click Web Portal (Recommended for Admins)
1. In your Google Sheet, navigate to **Extensions** > **Apps Script**.
2. Copy [`gam-sheet-ui/Code.gs`](./gam-sheet-ui/Code.gs) into `Code.gs`.
3. Click **+** > **HTML**, name it `Dashboard`, and paste the contents of [`gam-sheet-ui/Dashboard.html`](./gam-sheet-ui/Dashboard.html).
4. Save (`Cmd+S` / `Ctrl+S`).
5. Open the Web Portal:
   - **From Sheet:** Click **`⚡ GAM Email Purge`** > **`🚀 Open Purge Web Portal (Full Dashboard)`**.
   - **As Standalone URL:** In Apps Script, click **Deploy** > **New deployment** > **Web app** (`Execute as: User accessing the web app`, `Access: Anyone within your domain`).

### Option 2: GAM Terminal Automation
```bash
./gam-sheet-ui/gam-purge-runner.sh \
  --query 'from:attacker@evil.com subject:"Overdue Invoice"' \
  --scope sheet \
  --sheet-id "<SPREADSHEET_ID>" \
  --mode dry-run
```

---

## Standards & Principles

- **Zero-PII Audit Integrity:** Logs capture only metadata (timestamps, incident references, operator emails, SHA-256 command hashes). Email bodies and attachments are strictly excluded.
- **Mandatory Dry-Run Gates:** Destructive operations (`trash` or `delete`) require dry-run blast-radius evaluation prior to execution.
- **Devoteam Brand Compliance:** Technical documentation and SOP deliverables adhere strictly to Devoteam's April 2026 visual identity and British English standards.

---

## License

Internal / Enterprise Proprietary — Devoteam G Cloud.
