from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserRole

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    is_creator = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'role',
            'is_creator',
            'bio',
            'avatar_url',
            'oauth_provider',
            'date_joined',
        ]
        read_only_fields = ['id', 'email', 'oauth_provider', 'date_joined']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'bio',
            'avatar_url',
            'role',
        ]

    def validate_role(self, value):
        if value not in [UserRole.USER, UserRole.CREATOR]:
            raise serializers.ValidationError(f"Invalid role. Choices are: {UserRole.values}")
        return value


class GoogleAuthSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, help_text="Google ID token or access token from OAuth flow")
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.USER, required=False)


class GitHubAuthSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, help_text="GitHub authorization code from OAuth callback")
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.USER, required=False)


class DemoLoginSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.USER)
    email = serializers.EmailField(required=False)
    name = serializers.CharField(required=False, allow_blank=True)
