from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    USER = 'USER', 'User'
    CREATOR = 'CREATOR', 'Creator'


class User(AbstractUser):
    email = models.EmailField(unique=True, verbose_name='email address')
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.USER,
        help_text='User role determining permissions across the platform.'
    )
    bio = models.TextField(blank=True, default='')
    avatar_url = models.URLField(max_length=500, blank=True, default='')
    oauth_provider = models.CharField(max_length=50, blank=True, default='')
    oauth_id = models.CharField(max_length=255, blank=True, default='')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'
        ordering = ['id']

    @property
    def is_creator(self) -> bool:
        return self.role == UserRole.CREATOR

    def __str__(self):
        return f"{self.email} ({self.role})"
