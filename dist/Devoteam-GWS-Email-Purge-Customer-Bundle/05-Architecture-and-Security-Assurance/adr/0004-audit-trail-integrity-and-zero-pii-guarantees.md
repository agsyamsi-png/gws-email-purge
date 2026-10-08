# ADR-0004: Audit Trail Integrity and Zero-PII Guarantees

- **Status:** Accepted
- **Deciders:** Lead Cloud Architect, Security Architect, Quality Architect
- **Date:** October 2026
- **Technical Story:** Architecture Board - GWS Email Purge Compliance & Privacy

---

## Context & Problem Statement

Remediating emails across corporate inboxes carries extreme legal, regulatory (GDPR, HIPAA), and compliance risks:
1. Hard deletion of emails must be fully auditable for non-repudiation.
2. Conversely, logging the *body* or sensitive *subject lines* of private employee emails into log files or centralized systems creates a severe privacy and regulatory violation.
3. Devoteam managed service engineers and customer SecOps teams require comprehensive reports for executive reporting, while meeting strict Zero-PII standards.

## Decision Drivers

* **Zero-PII Compliance:** Never log or export email bodies, message snippets, attachments, or unmasked sensitive user data.
* **Tamper-Evident Audit Trail:** Every action (who, what, when, query parameters, target mailbox, message IDs affected, action taken, result) must be permanently logged in structured format.
* **Dual Output Formats:** Machine-parseable JSONL for SIEM ingestion and human-readable CSV for executive QBRs and incident post-mortems.
* **Pluggable Architecture:** Support local files and seamless routing to Google Cloud Logging or Cloud Storage.

## Decision Outcome

Chosen option: **Structured Dual-Sink Audit Logging with Strict Zero-PII Masking**.

### Zero-PII Policy

1. **Permitted Metadata Fields in Audit Logs:**
   - Session Execution ID (UUIDv4)
   - Tenant ID and delegated admin email
   - Invocation timestamp (ISO 8601 UTC)
   - Operational mode (`dry-run`, `trash`, `delete`)
   - Search Query string (as provided by operator)
   - Target User Email address
   - Gmail Message ID (hex identifier, e.g., `18e47f9b2d8c301a`)
   - Gmail Thread ID
   - RFC 822 `Message-ID` header (e.g., `<abc.123@phishing-domain.com>`)
   - RFC 2822 `Date` header
   - Execution status (`success`, `skipped`, `error`) and latency
2. **Strictly Prohibited Fields (Never Fetched, Logged, or Cached):**
   - Email Body (HTML or Plain Text)
   - Email Snippet
   - Attachment content or filenames
   - Raw email payload headers (other than Message-ID and Date)

### Dual-Sink Logging Architecture

1. **`audit.jsonl` (Append-Only Machine Log):**
   - Each action produces an immutable JSON line conforming to the `AuditEvent` schema.
   - Ideal for ingestion into Splunk, Google Cloud Chronicle, or Google Cloud Logging.
2. **`report.csv` (Executive Summary Report):**
   - Tabular summary containing `ExecutionID`, `Timestamp`, `TenantID`, `Mailbox`, `GmailMessageID`, `RFC822MessageID`, `Action`, `Result`.
3. **Audit Log Integrity Hashing:**
   - At the conclusion of a run, the tool generates an SHA-256 integrity checksum manifest (`audit.jsonl.sha256`) to ensure the audit trail cannot be modified after the fact without detection.

## Consequences

### Positive
* Complete compliance with enterprise privacy standards (GDPR Article 5, HIPAA, ISO 27001).
* SIEM and SOC integration ready out of the box via JSONL.
* Cryptographic checksum prevents post-incident tampering of purge logs.

### Negative / Trade-offs
* Because bodies and full headers are not stored in the audit log, pre-purge verification relies entirely on the operator reviewing the query parameters and dry-run blast radius.
