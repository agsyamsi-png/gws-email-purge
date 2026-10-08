# Google Workspace Email Purge Automation (`gws-email-purge`)

Enterprise-grade Google Workspace email purge, clawback, and containment toolkit engineered to Devoteam G Cloud standards.

---

## Overview

This repository contains tools, architecture specifications, and security sign-offs for executing rapid, surgical, and auditable email clawback operations across Google Workspace tenants during active phishing outbreaks or accidental data leaks.

### Components

1. **[Google Sheet Control Center & GAM UI (`gam-sheet-ui/`)](./gam-sheet-ui/):**
   - **Apps Script Controller (`Code.gs`):** Automatically initializes a 3-tab operational sheet (`Purge_Control_Center`, `Target_Mailboxes`, `Audit_Log`), validates RFC 822 query syntax, and computes cryptographic SHA-256 audit hashes.
   - **Interactive Sidebar (`Sidebar.html`):** Modern Web UI embedded directly into Google Sheets for incident parameter configuration and 1-click GAM command generation.
   - **CLI Runner Script (`gam-purge-runner.sh`):** Production bash wrapper implementing pre-flight checks, mandatory dry-run simulation, blast-radius calculation, and dual-custody confirmation prompts.
2. **[Architecture Specifications & Security Review (`docs/`)](./docs/):**
   - [`product-spec.md`](./docs/product-spec.md): Comprehensive product requirements document (PRD v1.0.0).
   - [`security-review.md`](./docs/security-review.md): Security gatekeeper review and STRIDE threat analysis.
   - [`adr/`](./docs/adr/): Architecture Decision Records covering Clean Architecture, Domain-Wide Delegation (DWD), rate-limiting worker pools, and zero-PII audit trail integrity.

---

## Quick Start (GAM + Google Sheets UI)

1. Navigate to the [`gam-sheet-ui/`](./gam-sheet-ui/) directory.
2. Follow the [Setup Runbook](./gam-sheet-ui/README.md) to install `Code.gs` and `Sidebar.html` into your Google Sheet.
3. Use the generated GAM commands or run the `./gam-purge-runner.sh` script against your Google Sheet:
   ```bash
   ./gam-sheet-ui/gam-purge-runner.sh \
     --query 'from:attacker@evil.com subject:"Overdue Invoice"' \
     --scope sheet \
     --sheet-id "<SPREADSHEET_ID>" \
     --mode dry-run
   ```

---

## Standards & Principles

- **Zero-PII Audit Integrity:** Logs capture only metadata (timestamps, incident references, operator emails, SHA-256 command hashes). Email bodies and attachment payloads are strictly excluded.
- **Mandatory Dry-Run Gates:** Destructive operations (`trash` or `delete`) require dry-run blast radius evaluation prior to execution.
- **Trunk-Based Development:** Main branch is kept deployable; all changes undergo security and architectural review.

---

## License

Internal / Enterprise Proprietary — Devoteam G Cloud.
