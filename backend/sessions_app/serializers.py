from rest_framework import serializers
from django.utils import timezone
from users.serializers import UserSerializer
from .models import Session, Booking, SessionStatus, BookingStatus


class SessionListSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    confirmed_bookings_count = serializers.IntegerField(read_only=True)
    remaining_seats = serializers.IntegerField(read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)
    has_started = serializers.BooleanField(read_only=True)
    user_has_booked = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            'id',
            'title',
            'description',
            'creator',
            'start_time',
            'end_time',
            'capacity',
            'price',
            'status',
            'confirmed_bookings_count',
            'remaining_seats',
            'is_sold_out',
            'has_started',
            'user_has_booked',
            'created_at',
        ]

    def get_user_has_booked(self, obj) -> bool:
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.bookings.filter(user=request.user, status=BookingStatus.CONFIRMED).exists()
        return False


class BookingSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    session = SessionListSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'session',
            'user',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class AttendeeSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'user', 'status', 'created_at']


class SessionDetailSerializer(serializers.ModelSerializer):
    creator = UserSerializer(read_only=True)
    confirmed_bookings_count = serializers.IntegerField(read_only=True)
    remaining_seats = serializers.IntegerField(read_only=True)
    is_sold_out = serializers.BooleanField(read_only=True)
    has_started = serializers.BooleanField(read_only=True)
    user_has_booked = serializers.SerializerMethodField()
    user_booking_id = serializers.SerializerMethodField()
    attendees = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            'id',
            'title',
            'description',
            'creator',
            'start_time',
            'end_time',
            'capacity',
            'price',
            'status',
            'confirmed_bookings_count',
            'remaining_seats',
            'is_sold_out',
            'has_started',
            'user_has_booked',
            'user_booking_id',
            'attendees',
            'created_at',
            'updated_at',
        ]

    def get_user_has_booked(self, obj) -> bool:
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.bookings.filter(user=request.user, status=BookingStatus.CONFIRMED).exists()
        return False

    def get_user_booking_id(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            active_booking = obj.bookings.filter(user=request.user, status=BookingStatus.CONFIRMED).first()
            return active_booking.id if active_booking else None
        return None

    def get_attendees(self, obj):
        request = self.context.get('request')
        # Only expose attendee details to the creator of the session
        if request and request.user.is_authenticated and obj.creator_id == request.user.id:
            confirmed_bookings = obj.bookings.filter(status=BookingStatus.CONFIRMED).select_related('user')
            return AttendeeSerializer(confirmed_bookings, many=True).data
        return []


class SessionCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = [
            'id',
            'title',
            'description',
            'start_time',
            'end_time',
            'capacity',
            'price',
            'status',
        ]

    def validate_capacity(self, value):
        if value < 1:
            raise serializers.ValidationError("Capacity must be at least 1.")
        # If updating existing session, ensure new capacity is not less than confirmed bookings
        instance = self.instance
        if instance:
            confirmed_count = instance.confirmed_bookings_count
            if value < confirmed_count:
                raise serializers.ValidationError(
                    f"Cannot reduce capacity to {value} because there are already {confirmed_count} confirmed bookings."
                )
        return value

    def validate(self, attrs):
        start_time = attrs.get('start_time') or (self.instance.start_time if self.instance else None)
        end_time = attrs.get('end_time') or (self.instance.end_time if self.instance else None)

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be strictly after start time."})

        # For new sessions, start_time must be in the future
        if not self.instance and start_time and start_time <= timezone.now():
            raise serializers.ValidationError({"start_time": "Start time must be in the future."})

        return attrs
