# ADR-0002: Domain-Wide Delegation (DWD) & Multi-Tenant Credential Management

- **Status:** Accepted
- **Deciders:** Lead Cloud Architect, Security Architect, Cloud Architect
- **Date:** October 2026
- **Technical Story:** Architecture Board - GWS Email Purge Authentication & Security

---

## Context & Problem Statement

To purge emails across any user mailbox in an enterprise Google Workspace domain, the tool must act with administrative authority on behalf of targeted users. Furthermore, Devoteam G Cloud manages multiple distinct customer domains; hence the tool must support:
1. Secure, non-interactive impersonation of domain users without requiring their individual passwords or interactive OAuth user consent.
2. Separation of customer credentials, avoiding accidental cross-tenant execution.
3. Secure key storage options (local JSON for self-hosted customer installations or Google Cloud Secret Manager for hosted MSP operations).
4. Strict least-privilege OAuth scopes to satisfy customer InfoSec compliance.

## Decision Drivers

* **Security & Least Privilege:** Restrict OAuth scopes to the absolute minimum necessary to perform discovery and purge operations.
* **Customer Isolation:** Tenant configurations must be completely compartmentalized with strict validation on domain boundaries.
* **Secret Protection:** Zero hardcoded credentials; support GCP Secret Manager (`projects/*/secrets/*/versions/*`) with automatic in-memory resolution.
* **Auditability:** Authentication context (delegated subject, client email, project ID) must be recorded in session audit metadata.

## Considered Options

1. **Option 1: Service Account Domain-Wide Delegation (DWD) with Granular Scopes**
2. **Option 2: User-level 3-legged OAuth2 (Consent Screen per user)**
3. **Option 3: Google Admin Console Session Cookie Scraping**

## Decision Outcome

Chosen option: **Option 1: Service Account Domain-Wide Delegation (DWD) with Granular Scopes**.

### OAuth Scope Matrix

The tool requires Google Workspace Super Admin authorization in the Google Workspace Admin Console (`Security > Access and data control > API controls > Domain-wide delegation`).

| Purpose | Minimal OAuth Scope | Justification |
| :--- | :--- | :--- |
| **Directory Discovery** | `https://www.googleapis.com/auth/admin.directory.user.readonly` | Enumerate users by Org Unit (OU) or domain-wide. |
| **Group Expansion** | `https://www.googleapis.com/auth/admin.directory.group.readonly` | Resolve member mailboxes when targeting a Google Group. |
| **Search & Simulation** | `https://www.googleapis.com/auth/gmail.readonly` | Search mailbox messages during Dry-Run simulations. |
| **Soft Purge (Trash)** | `https://www.googleapis.com/auth/gmail.modify` | Move matching messages to Trash (`users.messages.trash`). |
| **Hard Purge (Permanent)** | `https://mail.google.com/` | Permanently expunge messages (`users.messages.delete`). Required because Gmail API restricts `users.messages.delete` to the full mail scope. |

> [!IMPORTANT]
> The tool shall dynamically request **only the scope matching the execution mode**:
> - If `--dry-run` or search only: Request only `gmail.readonly` and directory scopes.
> - If `--mode trash`: Request `gmail.modify`.
> - If `--mode delete`: Request `https://mail.google.com/`.
> This guarantees that read-only simulations never possess write or delete permissions.

### Multi-Tenant Credential Abstraction

We define a standardized tenant profile (`TenantConfig`) supporting two secure credential providers:
1. `LocalFileCredentialProvider`: Reads the service account JSON key from a local path restricted to `0600` POSIX file permissions.
2. `SecretManagerCredentialProvider`: Fetches the service account JSON key dynamically from Google Cloud Secret Manager at runtime using ADC (Application Default Credentials).

```yaml
# Tenant Profile Schema (tenant.yaml)
tenant_id: "acme-corp"
tenant_name: "Acme Corporation"
branding:
  tool_name: "Acme Security Incident Response Tool"
  header_banner: "Acme Corp GWS Mailbox Remediation"
  support_url: "https://support.acme.example.com"
auth:
  credential_source: "secret_manager" # or "file"
  secret_resource_id: "projects/acme-secops-prod/secrets/gws-purge-sa-key/versions/latest"
  # credential_file_path: "/etc/gws-purge/acme-sa.json"
  delegated_admin_email: "admin@acme.example.com"
  allowed_domains:
    - "acme.example.com"
    - "subsidiary.example.com"
```

### Domain Boundary Validation

Before executing any API call against a mailbox, the tool strictly verifies that the target email's domain matches `TenantConfig.allowed_domains`. If a mismatch is detected, execution aborts immediately to prevent cross-tenant contamination.

## Consequences

### Positive
* Zero interactive friction during emergency cyber incidents.
* Scopes are partitioned dynamically based on operational mode.
* Credentials can be kept securely in Google Secret Manager, avoiding plaintext keys on disk.
* Domain boundary validation strictly prevents cross-tenant spills.

### Negative / Trade-offs
* Domain-Wide Delegation requires one-time manual setup by customer GWS Super Admin. Clear step-by-step documentation and verify commands must be provided.
