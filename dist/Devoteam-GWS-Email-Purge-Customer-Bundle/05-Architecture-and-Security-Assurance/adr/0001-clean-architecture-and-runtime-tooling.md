# ADR-0001: Clean Architecture Pattern and Python Runtime Tooling

- **Status:** Accepted
- **Deciders:** Lead Cloud Architect, Application Architect, DevOps Architect
- **Date:** October 2026
- **Technical Story:** Architecture Board - GWS Email Purge Foundation

---

## Context & Problem Statement

The Google Workspace Email Purge Tool (`gws-purge`) must operate reliably across multiple enterprise client environments, handling large-scale mailbox searches, rate-limited batch purges, and critical incident response scenarios. The tool requires a codebase that is modular, testable, decoupled from third-party vendor frameworks, and easily maintainable by Devoteam G Cloud managed service teams.

We need to establish:
1. The structural architectural pattern for the codebase.
2. The language runtime, packaging, and dependency management standard.
3. The CLI/Interface design pattern supporting white-label branding.

## Decision Drivers

* **Devoteam G Cloud Standard:** Strictly use modern Python tooling (`uv` with `pyproject.toml`, Google Python Style Guide, strict typing, `ruff`).
* **Testability & Decoupling:** Business domain logic (scoping, purge validation, blast radius, quota calculations) must be testable without connecting to live Google Workspace APIs.
* **Whitelabel Agility:** Customer branding (banners, titles, log prefixes) and credential backends must be hot-swappable via configuration without modifying business logic.
* **High Performance:** Lightweight runtime with minimal startup latency for CLI responsiveness and concurrent async execution.

## Considered Options

1. **Option 1: Clean Architecture (Hexagonal / Ports & Adapters) with Python 3.11+ and `uv`**
2. **Option 2: Monolithic Script-based design with `pip`/`requirements.txt`**
3. **Option 3: Go / Golang compiled binary**

## Decision Outcome

Chosen option: **Option 1: Clean Architecture with Python 3.11+ and `uv`**.

### Architectural Topology

We adopt Clean Architecture organized into four strictly decoupled concentric layers:

```
┌────────────────────────────────────────────────────────┐
│                   CLI / Interface                      │
│   (Typer / Click, Rich Terminal UI, Whitelabel Banners)│
└──────────────────────────┬─────────────────────────────┘
                           │ calls
┌──────────────────────────▼─────────────────────────────┐
│                 Application Services                   │
│ (PurgeOrchestrator, BlastRadiusCalculator, JobTracker) │
└──────────────────────────┬─────────────────────────────┘
                           │ coordinates
┌──────────────────────────▼─────────────────────────────┐
│                     Domain Core                        │
│    (TenantProfile, MessageQuery, PurgeAction, Quota)   │
└──────────────────────────▲─────────────────────────────┘
                           │ implements ports
┌──────────────────────────┴─────────────────────────────┐
│                  Adapters & Ports                      │
│  - Google Workspace Clients (Gmail API, Directory API) │
│  - Secret Backends (Local File, GCP Secret Manager)    │
│  - Audit Sinks (JSONL, CSV, GCP Cloud Logging)         │
│  - State Storage (File Checkpointer)                   │
└────────────────────────────────────────────────────────┘
```

1. **Domain Layer (`src/gws_purge/domain`):** Pure Python entities and value objects without external dependencies (`TenantConfig`, `MailboxTarget`, `SearchQuery`, `PurgeResult`, `PurgeMode`, `QuotaBucket`).
2. **Ports / Interfaces (`src/gws_purge/ports`):** Abstract Base Classes (`IMailboxClient`, `IDirectoryClient`, `ISecretProvider`, `IAuditSink`, `IStateTracker`).
3. **Application Services (`src/gws_purge/services`):** Use cases coordinating discovery, simulation, execution, rate limiting, and reporting (`PurgeService`, `DiscoveryService`, `SimulationService`).
4. **Adapters (`src/gws_purge/adapters`):** Concrete implementations of ports (`GmailApiAdapter`, `AdminDirectoryAdapter`, `SecretManagerAdapter`, `JsonlAuditAdapter`, `CsvReportAdapter`).
5. **Presentation Layer (`src/gws_purge/cli`):** Dynamic CLI interface utilizing `typer` and `rich`, injecting tenant branding profiles at runtime.

### Tooling & Packaging Standards

* **Package Manager:** `uv` exclusively (`uv venv`, `uv pip compile`, `uv run`).
* **Packaging:** Standards-compliant `pyproject.toml` (PEP 517/621 / `hatchling`).
* **Type Safety:** 100% static type hints with `mypy` strict mode and Pydantic v2 data models.
* **Linting & Formatting:** `ruff` with Google conventions (line length 100, isort import sorting).
* **Testing:** `pytest` with `pytest-asyncio` and `pytest-mock` achieving $\ge 90\%$ branch coverage.

## Consequences

### Positive
* High testability: Domain logic and use cases can be unit-tested using mock adapters in milliseconds without GCP network access.
* Whitelabel flexibility: Adding new branding, new storage backends, or new audit outputs requires only adding an adapter without modifying core workflows.
* Enterprise alignment: Conforms directly with Devoteam G Cloud Python engineering and packaging directives.

### Negative / Trade-offs
* Requires formal separation of interfaces and adapters, adding initial boilerplate compared to a single-file script.
