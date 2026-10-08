# ADR-0003: Rate Limiting, Worker Concurrency, and Job Checkpointing

- **Status:** Accepted
- **Deciders:** Lead Cloud Architect, Application Architect, DevOps Architect
- **Date:** October 2026
- **Technical Story:** Architecture Board - GWS Email Purge Reliability & Scale

---

## Context & Problem Statement

Google Workspace APIs enforce strict per-user and project-wide rate limits:
- **Gmail API Per-User Quota:** 250 quota units per user per second (Search/List = 5 units, Get = 5 units, Trash = 50 units, Delete = 50 units).
- **Gmail API Project-wide Quota:** Typically 25,000 to 50,000 units per second across all users.
- **Admin Directory API Quota:** 1,500 requests per 100 seconds per project.

When purging an active phishing campaign or executing a multi-thousand mailbox cleanup:
1. Uncontrolled parallel requests against the same user or project will trigger `HTTP 429 (Too Many Requests)` or `HTTP 503 (Backend Error)`.
2. A crash or network disruption mid-way through a 10,000-user purge could cause incomplete remediation or redundant re-purging if state is not preserved.

## Decision Drivers

* **Zero Rate-Limit Lockout:** Strictly operate within Gmail per-user and per-project quota limits.
* **Deterministic Throughput:** Optimize execution speed using bounded concurrency without triggering cascading backoff.
* **Resumability:** A long-running purge operation must be cleanly interruptible (SIGINT/SIGTERM) and capable of resuming exactly where it left off.
* **Lightweight Concurrency:** Python concurrency model must remain simple, debuggable, and stable.

## Considered Options

1. **Option 1: Asynchronous Worker Pool (`asyncio`) with Per-User Token Buckets and Append-Only JSONL Checkpointing**
2. **Option 2: Multi-threaded / Process pool (`concurrent.futures`) with SQLite Checkpoint Database**
3. **Option 3: External Message Queue (Google Cloud Pub/Sub + Cloud Tasks)**

## Decision Outcome

Chosen option: **Option 1: Asynchronous Worker Pool (`asyncio`) with Per-User Token Buckets and Append-Only JSONL Checkpointing**.

### Concurrency & Rate Limiting Architecture

```
                    ┌─────────────────────────┐
                    │    Target Mailboxes     │
                    │   (Queue of N Users)    │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Asyncio Worker Pool   │ (Bounded concurrency: default 10 workers)
                    └────┬───────────────┬────┘
                         │               │
        ┌────────────────▼───┐       ┌───▼────────────────┐
        │  Worker 1 (user A) │       │ Worker 2 (user B)  │
        └────────┬───────────┘       └───┬────────────────┘
                 │                       │
      ┌──────────▼────────────┐       ┌──▼───────────────────┐
      │ Per-User Token Bucket │       │ Per-User Token Bucket│
      │  (Max 200 units/sec)  │       │ (Max 200 units/sec)  │
      └──────────┬────────────┘       └──┬───────────────────┘
                 │                       │
      ┌──────────▼───────────────────────▼──┐
      │   Exponential Backoff with Jitter   │ (Handles 429/500/503 errors)
      └──────────────────┬──────────────────┘
                         │
                 ┌───────▼────────┐
                 │ Gmail REST API │
                 └───────┬────────┘
                         │
                 ┌───────▼────────┐
                 │  Checkpoint &  │
                 │ Audit Sink     │ (.state.jsonl append-only)
                 └────────────────┘
```

1. **Worker Pool:** Bounded concurrency using `asyncio.Semaphore` (configurable, default 10 concurrent mailboxes; max recommended 25).
2. **Per-User Token Bucket:** Enforces a conservative limit of **200 quota units/sec per mailbox** (leaving a 20% safety margin below Gmail's 250 units/sec ceiling).
3. **Backoff & Jitter:** Wrap all API requests with exponential backoff and full jitter:
   $$\text{wait\_time} = \min(\text{max\_wait}, \text{base\_delay} \times 2^{\text{attempt}}) \times \text{random}(0.5, 1.5)$$
   Max retries = 5; base delay = 1.0s; max wait = 32.0s.
4. **Append-Only State Checkpointing (`.state.jsonl`):**
   - Each completed mailbox operation appends a state record: `{"user": "user@domain.com", "status": "completed", "purged_count": 2, "timestamp": "..."}`.
   - On startup with `--resume`, the checkpointer reads `.state.jsonl`, gathers the set of already completed mailboxes, and skips them instantly.
   - Checkpointing uses atomic append operations, safe against sudden process termination.
5. **Signal Handling:** Graceful shutdown traps `SIGINT` (Ctrl+C) and `SIGTERM`, drains in-flight mailbox workers, flushes state, and exits with code 130 without corrupting state.

## Consequences

### Positive
* Predictable, smooth API consumption without hitting Google quota thresholds.
* Resumability prevents duplicated work and enables confident execution on large enterprise domains.
* Zero external infrastructure required for state management (no local SQL database or external broker needed).

### Negative / Trade-offs
* Requires careful asynchronous handling of the Google API Python client via thread pool executors or `httpx` async wrappers.
