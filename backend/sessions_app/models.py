from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils import timezone


class SessionStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    CANCELLED = 'CANCELLED', 'Cancelled'


class BookingStatus(models.TextChoices):
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    CANCELLED = 'CANCELLED', 'Cancelled'


class Session(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_sessions'
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    capacity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Maximum total confirmed bookings allowed."
    )
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(
        max_length=20,
        choices=SessionStatus.choices,
        default=SessionStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_time', 'id']
        indexes = [
            models.Index(fields=['start_time', 'status']),
            models.Index(fields=['creator']),
        ]

    def __str__(self):
        return f"{self.title} (by {self.creator.email})"

    @property
    def confirmed_bookings_count(self) -> int:
        return self.bookings.filter(status=BookingStatus.CONFIRMED).count()

    @property
    def booking_count(self) -> int:
        return self.confirmed_bookings_count

    @property
    def duration(self) -> int:
        """Duration in minutes."""
        if self.end_time and self.start_time:
            diff = (self.end_time - self.start_time).total_seconds() / 60
            return max(1, int(diff))
        return 60

    @property
    def remaining_seats(self) -> int:
        return max(0, self.capacity - self.confirmed_bookings_count)

    @property
    def is_sold_out(self) -> bool:
        return self.remaining_seats <= 0

    @property
    def has_started(self) -> bool:
        return self.start_time <= timezone.now()



class Booking(models.Model):
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.CONFIRMED
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'user'],
                condition=models.Q(status=BookingStatus.CONFIRMED),
                name='unique_active_user_session_booking'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['session', 'status']),
        ]

    def __str__(self):
        return f"Booking #{self.id}: {self.user.email} -> {self.session.title} [{self.status}]"
