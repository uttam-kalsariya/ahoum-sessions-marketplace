from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    GoogleAuthView,
    GitHubAuthView,
    DemoLoginView,
    UserProfileView,
    OAuthConfigView,
)

urlpatterns = [
    path('google/', GoogleAuthView.as_view(), name='auth_google'),
    path('github/', GitHubAuthView.as_view(), name='auth_github'),
    path('demo/', DemoLoginView.as_view(), name='auth_demo'),
    path('config/', OAuthConfigView.as_view(), name='auth_config'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh_alias'),
]
