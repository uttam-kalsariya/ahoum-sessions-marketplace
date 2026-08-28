import concurrent.futures
from datetime import timedelta
from django.test import TransactionTestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import connection

from users.models import UserRole
from sessions_app.models import Session, Booking, SessionStatus, BookingStatus
from sessions_app.services import BookingService

User = get_user_model()


class ConcurrencyBookingTestCase(TransactionTestCase):
    """
    Automated test demonstrating capacity correctness under simultaneous concurrent booking attempts.
    
    Uses Django's TransactionTestCase so that real database transactions and row-level
    locks are executed across concurrent OS threads.
    """

    def setUp(self):
        super().setUp()
        self.creator = User.objects.create(
            email="creator_concurrency@ahoum.com",
            username="creator_concurrency",
            role=UserRole.CREATOR
        )

        # Create 10 distinct test users
        self.users = []
        for i in range(10):
            user = User.objects.create(
                email=f"user_thread_{i}@ahoum.com",
                username=f"user_thread_{i}",
                role=UserRole.USER
            )
            self.users.append(user)

    def test_single_seat_race_condition_never_oversubscribes(self):
        """
        Scenario: A session has exactly ONE seat available (capacity=1).
        10 different authenticated users attempt to book the seat simultaneously in parallel threads.
        
        Expected Result:
        - Exactly 1 user succeeds (returns confirmed Booking).
        - Exactly 9 users receive a capacity validation error.
        - Total confirmed bookings in the database is strictly 1.
        - The remaining seats count is strictly 0.
        """
        now = timezone.now()
        session = Session.objects.create(
            title="Single Seat Concurrency Race Session",
            description="Testing race conditions with capacity=1",
            creator=self.creator,
            start_time=now + timedelta(hours=5),
            end_time=now + timedelta(hours=6),
            capacity=1,
            price=50.00,
            status=SessionStatus.ACTIVE
        )

        success_count = 0
        failure_count = 0
        errors = []

        def attempt_booking(user):
            # Close stale connection in new thread so Django establishes a fresh DB connection
            connection.close()
            try:
                booking = BookingService.create_booking(user=user, session_id=session.id)
                return {"success": True, "booking_id": booking.id, "user_id": user.id}
            except Exception as e:
                return {"success": False, "error": str(e), "user_id": user.id}
            finally:
                connection.close()

        # Fire 10 simultaneous threads at the exact same moment
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_user = {executor.submit(attempt_booking, user): user for user in self.users}
            for future in concurrent.futures.as_completed(future_to_user):
                result = future.result()
                if result["success"]:
                    success_count += 1
                else:
                    failure_count += 1
                    errors.append(result["error"])

        # Validate strictly 1 success and 9 failures
        self.assertEqual(success_count, 1, f"Expected exactly 1 successful booking, but got {success_count}")
        self.assertEqual(failure_count, 9, f"Expected 9 failed bookings, but got {failure_count}")

        # Validate database integrity
        total_db_bookings = Booking.objects.filter(session=session, status=BookingStatus.CONFIRMED).count()
        self.assertEqual(
            total_db_bookings,
            1,
            f"Database has {total_db_bookings} bookings, exceeding session capacity of 1!"
        )

        session.refresh_from_db()
        self.assertEqual(session.remaining_seats, 0)
        self.assertTrue(session.is_sold_out)

    def test_concurrent_duplicate_booking_by_same_user_prevented(self):
        """
        Scenario: The same user sends 5 simultaneous parallel requests to book the same session.
        
        Expected Result:
        - Only 1 booking request succeeds.
        - Other requests fail with duplicate active booking validation.
        - Exactly 1 booking is created in the database.
        """
        now = timezone.now()
        session = Session.objects.create(
            title="Multi Seat Duplicate Booking Prevention",
            description="Testing same-user race condition with capacity=5",
            creator=self.creator,
            start_time=now + timedelta(hours=5),
            end_time=now + timedelta(hours=6),
            capacity=5,
            price=25.00,
            status=SessionStatus.ACTIVE
        )

        target_user = self.users[0]
        success_count = 0
        failure_count = 0

        def attempt_same_user_booking():
            connection.close()
            try:
                booking = BookingService.create_booking(user=target_user, session_id=session.id)
                return {"success": True, "booking_id": booking.id}
            except Exception as e:
                return {"success": False, "error": str(e)}
            finally:
                connection.close()

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(attempt_same_user_booking) for _ in range(5)]
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result["success"]:
                    success_count += 1
                else:
                    failure_count += 1

        self.assertEqual(success_count, 1, f"Same user booked {success_count} times!")
        self.assertEqual(failure_count, 4)

        user_bookings_in_db = Booking.objects.filter(
            session=session,
            user=target_user,
            status=BookingStatus.CONFIRMED
        ).count()
        self.assertEqual(user_bookings_in_db, 1)

    def test_thread_a_thread_b_capacity_1_race_condition(self):
        """
        Explicit two-thread concurrency test (Thread A vs Thread B on 1-seat capacity):
        - Thread A and Thread B simultaneously attempt to book the single seat.
        - Exactly 1 succeeds, exactly 1 fails.
        - Final DB booking count is strictly 1.
        """
        now = timezone.now()
        session = Session.objects.create(
            title="Thread A vs Thread B 1-Seat Session",
            description="Testing 2-thread simultaneous booking",
            creator=self.creator,
            start_time=now + timedelta(hours=3),
            end_time=now + timedelta(hours=4),
            capacity=1,
            price=30.00,
            status=SessionStatus.ACTIVE
        )

        user_a = self.users[0]
        user_b = self.users[1]
        results = []

        def run_booking(user):
            connection.close()
            try:
                booking = BookingService.create_booking(user=user, session_id=session.id)
                return {"success": True, "booking": booking}
            except Exception as e:
                return {"success": False, "error": str(e)}
            finally:
                connection.close()

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(run_booking, user_a), executor.submit(run_booking, user_b)]
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())

        successes = [r for r in results if r["success"]]
        failures = [r for r in results if not r["success"]]

        self.assertEqual(len(successes), 1, "Expected exactly one thread to succeed.")
        self.assertEqual(len(failures), 1, "Expected exactly one thread to fail.")
        self.assertEqual(Booking.objects.filter(session=session, status=BookingStatus.CONFIRMED).count(), 1)

