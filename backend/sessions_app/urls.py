from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionViewSet, BookingViewSet, CreatorDashboardView

router = DefaultRouter()
router.register(r'sessions', SessionViewSet, basename='session')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('my-bookings/', BookingViewSet.as_view({'get': 'my_bookings'}), name='direct_my_bookings'),
    path('creator/dashboard/', CreatorDashboardView.as_view({'get': 'list'}), name='direct_creator_dashboard'),
    path('', include(router.urls)),
]
