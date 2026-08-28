# Architecture & Engineering Decisions (DECISIONS.md)

This document details the architectural decisions, database vs. application invariants, concurrency locking strategies, and trade-offs made during the design and implementation of the **Ahoum Sessions Marketplace**.

---

## Decision 1: Why GitHub OAuth Instead of Google (and Dual-Mode Evaluator Auth)

### Context & Comparison
For developer-centric and technical marketplace platforms, authentication needs to be reliable, transparent, and low friction:
1. **GitHub OAuth vs Google OAuth**:
   - **Simplicity of Scopes & Tokens**: GitHub's OAuth authorization code flow (`https://github.com/login/oauth/access_token` and `/user`) has minimal overhead, well-defined `read:user` and `user:email` scopes, and fewer consent-screen configuration traps (e.g. unverified app warnings, test user restrictions) compared to Google Cloud Console OAuth 2.0 Client screens.
   - **Target Audience Alignment**: A technical sessions marketplace caters directly to software engineers, architects, and technical creators who already maintain active GitHub profiles with public avatars and bios.
   - **Direct Email Verification**: GitHub exposes a clean email resolution endpoint (`/user/emails`), allowing the backend to deterministically identify primary verified emails even if the user keeps their profile email private.

2. **Dual-Mode Implementation (Full OAuth + Instant Demo Sign-In)**:
   - Live OAuth flows require reviewers to configure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`.
   - To make the evaluator experience completely friction-free while keeping real OAuth 100% functional, we implemented a dual-mode strategy: real GitHub/Google OAuth endpoints (`/api/auth/github/`, `/api/auth/google/`) AND an instant demo authentication endpoint (`/api/auth/demo/`) that issues genuine, cryptographically signed SimpleJWT tokens with full role claims (`USER` or `CREATOR`).

---

## Decision 2: Why `select_for_update()` Row-Locking Instead of Checking Seats in Frontend

### Problem Statement & TOCTOU Race Condition
When a high-demand session has only 1 remaining seat (`capacity=1`) and multiple users attempt to book simultaneously, checking remaining seats in the frontend UI or in naive un-locked backend code creates a catastrophic **Time-of-Check to Time-of-Use (TOCTOU)** race condition.

### Why Frontend Checks Structurally Fail:
1. **Stale UI State & Latency Window**: User A and User B both view the page showing `1 seat available`. User A clicks "Book" at `10:00:00.100`. User B clicks "Book" at `10:00:00.150` before any WebSocket or polling updates User B's browser. Both browsers allow the click because their local state said seats were open.
2. **Client Bypass**: Any client can bypass frontend buttons by sending direct concurrent HTTP `POST /api/sessions/:id/book` requests via `curl`, Python scripts, or automated load tools.
3. **Non-Deterministic Packet Delivery**: In distributed networks, arrival order at the backend is unpredictable.

### Why `select_for_update()` is the Superior Solution:
Inside a database transaction (`with transaction.atomic():`), `Session.objects.select_for_update().get(id=session_id)` acquires an exclusive row lock in PostgreSQL (`FOR UPDATE`).
- Subsequent concurrent booking requests for the *same session* block at the database row lock until the first transaction commits or rolls back.
- When the second transaction acquires the lock, it evaluates `current_confirmed` against the authoritative, committed database state.
- Because `current_confirmed` is now equal to `capacity`, the transaction immediately aborts with a clean `400 Bad Request: Session is fully booked`.
- **Zero overbooking is mathematically guaranteed.**

---

## Decision 3: Why Database `UniqueConstraint` Instead of Checking Duplicates Only in Code

### Defense-in-Depth & Storage Engine Atomicity
Application-level checks (e.g. `if Booking.objects.filter(user=user, session=session, status='CONFIRMED').exists(): reject`) are necessary for clean error messages, but they are insufficient on their own in high-concurrency environments.

### The Double-Booking Vulnerability:
If a user rapidly double-clicks a booking button or fires two simultaneous API requests across two worker threads:
1. Thread 1 executes `Booking.objects.filter(...)` -> returns `False`.
2. Thread 2 executes `Booking.objects.filter(...)` -> returns `False`.
3. Thread 1 writes `Booking(status='CONFIRMED')`.
4. Thread 2 writes `Booking(status='CONFIRMED')`.
5. The user is booked twice for the same workshop.

### The Solution: Partial Database Unique Constraint
We declared a database-level partial unique constraint in PostgreSQL:
```python
class Meta:
    constraints = [
        models.UniqueConstraint(
            fields=['session', 'user'],
            condition=models.Q(status=BookingStatus.CONFIRMED),
            name='unique_active_user_session_booking'
        )
    ]
```
- **Storage-Engine Enforced**: PostgreSQL guarantees uniqueness at the B-tree index level. Even if two transactions run simultaneously, the database rejects the second insert with an `IntegrityError`.
- **Supports Lifecycle Re-booking**: Because the condition is `condition=Q(status='CONFIRMED')`, if a user cancels an active booking (`status='CANCELLED'`), they are permitted to re-book the session in the future without index violation.

---

## Decision 4: Architecture & Reverse Proxy Isolation via Nginx

### Problem Statement
Running the React frontend on port `3000`/`5173` and the Django REST API on port `8000` introduces CORS preflight overhead (`OPTIONS` requests on every call), cookie/header transport friction, and fragmented deployment ports.

### Solution
We configured an **Nginx Reverse Proxy** container as the unified gateway on port `80`:
- `/api/*` & `/admin/*` -> proxied to `backend:8000`
- `/*` -> serves optimized production assets from the static frontend build
- Eliminates CORS issues in production, centralizes logging, simplifies SSL termination, and allows client code to use clean relative API paths (`/api/sessions/`).
