import os
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserRole
from .serializers import (
    UserSerializer,
    UserProfileUpdateSerializer,
    GoogleAuthSerializer,
    GitHubAuthSerializer,
    DemoLoginSerializer,
)

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    refresh['email'] = user.email
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class UserProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GoogleAuthView(views.APIView):
    """
    Exchanges Google OAuth token for backend JWT tokens.
    Supports either Google ID Token or Google Access Token.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token = serializer.validated_data['token']
        target_role = serializer.validated_data.get('role', UserRole.USER)

        email = None
        first_name = ''
        last_name = ''
        avatar_url = ''
        oauth_id = ''

        # 1. Try Google ID token validation
        try:
            id_info_res = requests.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={token}",
                timeout=5
            )
            if id_info_res.status_code == 200:
                data = id_info_res.json()
                email = data.get('email')
                first_name = data.get('given_name', '')
                last_name = data.get('family_name', '')
                avatar_url = data.get('picture', '')
                oauth_id = data.get('sub', '')
        except Exception:
            pass

        # 2. Fallback to Google UserInfo endpoint with access token
        if not email:
            try:
                user_info_res = requests.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=5
                )
                if user_info_res.status_code == 200:
                    data = user_info_res.json()
                    email = data.get('email')
                    first_name = data.get('given_name', '')
                    last_name = data.get('family_name', '')
                    avatar_url = data.get('picture', '')
                    oauth_id = data.get('sub', '')
            except Exception as e:
                return Response(
                    {"error": f"Failed to contact Google OAuth: {str(e)}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )

        if not email:
            return Response(
                {"error": "Invalid Google token or unable to verify user info."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0] + '_' + oauth_id[:6],
                'first_name': first_name,
                'last_name': last_name,
                'avatar_url': avatar_url,
                'role': target_role,
                'oauth_provider': 'google',
                'oauth_id': oauth_id,
            }
        )

        if not created:
            # Update avatar if provided
            if avatar_url and not user.avatar_url:
                user.avatar_url = avatar_url
                user.save(update_fields=['avatar_url'])

        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'is_new_user': created,
        }, status=status.HTTP_200_OK)


class GitHubAuthView(views.APIView):
    """
    Exchanges GitHub OAuth code for backend JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GitHubAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data['code']
        target_role = serializer.validated_data.get('role', UserRole.USER)

        client_id = getattr(settings, 'GITHUB_CLIENT_ID', os.environ.get('GITHUB_CLIENT_ID', ''))
        client_secret = getattr(settings, 'GITHUB_CLIENT_SECRET', os.environ.get('GITHUB_CLIENT_SECRET', ''))

        if not client_id or not client_secret:
            return Response(
                {"error": "GitHub OAuth is not configured on server (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET)."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        try:
            # Exchange code for access token
            token_res = requests.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "code": code,
                },
                timeout=10
            )
            token_data = token_res.json()
            gh_access_token = token_data.get("access_token")

            if not gh_access_token:
                error_msg = token_data.get("error_description", "Failed to retrieve access token from GitHub.")
                return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)

            # Get user info
            gh_user_res = requests.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {gh_access_token}"},
                timeout=10
            )
            gh_user = gh_user_res.json()
            oauth_id = str(gh_user.get("id", ""))
            name = gh_user.get("name") or gh_user.get("login") or ""
            avatar_url = gh_user.get("avatar_url", "")
            bio = gh_user.get("bio", "") or ""
            email = gh_user.get("email")

            # If email is private, fetch from emails endpoint
            if not email:
                gh_emails_res = requests.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {gh_access_token}"},
                    timeout=10
                )
                if gh_emails_res.status_code == 200:
                    emails = gh_emails_res.json()
                    primary = next((e['email'] for e in emails if e.get('primary') and e.get('verified')), None)
                    email = primary or (emails[0]['email'] if emails else None)

            if not email:
                email = f"{gh_user.get('login', 'user')}@github.placeholder"

            name_parts = name.split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': f"gh_{gh_user.get('login', oauth_id)}",
                    'first_name': first_name,
                    'last_name': last_name,
                    'avatar_url': avatar_url,
                    'bio': bio,
                    'role': target_role,
                    'oauth_provider': 'github',
                    'oauth_id': oauth_id,
                }
            )

            tokens = get_tokens_for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': tokens,
                'is_new_user': created,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"GitHub authentication error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DemoLoginView(views.APIView):
    """
    Evaluator / Dev quick login endpoint.
    Allows testing User and Creator roles instantly without requiring live OAuth keys.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = DemoLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        role = serializer.validated_data['role']
        custom_email = serializer.validated_data.get('email')
        custom_name = serializer.validated_data.get('name')

        if role == UserRole.CREATOR:
            email = custom_email or "creator.demo@ahoum.com"
            name = custom_name or "Elena Rostova"
            avatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            bio = "Senior Architect & High-Performance Systems Specialist."
        else:
            email = custom_email or "user.demo@ahoum.com"
            name = custom_name or "Alex Mercer"
            avatar = "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"
            bio = "Product enthusiast and tech explorer."

        name_parts = name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email.split('@')[0],
                'first_name': first_name,
                'last_name': last_name,
                'avatar_url': avatar,
                'bio': bio,
                'role': role,
                'oauth_provider': 'demo',
            }
        )

        # Sync role if explicitly selected
        if user.role != role:
            user.role = role
            user.save(update_fields=['role'])

        tokens = get_tokens_for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': tokens,
            'is_demo': True,
        }, status=status.HTTP_200_OK)


class OAuthConfigView(views.APIView):
    """
    Returns public client IDs and configuration for OAuth providers.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        google_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', os.environ.get('GOOGLE_CLIENT_ID', ''))
        github_client_id = getattr(settings, 'GITHUB_CLIENT_ID', os.environ.get('GITHUB_CLIENT_ID', ''))

        return Response({
            'google_client_id': google_client_id,
            'github_client_id': github_client_id,
            'has_google': bool(google_client_id),
            'has_github': bool(github_client_id),
        })
