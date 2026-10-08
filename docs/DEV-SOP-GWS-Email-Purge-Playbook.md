# Threat Containment & Email Purge Playbook
### Standard Operating Procedure (SOP) for Google Workspace Incident Response

**Document Reference:** `DEV-SOP-GWS-PURGE-2026-001`  
**Classification:** Enterprise Standard Operating Procedure  
**Author:** Devoteam G Cloud — Architecture & Managed SecOps  
**Version:** 1.0.0 (October 2026)  
**Deliverable Artifact:** [`DEV-SOP-GWS-Email-Purge-Playbook.docx`](./DEV-SOP-GWS-Email-Purge-Playbook.docx)

---

## 1. Executive Summary & Operational Scope

This Standard Operating Procedure (SOP) defines the operational workflow for executing surgical email clawback and containment operations across enterprise Google Workspace tenants during active phishing outbreaks, accidental confidential data leakages, or regulatory compliance expungements.

The solution integrates a central **Google Sheets Control Center** (providing query sanitisation, blast-radius validation, and tamper-evident audit logging) with the **Google Apps Manager (GAM / GAMADV-XTD3)** CLI automation engine.

> [!IMPORTANT]
> **Critical Safety Mandate:** Never execute a hard `DELETE` or soft `TRASH` operation without first executing a `DRY_RUN` simulation. Verify the blast radius to confirm that legitimate communications are not affected.

---

## 2. Architectural Framework & Domain-Wide Delegation (DWD)

Standard Google Workspace administrator accounts cannot read or delete messages from individual user mailboxes via ordinary user OAuth 2.0 credentials. Google Workspace strictly mandates **Domain-Wide Delegation of Authority (DWD)** for cross-mailbox administrative intervention.

### 2.1 The Two-Tier Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. CONTROL PLANE (Google Sheet + Apps Script)                          │
│    - Role: Management UI, Safety Validator, and Audit Registry        │
│    - Context: Runs as Admin Operator                                   │
│    - Validates queries, blocks blanket patterns, logs SHA-256 hashes   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Command / Stream Handoff
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. EXECUTION PLANE (GAM / GAMADV-XTD3)                                 │
│    - Role: Administrative Impersonation & Mailbox Purge Engine         │
│    - Context: Service Account with Domain-Wide Delegation (DWD)        │
│    - Mints JWTs with `sub` claim set to target users and invokes API   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Administrative API Calls
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. TARGET MAILBOXES (Google Workspace Gmail Infrastructure)            │
│    - Every user mailbox (`users.messages.trash` / `delete`)           │
│    - Google Vault retains copies if active legal holds exist           │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Required OAuth 2.0 Scopes

Authorise the Service Account Client ID in the Google Workspace Admin Console under **Security** > **Access and data control** > **API controls** > **Manage Domain Wide Delegation**:

| OAuth 2.0 Scope | Operational Justification |
| :--- | :--- |
| `https://mail.google.com/` | Administrative access to search, move to trash, and permanently delete messages. |
| `https://www.googleapis.com/auth/admin.directory.user.readonly` | Enables GAM to enumerate target users and evaluate domain-wide recipients. |
| `https://www.googleapis.com/auth/admin.directory.group.readonly` | Allows GAM to expand Google Groups into individual target mailboxes. |
| `https://www.googleapis.com/auth/spreadsheets.readonly` | Enables direct real-time batch execution from live Google Sheet tabs (`gam csv gsheet`). |

---

## 3. Standard Operating Procedure (SOP) Step-by-Step

### Phase 1: Incident Intake & Query Formulation
Identify threat attributes from email gateway logs or user reports. Construct an RFC 822 compliant search query containing at least two restrictive anchors:
- **Primary Filter (Message-ID):** `rfc822msgid:<unique-id@attacker.com>`
- **Alternative Filter (Sender & Subject):** `from:attacker@evil.com subject:"Overdue Invoice"`
- **Mandatory Date Guardrail:** `after:2026/10/01` (Restricts search window to avoid historical collateral damage)

### Phase 2: Google Sheet Control Center Configuration
1. Open the enterprise **Workspace Purge Control Center** spreadsheet.
2. Launch the interactive dashboard: **`⚡ GAM Email Purge`** > **`📱 Open Purge Dashboard (Sidebar)`**.
3. Input the **Incident Reference ID** (e.g. `INC-2026-10-092`), target scope, and the Gmail RFC 822 query.
4. For targeted incidents, paste victim email addresses into the **`Target_Mailboxes`** tab.

### Phase 3: Simulation & Blast-Radius Audit (`DRY_RUN`)
1. Set the Purge Action to `DRY_RUN (Count & List Only)`.
2. Execute the generated dry-run command:
   ```bash
   gam all users print messages query "rfc822msgid:<...> after:2026/10/01"
   ```
3. Inspect the resulting scan artifact. Confirm message counts align with threat intelligence and that internal executive communications are not captured.

### Phase 4: Dual-Custody Approval & Containment Execution
1. Review the blast-radius impact report with the Incident Commander or Lead SecOps Architect.
2. Determine containment mode:
   - **Soft Purge (TRASH) - Recommended:** Moves messages to user Trash. Neutralises active threat while preserving a 30-day administrative recovery window.
   - **Hard Purge (DELETE) - Exceptional:** Permanently expunges messages. Requires setting `Safety Confirmation` to `YES` in cell C11 of the sheet.
3. Execute the containment command via CLI runner or live sheet connector:
   ```bash
   gam csv gsheet "<SPREADSHEET_ID>" "Target_Mailboxes" gam user ~Email trash messages query "<QUERY>" doit
   ```

### Phase 5: Post-Incident Verification & Audit Sign-Off
1. Re-run the simulation query. Confirm matching message count returns exactly `0` in active user inboxes.
2. Confirm that execution details, operator identity, and SHA-256 hash are recorded in the **`Audit_Log`** tab.
3. Attach the audit export to the SecOps incident ticket.

---

## 4. Operational Guardrails & Pattern Blacklist

The Google Apps Script validator strictly blocks unsafe, broad, or malformed queries before command generation. Any query matching the following patterns will be rejected immediately:

| Disallowed Pattern | Risk Description & Mitigation |
| :--- | :--- |
| **Empty Query / Whitespace** | Matches 100% of domain emails. Mandatory rejection. |
| **Wildcard (`*`)** | Blanket match across entire mailbox. |
| **`is:unread` / `is:read`** | Matches normal corporate correspondence. Specific sender/subject anchor required. |
| **`label:inbox` / `label:sent`** | Matches all active inbox or sent messages without filtering. |
| **Missing Anchors** | Queries without `from:`, `subject:`, `rfc822msgid:`, or date bounds are flagged for review. |

---

## 5. GAM Command Reference Matrix

| Target Scope | Simulation (Dry Run) | Containment Action (Trash / Delete) |
| :--- | :--- | :--- |
| **Live Google Sheet (`Target_Mailboxes`)** | `gam csv gsheet "<ID>" "Target_Mailboxes" gam user ~Email print messages query "<Q>"` | `gam csv gsheet "<ID>" "Target_Mailboxes" gam user ~Email trash messages query "<Q>" doit` |
| **All Domain Users (Domain-Wide)** | `gam all users print messages query "<Q>"` | `gam all users trash messages query "<Q>" doit` |
| **Single Mailbox** | `gam user <USER> print messages query "<Q>"` | `gam user <USER> trash messages query "<Q>" doit` |

---

## 6. Emergency Rollback & Recovery Runbook

If an operational error or false positive occurs during a Soft Purge (`TRASH`), messages can be rapidly restored to user inboxes within 30 days without data loss:

```bash
# Restore affected mailboxes listed in the Google Sheet:
gam csv gsheet "<SPREADSHEET_ID>" "Target_Mailboxes" gam user ~Email untrash messages query "<QUERY>" doit

# Restore across all users domain-wide:
gam all users untrash messages query "<QUERY>" doit
```

---

*Devoteam G Cloud • AI-driven tech consulting • Enterprise Security Standards*
