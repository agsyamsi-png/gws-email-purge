# Security Architecture Review & Gatekeeper Sign-Off

**Document ID:** DEV-SEC-GWS-PURGE-2026-001  
**Version:** 1.0.0  
**Security Gatekeeper:** Devoteam G Cloud Security Architecture Office (@security-architect)  
**Date:** October 2026  
**Target Solution:** Whitelabel Google Workspace Email Purge Tool (`gws-purge`)  
**Scope of Review:**
- `docs/product-spec.md` (Product Specification v1.0.0)
- `docs/adr/0001-clean-architecture-and-runtime-tooling.md` (Clean Architecture & Runtime Tooling)
- `docs/adr/0002-domain-wide-delegation-and-whitelabel-tenant-auth.md` (DWD & Multi-Tenant Credential Management)
- `docs/adr/0003-rate-limiting-worker-pool-and-checkpointing.md` (Rate Limiting, Concurrency & Checkpointing)
- `docs/adr/0004-audit-trail-integrity-and-zero-pii-guarantees.md` (Audit Trail Integrity & Zero-PII Guarantees)

---

## 1. Executive Summary & Verdict

### 1.1 Gatekeeper Verdict

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SECURITY SIGN-OFF VERDICT                       │
│                                                                        │
│                      [ CONDITIONALLY GRANTED ]                         │
│                                                                        │
│   Production deployment is authorized strictly subject to the closure  │
│   of three P0 Security Architecture Blockers and compliance with all   │
│   prescribed controls defined in Section 6 of this review.             │
└────────────────────────────────────────────────────────────────────────┘
```

The architecture of the **Whitelabel Google Workspace Email Purge Tool (`gws-purge`)** represents a mature, well-engineered design that thoughtfully incorporates least-privilege scoping, rate-limiting safeguards, dry-run simulations, and structured audit trails. 

However, because the tool leverages Google Workspace **Service Account Domain-Wide Delegation (DWD)**—a capability granting near-unlimited lateral access across an enterprise tenant's email infrastructure—and performs destructive operations (`trash` and permanent `delete`), rigorous architectural controls are mandatory to mitigate critical operational, legal, and compliance risks.

### 1.2 Summary of Assessment

| Security Evaluation Area | Status | Key Strengths | Critical Gaps / Gating Requirements |
| :--- | :---: | :--- | :--- |
| **1. Domain-Wide Delegation (DWD) & IAM** | ⚠️ **CONDITIONAL** | Dynamic OAuth scoping per operational mode; read-only dry-run enforcement. | **Architectural discrepancy:** DWD `sub` impersonation mechanics between Admin Directory API and individual Gmail user mailboxes need explicit isolation; VIP mailbox protection required. |
| **2. Credential Security & Secret Storage** | ⚠️ **CONDITIONAL** | Native GCP Secret Manager integration; in-memory credential resolution. | Local JSON key fallback requires strict `0600` POSIX pre-flight validation; Workload Identity Federation (WIF) recommended over exported SA keys. |
| **3. Cross-Tenant Isolation & Blast Radius** | ✅ **APPROVED** | Config-driven profile isolation; explicit domain boundary whitelisting. | Enforce strict FQDN exact matching to eliminate subdomain traversal/spoofing risks. |
| **4. Accidental Deletion / DLP Safeguards** | ⚠️ **CONDITIONAL** | Dry-run default; interactive `CONFIRM` prompt; blast-radius message threshold. | Hard Purge (`delete`) requires dual-custody verification; thresholds must evaluate *both* message count and mailbox count; Google Vault hold disclaimer must be logged. |
| **5. Zero-PII Compliance & Audit Integrity** | ⚠️ **CONDITIONAL** | Strict omission of email bodies, snippets, and attachment files; JSONL logging. | **Discrepancy:** Spec allows raw subject logging, whereas ADR-0004 warns against subject PII; mandatory HMAC-SHA256 subject hashing or query-match masking required. Local SHA-256 checksum requires external tamper-resistance. |

---

## 2. Threat Modeling & Attack Surface Analysis (STRIDE)

A STRIDE threat assessment was conducted against the target deployment environment (Enterprise Google Workspace tenant managed by internal SecOps or Devoteam Managed Services):

```mermaid
flowchart LR
    subgraph AttackerVectors ["Threat Vectors"]
        T1["Compromised SA Private Key"]
        T2["Malicious / Rogue Operator"]
        T3["Cross-Tenant Config Drift"]
        T4["Accidental Mass Purge Query"]
    end

    subgraph DefenseBarriers ["Security Architecture Guardrails"]
        G1["Secret Manager / POSIX 0600"]
        G2["Dynamic Scopes (gmail.modify vs mail.google.com)"]
        G3["Domain Whitelist & VIP Blocklist"]
        G4["Dry-Run Default & Blast Thresholds"]
    end

    subgraph Assets ["Protected Assets"]
        A1["Executive & Employee Mailboxes"]
        A2["Corporate Legal Holds & Compliance Data"]
        A3["Tamper-Evident Audit Logs"]
    end

    T1 --> G1
    T2 --> G2
    T3 --> G3
    T4 --> G4
    G1 --> A1
    G2 --> A1
    G3 --> A1
    G4 --> A2
    DefenseBarriers --> A3
```

| STRIDE Category | Threat Scenario | Impact | Architectural Mitigation & Required Control |
| :--- | :--- | :---: | :--- |
| **Spoofing** | Compromised Service Account private key used outside of `gws-purge` to impersonate C-level executives. | **CRITICAL** | Restrict DWD scopes to the absolute minimum; mandate Google Cloud Secret Manager with IAM access audit logs; recommend Workload Identity Federation (WIF). |
| **Tampering** | Operator or compromised host modifies `audit.jsonl` post-incident to conceal unauthorized email deletion. | **HIGH** | Local SHA-256 digest is insufficient for non-repudiation; mandate optional dual-sink streaming to Google Cloud Logging or immutable GCS Bucket with Object Retention. |
| **Repudiation** | Operator denies initiating a destructive hard purge across hundreds of employee mailboxes. | **HIGH** | Checkpoint and audit trails must cryptographically log the initiating OS user, machine hostname, IP, delegated admin email, and authorization ticket token (`--token`). |
| **Information Disclosure** | Sensitive PII/PHI (e.g., patient records, financial disclosures) leaked into audit logs or console terminals via email subjects or snippets. | **HIGH** | Strict Zero-PII policy: bodies, snippets, and attachments are strictly blocked from API retrieval (`format=METADATA` with restricted headers). Subject lines must be hashed or masked. |
| **Denial of Service** | Aggressive API flooding exhausts customer Gmail API quota (250 units/sec), breaking critical third-party business integrations. | **MEDIUM** | Enforce per-user token-bucket rate limiter capped at 200 quota units/sec with exponential backoff and jitter (ADR-0003). |
| **Elevation of Privilege** | An operator with access to `gws-purge` purges emails from Legal Counsel or HR mailboxes involved in internal investigations. | **CRITICAL** | Code-level VIP / Protected Mailbox blocklist preventing targeting of sensitive accounts without an explicit multi-party override flag. |

---

## 3. Detailed Security Assessment by Architectural Pillar

### 3.1 Pillar 1: Google Workspace Domain-Wide Delegation (DWD) & Least-Privilege IAM

#### 3.1.1 OAuth Scope Granularity & Justification
The OAuth scope matrix proposed in ADR-0002 has been evaluated against Google API documentation:

```
+---------------------------------------------------------------------------------------+
| DRY-RUN / SCAN MODE:                                                                  |
|   https://www.googleapis.com/auth/admin.directory.user.readonly   [Read Org Structure]|
|   https://www.googleapis.com/auth/admin.directory.group.readonly  [Expand Groups]    |
|   https://www.googleapis.com/auth/gmail.readonly                  [Search & Metadata] |
+---------------------------------------------------------------------------------------+
| SOFT PURGE (TRASH) MODE:                                                              |
|   https://www.googleapis.com/auth/gmail.modify                   [users.messages.trash]
+---------------------------------------------------------------------------------------+
| HARD PURGE (DELETE) MODE:                                                             |
|   https://mail.google.com/                                        [users.messages.delete]
+---------------------------------------------------------------------------------------+
```

- **Scope Dynamic Partitioning:** The architecture correctly enforces **Dynamic Scoping per Execution Mode**. When running in `--dry-run` or `scan` mode, the tool mints OAuth JWTs requesting **only** `gmail.readonly` and directory read-only scopes. This guarantees that even if a logic flaw or accidental code branch is encountered during simulation, the token itself is rejected by Google's OAuth gateway if any write/trash/delete call is attempted.
- **`gmail.modify` vs `https://mail.google.com/`:** 
  - Soft purge uses `gmail.modify`, which allows moving messages to Trash (`users.messages.trash`) without granting permanent deletion authority.
  - Permanent purge (`users.messages.delete`) unfortunately requires the unrestricted scope `https://mail.google.com/` due to Gmail REST API restrictions. 
  - **Security Gatekeeper Directive:** Because `https://mail.google.com/` grants total mailbox destruction power, the tool MUST require explicit approval gating before minting tokens with this scope.

#### 3.1.2 Critical Architectural Nuance: Subject Impersonation Mechanics
- **Finding:** In `product-spec.md` Section 9.1, the specification states:
  > *"Performs subject impersonation using the delegated administrator email (`sub: admin@customer-domain.com`)."*
- **Technical Vulnerability / API Reality:** In Google Workspace DWD, the `sub` claim in the signed JWT dictates the identity being impersonated:
  1. For **Directory API calls** (`users.list`, `groups.list`), `sub` must be a delegated administrator who possesses Directory API administrative privileges.
  2. For **Gmail API calls** (`users.messages.list`, `trash`, `delete`), an admin cannot simply inspect or trash messages in `user@domain.com`'s mailbox by passing `sub: admin@domain.com` and setting `userId: user@domain.com` unless the service account mints a JWT with `sub: user@domain.com` directly.
- **Architectural Requirement:**
  The `AuthModule` must implement a **dual-credential impersonation strategy**:
  - An Admin-delegated credentials session (`sub = delegated_admin_email`) for Directory API operations.
  - An ephemeral, per-target-user impersonated session (`sub = target_mailbox_email`) for Gmail API calls.
  - **Control Gate:** The tool must strictly validate that the `sub` mailbox email passes domain whitelisting and VIP blocklisting *before* minting the impersonated token.

#### 3.1.3 VIP & Executive Mailbox Protection (Break-Glass Controls)
- Service accounts with DWD have unrestricted access to all mailboxes in the domain.
- **Required Guardrail:** To prevent rogue operators or accidental broad queries from altering mailboxes of C-suite executives, Legal Counsel, or Data Protection Officers, the architecture must support an optional `protected_accounts` blocklist in `tenant.yaml`:
  ```yaml
  security_guardrails:
    protected_accounts:
      - "ceo@company.com"
      - "legal@company.com"
      - "dpo@company.com"
      - "ciso@company.com"
  ```
  Targeting any of these accounts must fail immediately unless explicitly bypassed with a multi-party token and `--override-protected-accounts`.

---

### 3.2 Pillar 2: Credential Security & Secret Storage

#### 3.2.1 Secret Manager vs Local File Storage
The design supports two authentication backends:
1. **Google Cloud Secret Manager (`SecretManagerCredentialProvider`):** Recommended enterprise standard. The service account JSON key is fetched directly into memory using Application Default Credentials (ADC) or Workload Identity.
2. **Local JSON File (`LocalFileCredentialProvider`):** Permitted for local workstations or offline automation.

#### 3.2.2 File Permission & Pre-Flight Validation
For the `LocalFileCredentialProvider`:
- Storing unencrypted service account JSON keys on disk is a high-risk practice.
- **Mandatory Enforcement:** The tool MUST execute a POSIX file permission check at startup:
  - If the private key file has permissions broader than `0600` (`-rw-------`), the application MUST refuse to run and exit with a fatal security error:
    `FATAL: Insecure private key file permissions (0644). Permissions must be 0600. Aborting.`
  - On Windows environments, equivalent strict ACLs (read access restricted exclusively to the executing user) must be verified.
- **Memory Hygiene:** Credential data structures must be kept strictly in memory, never written to temporary files, swap, or operating system caches.

#### 3.2.3 Zero Credential Leakage Guarantee
- Credentials, private keys, client secrets, bearer tokens, and JWT assertions must be explicitly scrubbed from:
  - Application console output and exception stack traces.
  - JSONL audit logs.
  - `.state.jsonl` checkpoint files.
  - Executive CSV reports.
- Python logging configurations must implement a custom `SecretSanitizingFilter` that redacts patterns matching RSA private keys (`-----BEGIN PRIVATE KEY-----`), OAuth tokens (`ya29.*`), and Secret Manager resource URIs.

---

### 3.3 Pillar 3: Cross-Tenant Isolation & Blast Radius Containment

#### 3.3.1 Managed Service Provider (MSP) Multi-Tenant Risks
In Devoteam Managed Services scenarios, an engineer's workstation may contain profiles for multiple clients (e.g., `client-retail`, `client-banking`, `client-healthcare`). The primary catastrophe to prevent is **Cross-Tenant Spillage** (e.g., executing a purge script targeting Client B's employees using Client A's credentials, or vice versa).

#### 3.3.2 Domain Boundary Whitelisting
ADR-0002 introduces `allowed_domains` within `TenantConfig`. This must be enforced with the following strict specifications:
1. **Exact FQDN Matching:** The validation must use exact domain parsing (e.g., extracting the host portion after `@` and performing exact or explicit subdomain match).
2. **Subdomain Traversal Prevention:** A configuration allowing `example.com` must NOT automatically trust `bad-example.com` or untrusted third-level domains unless explicitly defined in `allowed_domains`.
3. **Pre-Execution Scoping Validation:** Before any API call is initiated to Gmail:
   - Every email in a CSV list, OU enumeration, or Group expansion must be evaluated against `allowed_domains`.
   - If an external email address (e.g., an external guest in a Google Group, or a contractor on `@external-partner.com`) is encountered, the tool MUST either automatically quarantine/skip that email or abort execution with a domain violation error.

#### 3.3.3 Profile and State Isolation
- Checkpoint files (`.state_<job_id>.jsonl`) and audit files (`audit_<job_id>.jsonl`) must be stored in tenant-isolated directories or include a cryptographic hash of `tenant_id` in their namespace to prevent resuming a job with the wrong tenant credentials.

---

### 3.4 Pillar 4: Accidental Deletion & Data Loss Prevention (DLP)

#### 3.4.1 Safe-by-Default Architecture
- **Dry-Run Enforcement:** The tool conforms to Devoteam's safe-by-default rule: running `gws-purge` without an explicit `--action trash` or `--action delete` automatically defaults to `--dry-run`.
- **Pre-Flight Query Linting:**
  - The search engine must reject dangerous and unrestricted queries:
    - Empty query string `""`
    - Wildcard queries `*`
    - Broad size/date queries without sender or subject constraints (e.g., `size:>0`, `after:2020/01/01`).
  - The query parser must validate RFC 2822 syntax before making any API calls.

#### 3.4.2 Blast Radius Calculation & Dual-Threshold Safeguards
In `product-spec.md` Section 5 (FR-4.3), a `--max-impact-threshold` is defined (default: 500 messages).
- **Security Assessment:** Relying solely on message count is dangerous. A query that matches 1 message each across 1,000 distinct employee mailboxes affects 1,000 users, whereas 500 messages in a single spam box affects only 1 user.
- **Required Control:** The tool must implement **Dual Blast-Radius Thresholds**:
  1. `max_messages_threshold` (default: 500 messages)
  2. `max_mailboxes_threshold` (default: 100 mailboxes)
- If *either* threshold is breached during simulation, automated headless execution (`--force`) must halt immediately unless an explicit `--override-threshold` flag is supplied alongside an authorization ticket.

#### 3.4.3 Confirmation UX for Destructive Operations
For interactive sessions:
- For Soft Purge (`trash`): Operator must type `CONFIRM`.
- For Hard Purge (`delete`): Operator must type `DELETE-PERMANENTLY`.
- Generic `[y/N]` single-keystroke confirmation is **strictly prohibited** to prevent accidental terminal keystrokes.

#### 3.4.4 Google Vault Legal Hold & Retention Awareness
- Purging emails from active Gmail mailboxes can create compliance exposure if users or administrators believe messages are destroyed when they are subject to litigation discovery.
- Conversely, operators performing privacy expungements (GDPR Right-to-be-Forgotten) must understand that Gmail API deletions do not clear Vault retention holds.
- **Mandatory Control:** 
  The tool CLI and generated audit reports MUST display a prominent compliance notice:
  > `[NOTICE: Google Workspace compliance retention rules and Google Vault litigation holds take precedence. Messages on legal hold remain discoverable in Google Vault even after hard deletion from the active mailbox.]`

---

### 3.5 Pillar 5: Zero-PII Compliance & Audit Trail Integrity

#### 3.5.1 Zero-PII Policy & Subject Line Discrepancy Resolution
A critical discrepancy was identified between the Product Specification and ADR-0004:
- **Product Spec FR-7.1 line 227:** Lists `subject (sanitized or hashed if configured)` as an audit log field.
- **ADR-0004 line 14 & 42:** Highlights that logging email subjects poses severe privacy risks and omits `subject` from the permitted metadata list.

**Security Architecture Ruling:**
1. **Email Body & Attachments:** Zero-PII policy is strictly approved. The tool must ONLY request message metadata using `users.messages.get(..., format='METADATA', metadataHeaders=['Message-ID', 'Date'])`. Under no circumstances shall `format='FULL'` or `format='RAW'` be requested.
2. **Email Subject Lines:** Email subject lines frequently contain sensitive personal data (e.g., HR complaints, salary reviews, medical inquiries). 
   - Logging unmasked subject lines in `audit.jsonl` violates enterprise GDPR Article 5 (data minimization).
   - **Mandated Architecture:**
     - By default, the tool must record `subject_hash: SHA256(subject)` in the audit log.
     - Raw subject logging is permitted **only** if the search query itself was an exact phrase match on the subject (e.g. `subject:"Phishing Subject"`), in which case the subject is already part of the operational audit parameter, OR when an explicit `--log-unmasked-subjects` flag is passed with documented regulatory justification.

#### 3.5.2 Audit Trail Integrity & Non-Repudiation
- ADR-0004 specifies calculating an SHA-256 integrity checksum manifest (`audit.jsonl.sha256`) at job completion.
- **Vulnerability:** If an attacker or compromised operator has write access to the filesystem, they can tamper with `audit.jsonl` and simply regenerate `audit.jsonl.sha256`.
- **Architectural Requirement for Enterprise Sign-Off:**
  - For standalone local runs, the `.sha256` digest is accepted as a baseline integrity check.
  - For enterprise/MSP deployments, the `AuditSink` interface must provide an adapter for **Google Cloud Logging** (direct write to Cloud Audit Logs / Stackdriver) or **Google Cloud Storage with Object Retention / Bucket Lock**. Cloud Audit Logs provide non-repudiable, append-only guarantees that cannot be modified by local operators.

---

## 4. Security Risk Assessment Matrix

```
       5 | [CRIT]               [CRIT]
         |                       R-01
       4 |        [HIGH]        [HIGH]
I        |         R-03          R-02
M      3 |        [MED]         [MED]
P        |         R-05          R-04
A      2 |                      [LOW]
C        |                       R-06
T      1 |
         +---------------------------------
           1     2       3       4       5
                     LIKELIHOOD
```

| Risk ID | Risk Description | Severity | Likelihood | Inherent Risk | Residual Risk (With Controls) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **R-01** | Accidental catastrophic email deletion via unconstrained query | Critical | High | **CRITICAL** | **LOW** (Dry-run default, pre-flight linting, dual blast thresholds, exact-string confirmation) |
| **R-02** | DWD Service Account key compromise leading to lateral domain takeover | Critical | Medium | **HIGH** | **LOW** (Secret Manager storage, POSIX 0600 validation, dynamic scope reduction) |
| **R-03** | Cross-tenant execution in multi-client MSP environment | High | Medium | **HIGH** | **LOW** (Strict FQDN boundary check, profile-isolated state & audit directories) |
| **R-04** | Unauthorized deletion of executive / legal hold communications | High | Medium | **HIGH** | **LOW** (Protected VIP account blocklist, dual-custody approval tokens) |
| **R-05** | Leakage of sensitive employee PII/PHI in audit logs | Medium | High | **HIGH** | **LOW** (`format=METADATA`, subject hashing, zero body/snippet retrieval) |
| **R-06** | Tampering with local audit logs to conceal malicious purge | Medium | Low | **MEDIUM** | **LOW** (SHA-256 digest manifest, optional Cloud Logging sink) |

---

## 5. Mandatory Architecture & Implementation Controls

To transition this solution from **CONDITIONALLY GRANTED** to **FULL PRODUCTION SIGN-OFF**, engineering must implement the following controls across the codebase:

### 5.1 Priority 0: Blocking Security Requirements (Must be implemented before release)

1. **[P0-SEC-01] Dual-Credential DWD Subject Scoping:**
   - Explicitly decouple Admin Directory API credentials (`sub: delegated_admin`) from individual Gmail API target credentials (`sub: target_user`).
   - Validate that target user emails match `allowed_domains` prior to requesting individual impersonated OAuth tokens.
2. **[P0-SEC-02] Local File Permission Guardrail:**
   - In `LocalFileCredentialProvider`, implement an automatic pre-flight check asserting that file permissions are strictly `0600` on POSIX systems.
   - Immediately abort with a fatal exit code if permissions are permissive (`> 0600`).
3. **[P0-SEC-03] Subject Line PII Protection & Discrepancy Resolution:**
   - Resolve the discrepancy between Product Spec FR-7.1 and ADR-0004.
   - Enforce HMAC-SHA256 hashing on all logged subject lines by default.
   - Strictly prohibit fetching message bodies, snippets, or attachments (`format=METADATA` only).

### 5.2 Priority 1: High-Priority Controls (Required for enterprise MSP hardening)

4. **[P1-SEC-04] Dual Blast-Radius Threshold Enforcement:**
   - Implement dual safeguards: `--max-messages <N>` (default: 500) and `--max-mailboxes <N>` (default: 100).
   - Abort automated runs if either threshold is exceeded unless `--override-threshold` is explicitly provided.
5. **[P1-SEC-05] High-Risk Action Confirmation Gating:**
   - Require typing `DELETE-PERMANENTLY` for `delete` mode (hard purge).
   - Require typing `CONFIRM` for `trash` mode (soft purge).
   - Implement ticket/token validation parameter (`--token <TICKET_ID>`) required for any headless destructive execution.
6. **[P1-SEC-06] VIP / Protected Accounts Guardrail:**
   - Support a `protected_accounts` configuration list.
   - Scans touching protected accounts must flag a warning; purges against protected accounts must abort unless explicitly overridden with `--override-protected-accounts`.

### 5.3 Priority 2: Quality & Compliance Enhancements

7. **[P2-SEC-07] Cloud Logging / Remote Audit Sink:**
   - Implement a remote audit sink adapter (e.g. Google Cloud Logging) to provide tamper-evident, append-only logging for enterprise MSP deployments.
8. **[P2-SEC-08] Google Vault Compliance Notification:**
   - Display and log the Google Vault retention notice on CLI startup and within executive summary reports.

---

## 6. Security Gatekeeper Sign-Off Attestation

```
================================================================================
                    DEVOTEAM G CLOUD SECURITY ARCHITECTURE
                           SIGN-OFF ATTESTATION
================================================================================

Solution Name   : Whitelabel Google Workspace Email Purge Tool (gws-purge)
Document Review : DEV-PRD-GWS-PURGE-001, ADR-0001 through ADR-0004
Review Date     : October 2026
Security Lead   : Devoteam G Cloud Security Architect (@security-architect)

STATUS: [ CONDITIONALLY GRANTED ]

ATTESTATION:
The architectural foundation of 'gws-purge' is fundamentally sound, demonstrating
exemplary least-privilege scoping, resilient quota management, and a zero-PII
audit philosophy.

Security Sign-Off is officially GRANTED for engineering implementation, with the
stipulation that the Priority 0 (P0) controls identified in Section 5.1 of this
review must be implemented and verified via automated test suites prior to any
production deployment or customer tenant execution.

================================================================================
```
