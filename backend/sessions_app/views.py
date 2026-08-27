from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permissions import IsCreator, IsSessionOwner
from .models import Session, Booking, SessionStatus, BookingStatus
from .serializers import (
    SessionListSerializer,
    SessionDetailSerializer,
    SessionCreateUpdateSerializer,
    BookingSerializer,
)
from .services import BookingService


class SessionViewSet(viewsets.ModelViewSet):
    """
    Public catalog, session management for creators, and booking actions.
    """
    queryset = Session.objects.all().select_related('creator').prefetch_related('bookings')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        elif self.action == 'create':
            return [permissions.IsAuthenticated(), IsCreator()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsCreator(), IsSessionOwner()]
        elif self.action == 'book':
            return [permissions.IsAuthenticated()]
        elif self.action == 'my_sessions':
            return [permissions.IsAuthenticated(), IsCreator()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SessionCreateUpdateSerializer
        elif self.action == 'retrieve':
            return SessionDetailSerializer
        return SessionListSerializer

    def get_queryset(self):
        qs = Session.objects.select_related('creator').prefetch_related('bookings')

        # For regular public catalog, show only active sessions
        if self.action in ['list', 'retrieve']:
            qs = qs.filter(status=SessionStatus.ACTIVE)

            # Optional filter by upcoming only
            upcoming_param = self.request.query_params.get('upcoming')
            if upcoming_param and upcoming_param.lower() in ['true', '1']:
                qs = qs.filter(start_time__gt=timezone.now())

            # Search keyword in title or description or creator
            search = self.request.query_params.get('search')
            if search:
                qs = qs.filter(
                    Q(title__icontains=search) |
                    Q(description__icontains=search) |
                    Q(creator__first_name__icontains=search) |
                    Q(creator__last_name__icontains=search) |
                    Q(creator__email__icontains=search)
                )

        return qs

    def perform_create(self, serializer):
        # Automatically assign creator to authenticated user
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def book(self, request, pk=None):
        """
        Concurrency-safe endpoint to book a session.
        Uses BookingService with row-level locking.
        """
        booking = BookingService.create_booking(user=request.user, session_id=pk)
        return Response(
            BookingSerializer(booking, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsCreator], url_path='my-sessions')
    def my_sessions(self, request):
        """
        Creator dashboard endpoint to view all their sessions along with booking counts.
        """
        sessions = Session.objects.filter(
            creator=request.user
        ).select_related('creator').prefetch_related('bookings', 'bookings__user').order_by('-created_at')

        serializer = SessionDetailSerializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)


class BookingViewSet(viewsets.GenericViewSet):
    """
    Manages user bookings and cancellations.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get_queryset(self):
        return Booking.objects.filter(
            user=self.request.user
        ).select_related('session', 'session__creator', 'user').order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='my-bookings')
    def my_bookings(self, request):
        """
        Returns all active and past bookings for the authenticated user.
        """
        bookings = self.get_queryset()
        serializer = BookingSerializer(bookings, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """
        Cancels an active booking for the current user.
        """
        booking = BookingService.cancel_booking(user=request.user, booking_id=pk)
        return Response(
            BookingSerializer(booking, context={'request': request}).data,
            status=status.HTTP_200_OK
        )
