from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import UserRole

User = get_user_model()


class UserAuthenticationTestCase(TestCase):
    """
    Automated unit and integration test suite for user authentication,
    demo evaluator login, JWT token issuance, and profile management.
    """

    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def test_demo_user_authentication_issues_valid_jwt(self):
        """
        Test /api/auth/demo/ endpoint issuing valid JWT access and refresh tokens
        with USER role defaults.
        """
        response = self.client.post(
            '/api/auth/demo/',
            {'role': 'USER'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['role'], UserRole.USER)
        self.assertFalse(response.data['user']['is_creator'])

    def test_demo_creator_authentication_issues_valid_jwt(self):
        """
        Test /api/auth/demo/ endpoint issuing valid JWT access and refresh tokens
        with CREATOR role defaults.
        """
        response = self.client.post(
            '/api/auth/demo/',
            {'role': 'CREATOR'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['role'], UserRole.CREATOR)
        self.assertTrue(response.data['user']['is_creator'])

    def test_demo_custom_email_and_name_creation(self):
        """
        Test demo sign-in with custom email and name parameters.
        """
        custom_email = "evaluator.special@ahoum.com"
        custom_name = "Jane Evaluator"
        response = self.client.post(
            '/api/auth/demo/',
            {
                'role': 'CREATOR',
                'email': custom_email,
                'name': custom_name
            },
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['email'], custom_email)
        self.assertEqual(response.data['user']['first_name'], "Jane")
        self.assertEqual(response.data['user']['last_name'], "Evaluator")

    def test_user_profile_authenticated_access_and_patch(self):
        """
        Test /api/auth/profile/ retrieving and updating profile information.
        """
        user = User.objects.create(
            email="profile_test@ahoum.com",
            username="profile_test",
            first_name="InitialFirst",
            last_name="InitialLast",
            role=UserRole.USER
        )
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # GET profile
        get_res = self.client.get('/api/auth/profile/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['email'], user.email)
        self.assertEqual(get_res.data['first_name'], "InitialFirst")

        # PATCH profile
        patch_payload = {
            'first_name': 'UpdatedFirst',
            'last_name': 'UpdatedLast',
            'bio': 'Software engineer and system architect.'
        }
        patch_res = self.client.patch('/api/auth/profile/', patch_payload, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['first_name'], 'UpdatedFirst')
        self.assertEqual(patch_res.data['last_name'], 'UpdatedLast')
        self.assertEqual(patch_res.data['bio'], 'Software engineer and system architect.')

    def test_oauth_config_endpoint_returns_json(self):
        """
        Test /api/auth/config/ returning public OAuth configuration flags.
        """
        response = self.client.get('/api/auth/config/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('has_google', response.data)
        self.assertIn('has_github', response.data)
