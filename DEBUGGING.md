# Engineering Debugging Log (DEBUGGING.md)

This document records real technical issues, failed assumptions, root-cause analyses, and resolutions encountered during the engineering and testing of the **Ahoum Sessions Marketplace**.

---

## Issue 1: SQLite File-Lock Contention vs. PostgreSQL Row-Locking in Multi-Threaded Concurrency Tests

### Symptom
When executing the multi-threaded race condition test (`10 concurrent threads` targeting `capacity=1`), several threads raised:
```text
django.db.utils.OperationalError: database is locked
```
While no oversubscription occurred, threads were aborting due to SQLite file-level mutex conflicts rather than gracefully waiting on the session row lock and receiving the clean application-level `Session is fully booked` validation error.

### Diagnosis & Root Cause
1. **Thread-Local Connection Reuse**: Python's `concurrent.futures.ThreadPoolExecutor` reuses OS threads. Django binds database connections to thread-local storage (`django.db.connection`). If a thread inherits an unclosed connection handle from a previous task or sharing context, transaction states collide.
2. **Database Engine Differences (SQLite vs PostgreSQL)**: SQLite uses a file-level database lock for writes. When `select_for_update()` is invoked on SQLite, SQLite locks the *entire database file*. Under concurrent thread bursts, threads that fail to acquire the file lock within the timeout throw `database is locked`.
3. Conversely, **PostgreSQL** implements True Multi-Version Concurrency Control (MVCC) with fine-grained row-level locks (`SELECT FOR UPDATE`). In PostgreSQL, concurrent transactions on the same row wait in a queue for the lock release without locking the entire table or database.

### Fix
1. **Connection Lifecycle Management**: In all concurrent worker threads, explicitly invoked `connection.close()` at thread entry and exit (`finally` block) to ensure clean, isolated database socket connections.
2. **Test Harness Selection**: Configured concurrency tests using Django's `TransactionTestCase` instead of standard `TestCase`. Standard `TestCase` wraps the entire test in a single overarching database transaction (which prevents cross-thread visibility of committed records), whereas `TransactionTestCase` allows authentic multi-threaded transaction boundaries and commit visibility.
3. **Engine-Specific Behavior Documentation**: In Docker Compose and production, PostgreSQL is configured where `select_for_update()` operates at individual row granularity.

### Verification
- Ran `python backend/manage.py test sessions_app.tests.test_concurrency` -> **9/9 tests passed in 0.48s**.
- Ran `python backend/run_concurrency_demo.py` -> Confirmed exactly 1 thread acquires seat, remaining threads receive clean rejection, and database strictly maintains `total_confirmed = 1`.

---

## Issue 2: Frontend Bundle Breakage on Third-Party Brand Icon Deprecation

### Symptom
Running `npm run build` failed during Rollup tree-shaking with:
```text
error during build:
src/components/AuthModal.jsx (10:2): "Github" is not exported by "node_modules/lucide-react/dist/esm/lucide-react.mjs"
```

### Diagnosis & Root Cause
The initial frontend authentication modal imported the `Github` icon directly from `lucide-react`. However, in recent major versions of `lucide-react`, brand and corporate trademarks (e.g. GitHub, Google, Twitter) were removed from the core icon distribution to comply with trademark guidelines and reduce library bundle bloat.

### Fix
1. Removed the missing `Github` import from `lucide-react` across `AuthModal.jsx` and `App.jsx`.
2. Implemented lightweight, inline SVG vectors for both Google and GitHub brand logos.
3. Standardized all general iconography (such as `ShieldCheck`, `Calendar`, `Users`, `Zap`, `AlertCircle`) using valid native Lucide icons.

### Verification
- Executed `npm run build` in `frontend/`.
- Build succeeded in **3.77s**, generating clean, minified production assets in `frontend/dist/` (`dist/assets/index-*.js`, `dist/assets/index-*.css`) with zero bundle errors.
