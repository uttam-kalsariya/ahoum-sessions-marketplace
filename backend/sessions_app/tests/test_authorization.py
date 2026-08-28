from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import UserRole
from sessions_app.models import Session, SessionStatus

User = get_user_model()


class AuthorizationAndErrorHandlingTestCase(APITestCase):
    """
    Test suite verifying permission enforcement, token validation, and business error cases.
    """

    def setUp(self):
        super().setUp()
        self.creator_a = User.objects.create(
            email="creator_a@ahoum.com",
            username="creator_a",
            role=UserRole.CREATOR,
            first_name="Alice",
            last_name="Creator"
        )
        self.creator_b = User.objects.create(
            email="creator_b@ahoum.com",
            username="creator_b",
            role=UserRole.CREATOR,
            first_name="Bob",
            last_name="Creator"
        )
        self.standard_user = User.objects.create(
            email="regular_user@ahoum.com",
            username="regular_user",
            role=UserRole.USER,
            first_name="Charlie",
            last_name="User"
        )

        now = timezone.now()
        # Session owned by Creator A
        self.session_a = Session.objects.create(
            title="Creator A Masterclass",
            description="High-level architecture session",
            creator=self.creator_a,
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2, hours=2),
            capacity=5,
            price=50.00,
            status=SessionStatus.ACTIVE
        )

        # Past Session
        self.past_session = Session.objects.create(
            title="Past Expired Session",
            description="Session that has already finished",
            creator=self.creator_a,
            start_time=now - timedelta(days=1),
            end_time=now - timedelta(days=1, hours=-2),
            capacity=5,
            price=20.00,
            status=SessionStatus.ACTIVE
        )

    def test_case_1_user_cannot_call_creator_only_session_creation_endpoint(self):
        """
        Enforce backend authorization: Standard user attempting to create a session must receive 403 Forbidden.
        """
        self.client.force_authenticate(user=self.standard_user)

        now = timezone.now()
        payload = {
            "title": "Unauthorized User Session",
            "description": "This should be blocked by backend permissions",
            "start_time": (now + timedelta(days=3)).isoformat(),
            "end_time": (now + timedelta(days=3, hours=2)).isoformat(),
            "capacity": 10,
            "price": "100.00"
        }

        response = self.client.post("/api/sessions/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Creator privileges required", str(response.data))

    def test_case_2_creator_cannot_edit_or_delete_another_creators_session(self):
        """
        Enforce object-level permissions: Creator B attempting to update or delete Creator A's session must receive 403 Forbidden.
        """
        self.client.force_authenticate(user=self.creator_b)

        # Creator B attempts to update Creator A's session
        update_payload = {"title": "Hacked Title by Creator B"}
        patch_response = self.client.patch(f"/api/sessions/{self.session_a.id}/", update_payload, format="json")
        self.assertEqual(patch_response.status_code, status.HTTP_403_FORBIDDEN)

        # Creator B attempts to delete Creator A's session
        delete_response = self.client.delete(f"/api/sessions/{self.session_a.id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

        # Verify original title untouched
        self.session_a.refresh_from_db()
        self.assertEqual(self.session_a.title, "Creator A Masterclass")

    def test_case_3_unauthenticated_or_invalid_jwt_receives_401(self):
        """
        Verify that protected endpoints reject missing or invalid JWT tokens with 401 Unauthorized.
        """
        # 1. No token at all
        response_no_token = self.client.post(f"/api/sessions/{self.session_a.id}/book/")
        self.assertEqual(response_no_token.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Malformed token
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token.payload")
        response_bad_token = self.client.get("/api/auth/profile/")
        self.assertEqual(response_bad_token.status_code, status.HTTP_401_UNAUTHORIZED)

        # 3. Valid token succeeds
        token = str(RefreshToken.for_user(self.standard_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response_valid_token = self.client.get("/api/auth/profile/")
        self.assertEqual(response_valid_token.status_code, status.HTTP_200_OK)
        self.assertEqual(response_valid_token.data["email"], self.standard_user.email)

    def test_case_4_cannot_book_session_that_has_already_started(self):
        """
        Business invariant: Prevent booking sessions whose start_time <= current time.
        """
        self.client.force_authenticate(user=self.standard_user)
        response = self.client.post(f"/api/sessions/{self.past_session.id}/book/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already started", str(response.data))

    def test_case_5_prevent_duplicate_active_booking_by_same_user(self):
        """
        Business invariant: Same user cannot book the same session twice actively.
        """
        self.client.force_authenticate(user=self.standard_user)

        # First booking succeeds
        res1 = self.client.post(f"/api/sessions/{self.session_a.id}/book/")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second booking fails
        res2 = self.client.post(f"/api/sessions/{self.session_a.id}/book/")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already have an active confirmed booking", str(res2.data))

    def test_case_6_creator_cannot_book_own_session(self):
        """
        Business invariant: Session creator cannot book their own session.
        """
        self.client.force_authenticate(user=self.creator_a)
        response = self.client.post(f"/api/sessions/{self.session_a.id}/book/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot book your own session", str(response.data))

    def test_case_7_user_booking_cancellation_and_seat_restoration(self):
        """
        Flow: User books seat -> remaining seats decreases -> user cancels -> remaining seats restored.
        """
        self.client.force_authenticate(user=self.standard_user)

        # Initial seats = 5
        self.assertEqual(self.session_a.remaining_seats, 5)

        # Book
        book_res = self.client.post(f"/api/sessions/{self.session_a.id}/book/")
        booking_id = book_res.data["id"]
        self.session_a.refresh_from_db()
        self.assertEqual(self.session_a.remaining_seats, 4)

        # Cancel
        cancel_res = self.client.post(f"/api/bookings/{booking_id}/cancel/")
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_res.data["status"], "CANCELLED")

        # Verify seat restored
        self.session_a.refresh_from_db()
        self.assertEqual(self.session_a.remaining_seats, 5)
