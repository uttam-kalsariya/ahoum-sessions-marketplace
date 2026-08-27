from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['id', 'email', 'username', 'role', 'first_name', 'last_name', 'oauth_provider', 'is_staff']
    list_filter = ['role', 'oauth_provider', 'is_staff', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Profile & Role', {
            'fields': ('role', 'bio', 'avatar_url', 'oauth_provider', 'oauth_id')
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Profile & Role', {
            'fields': ('role', 'bio', 'avatar_url', 'oauth_provider', 'oauth_id')
        }),
    )
