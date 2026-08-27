from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Session, Booking, BookingStatus, SessionStatus


class BookingService:
    """
    Encapsulates business invariants and concurrency-safe operations for session bookings.
    """

    @staticmethod
    def create_booking(user, session_id: int) -> Booking:
        """
        Atomically books a seat in a session with pessimistic row-level locking.
        
        Concurrency Safety:
        - Uses `select_for_update()` to acquire an exclusive lock on the Session row.
        - Any other transaction attempting to book the same session will block until
          this transaction commits or rolls back.
        - Guarantees that capacity is calculated against the freshest state.
        
        Invariants Enforced:
        1. Session must exist and be active.
        2. Session must not have already started (start_time > now).
        3. Creators cannot book their own sessions.
        4. User cannot have more than one active (CONFIRMED) booking for the same session.
        5. Total confirmed bookings cannot exceed session capacity.
        """
        with transaction.atomic():
            try:
                # Lock the session record exclusively for this transaction
                session = Session.objects.select_for_update().get(id=session_id)
            except Session.DoesNotExist:
                raise ValidationError({"error": "Session not found."})

            if session.status != SessionStatus.ACTIVE:
                raise ValidationError({"error": "This session is cancelled and cannot be booked."})

            # Check start time against current UTC time
            if session.start_time <= timezone.now():
                raise ValidationError({"error": "Cannot book a session that has already started."})

            # Creator check
            if session.creator_id == user.id:
                raise ValidationError({"error": "You cannot book your own session."})

            # Check for duplicate active booking
            has_active_booking = Booking.objects.filter(
                session=session,
                user=user,
                status=BookingStatus.CONFIRMED
            ).exists()
            if has_active_booking:
                raise ValidationError({"error": "You already have an active confirmed booking for this session."})

            # Concurrency-safe capacity evaluation inside the locked transaction
            current_confirmed = Booking.objects.filter(
                session=session,
                status=BookingStatus.CONFIRMED
            ).count()

            if current_confirmed >= session.capacity:
                raise ValidationError({"error": "Session is fully booked. No remaining seats available."})

            # Create confirmed booking
            booking = Booking.objects.create(
                session=session,
                user=user,
                status=BookingStatus.CONFIRMED
            )

            return booking

    @staticmethod
    def cancel_booking(user, booking_id: int) -> Booking:
        """
        Cancels an existing confirmed booking owned by the requesting user.
        Frees up a seat for other users immediately.
        """
        with transaction.atomic():
            try:
                booking = Booking.objects.select_for_update().get(id=booking_id, user=user)
            except Booking.DoesNotExist:
                raise ValidationError({"error": "Booking not found or you do not have permission to cancel it."})

            if booking.status == BookingStatus.CANCELLED:
                raise ValidationError({"error": "This booking is already cancelled."})

            if session := booking.session:
                if session.start_time <= timezone.now():
                    raise ValidationError({"error": "Cannot cancel a booking for a session that has already started."})

            booking.status = BookingStatus.CANCELLED
            booking.save(update_fields=['status', 'updated_at'])
            return booking
