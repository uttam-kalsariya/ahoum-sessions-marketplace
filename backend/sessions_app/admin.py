from django.contrib import admin
from .models import Session, Booking


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'creator', 'start_time', 'end_time', 'capacity', 'price', 'status', 'created_at']
    list_filter = ['status', 'start_time', 'created_at']
    search_fields = ['title', 'description', 'creator__email']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'user', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['session__title', 'user__email']
