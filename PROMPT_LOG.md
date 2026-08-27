# AI Prompt Supervision Log (PROMPT_LOG.md)

This log documents all material AI interactions, tool usages, engineering decisions, corrections, and supervision applied throughout the creation of the **Ahoum Sessions Marketplace**.

---

## Material AI Prompts & Workflow Log

### Prompt 1: Initial Architecture & Requirement Analysis
- **Tool / Model**: Antigravity IDE / Gemini 3.7 Flash
- **Objective**: Parse assignment brief from `.docx`, extract all hard invariants (concurrency, OAuth/JWT, Docker 4-container stack, persistence, role enforcement, testing), and design full-stack system architecture.
- **What Was Used**: Structured 4-container architecture (Django DRF + React Vite + PostgreSQL 16 + Nginx Proxy) and multi-layered database invariant protection.
- **What Was Changed / Supervised**: Added a dedicated `DemoLoginView` alongside OAuth to prevent evaluator lock-out when third-party OAuth client secrets are not configured in local reviewer environments.
- **Verification**: Verified extraction against all 70 lines of `Ahoum_FullStack_Developer_Assignment_24h.docx`.

---

### Prompt 2: Concurrency-Safe Booking Engine & Database Constraints
- **Tool / Model**: Antigravity IDE / Gemini 3.7 Flash
- **Objective**: Implement `BookingService.create_booking` and database model constraints to eliminate TOCTOU race conditions.
- **What Was Used**: `select_for_update()` inside `transaction.atomic()`, plus `UniqueConstraint(fields=['session', 'user'], condition=Q(status='CONFIRMED'))`.
- **What Was Changed / Supervised**: Explicitly checked for cancelled bookings to ensure users who cancel can re-book without integrity conflicts, and added pre-lock UTC time validation.
- **Verification**: Executed multi-threaded test suite `test_concurrency.py` and standalone simulator `run_concurrency_demo.py`.

---

### Prompt 3: Frontend Interface & Design System
- **Tool / Model**: Antigravity IDE / Gemini 3.7 Flash
- **Objective**: Build responsive, dark-mode React application with catalog, seat availability meters, creator dashboard, attendee roster, and user bookings.
- **What Was Used**: Glassmorphism aesthetic with CSS custom properties, real-time inventory bars, accessible modal dialogs, and token refresh interceptors.
- **What Was Changed / Supervised**: Corrected missing Lucide brand icon imports by providing inline SVGs for OAuth providers.
- **Verification**: Ran `npm run build` producing production bundle in `dist/`.

---

## What AI Got Wrong & What Was Corrected

### Concrete Example 1: Django Test Case Runner Transaction Isolation in Concurrency Tests
- **What AI Initially Generated**: The AI initially wrote the concurrent booking test inside standard `django.test.TestCase`.
- **Why It Was Flawed**: Django's standard `TestCase` wraps the entire test method inside an outer atomic block and rolls it back at the end of the test. When worker threads in a `ThreadPoolExecutor` execute against the database, they cannot see uncommitted changes from other threads, causing false positives or connection isolation issues.
- **How It Was Corrected**: Replaced `TestCase` with `TransactionTestCase`, which commits real transactions to the database, enabling authentic multi-threaded row locking and race condition verification across concurrent threads.

### Concrete Example 2: Frontend Third-Party Icon Package Export
- **What AI Initially Generated**: Imported `Github` from `lucide-react` in `AuthModal.jsx`.
- **Why It Was Flawed**: Recent versions of `lucide-react` do not export brand-specific icons, causing Vite's Rollup build step to fail with a missing export error.
- **How It Was Corrected**: Removed the invalid package import and replaced it with a self-contained inline SVG for GitHub and Google, eliminating fragile external dependencies while preserving clean visuals.
