"""
Standalone Concurrency Race Condition Demo Script
=================================================
Demonstrates how the Sessions Marketplace backend prevents oversubscription
when multiple users attempt to book a single remaining seat at the exact same moment.

Usage:
    python backend/run_concurrency_demo.py
"""

import os
import sys
import time
import django
import concurrent.futures
from datetime import timedelta

# Set up Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'marketplace_core.settings')
django.setup()

from django.utils import timezone
from django.db import connection
from django.contrib.auth import get_user_model
from users.models import UserRole
from sessions_app.models import Session, Booking, SessionStatus, BookingStatus
from sessions_app.services import BookingService

User = get_user_model()


def main():
    print("=" * 70)
    print(" 🚀 AHOUM SESSIONS MARKETPLACE - CONCURRENCY RACE CONDITION TEST ")
    print("=" * 70)

    # 1. Prepare Creator and Session with CAPACITY = 1
    creator, _ = User.objects.get_or_create(
        email="demo_creator@ahoum.com",
        defaults={"username": "demo_creator", "role": UserRole.CREATOR}
    )

    now = timezone.now()
    session = Session.objects.create(
        title="[CONCURRENCY RACE] Exclusive 1-Seat High-Frequency Workshop",
        description="A session with capacity=1 targeted by 10 simultaneous concurrent requests.",
        creator=creator,
        start_time=now + timedelta(days=1),
        end_time=now + timedelta(days=1, hours=2),
        capacity=1,
        price=100.00,
        status=SessionStatus.ACTIVE
    )

    print(f"\n[1] Created Test Session: '{session.title}'")
    print(f"    - Session ID: {session.id}")
    print(f"    - Total Capacity: {session.capacity} seat")
    print(f"    - Initial Remaining Seats: {session.remaining_seats}")

    # 2. Prepare 10 distinct users
    num_threads = 10
    users = []
    for i in range(num_threads):
        user, _ = User.objects.get_or_create(
            email=f"racer_{i+1}@ahoum.com",
            defaults={"username": f"racer_{i+1}", "role": UserRole.USER}
        )
        users.append(user)

    print(f"\n[2] Prepared {num_threads} distinct simulated users for simultaneous booking.")
    print(f"    Simulating {num_threads} parallel threads firing at the exact same millisecond...\n")

    time.sleep(1)

    # 3. Fire parallel concurrent booking requests
    def execute_booking_thread(user_obj, thread_idx):
        connection.close()  # Ensure each thread gets an independent DB connection
        start_t = time.perf_counter()
        try:
            booking = BookingService.create_booking(user=user_obj, session_id=session.id)
            elapsed = (time.perf_counter() - start_t) * 1000
            return {
                "thread_idx": thread_idx,
                "user": user_obj.email,
                "success": True,
                "booking_id": booking.id,
                "elapsed_ms": elapsed,
                "msg": f"✅ [Thread #{thread_idx:02d}] CONFIRMED -> Booking #{booking.id} acquired in {elapsed:.2f}ms"
            }
        except Exception as e:
            elapsed = (time.perf_counter() - start_t) * 1000
            return {
                "thread_idx": thread_idx,
                "user": user_obj.email,
                "success": False,
                "error": str(e),
                "elapsed_ms": elapsed,
                "msg": f"❌ [Thread #{thread_idx:02d}] REJECTED  -> {e} (in {elapsed:.2f}ms)"
            }
        finally:
            connection.close()

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(execute_booking_thread, users[i], i + 1) for i in range(num_threads)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    # Sort results by thread index for clean printing
    results.sort(key=lambda x: x["thread_idx"])
    for r in results:
        print(r["msg"])

    # 4. Verification and Summary
    successes = [r for r in results if r["success"]]
    failures = [r for r in results if not r["success"]]

    session.refresh_from_db()
    total_db_bookings = Booking.objects.filter(session=session, status=BookingStatus.CONFIRMED).count()

    print("\n" + "=" * 70)
    print(" 📊 VERIFICATION & INVARIANT SUMMARY ")
    print("=" * 70)
    print(f" • Total Concurrent Requests Fired: {num_threads}")
    print(f" • Successful Bookings Confirmed:   {len(successes)}")
    print(f" • Rejected (Over-capacity) Count:  {len(failures)}")
    print(f" • Confirmed Bookings in Database:  {total_db_bookings}")
    print(f" • Session Capacity:                {session.capacity}")
    print(f" • Remaining Seats:                 {session.remaining_seats}")

    if len(successes) == 1 and total_db_bookings == 1 and session.remaining_seats == 0:
        print("\n🎉 RESULT: PASS! Strict database row-locking prevented any oversubscription.")
        print("   The system safely preserved invariant: total_confirmed <= session.capacity.\n")
    else:
        print("\n❌ RESULT: FAIL! Race condition violation detected.\n")


if __name__ == '__main__':
    main()
