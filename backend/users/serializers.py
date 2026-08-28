from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserRole

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    is_creator = serializers.BooleanField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)
    avatar = serializers.CharField(source='avatar_url', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'full_name',
            'name',
            'first_name',
            'last_name',
            'role',
            'is_creator',
            'bio',
            'avatar',
            'avatar_url',
            'oauth_provider',
            'date_joined',
        ]
        read_only_fields = ['id', 'email', 'oauth_provider', 'date_joined', 'role', 'is_creator']


class ProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    avatar = serializers.CharField(source='avatar_url', required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'avatar',
            'role',
        ]
        read_only_fields = ['id', 'email', 'role']


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.CharField(source='avatar_url', required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'full_name',
            'first_name',
            'last_name',
            'bio',
            'avatar',
            'avatar_url',
        ]

    def update(self, instance, validated_data):
        full_name = validated_data.pop('full_name', None)
        if full_name is not None:
            parts = full_name.strip().split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''
        return super().update(instance, validated_data)



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
