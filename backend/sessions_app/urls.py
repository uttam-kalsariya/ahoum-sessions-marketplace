from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionViewSet, BookingViewSet

router = DefaultRouter()
router.register(r'sessions', SessionViewSet, basename='session')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
]
