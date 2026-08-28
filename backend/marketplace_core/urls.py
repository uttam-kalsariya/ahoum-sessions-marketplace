from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from users.views import UserProfileView



@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'service': 'Ahoum Sessions Marketplace API',
        'version': '1.0.0'
    })


def serve_react(request):
    """
    Serves the compiled React SPA index.html for any frontend route.
    """
    dist_index = Path(settings.BASE_DIR).parent / 'frontend' / 'dist' / 'index.html'
    if dist_index.exists():
        with open(dist_index, 'r', encoding='utf-8') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse(
        """
        <!DOCTYPE html>
        <html>
        <head><title>Ahoum Sessions Marketplace</title><style>body{font-family:sans-serif;background:#0b0f19;color:#fff;text-align:center;padding:50px;}</style></head>
        <body>
            <h1>🚀 Ahoum Sessions Marketplace Ready</h1>
            <p>React Frontend is accessible at <a style="color:#38bdf8" href="http://localhost:5173">http://localhost:5173</a></p>
            <p>API root is active at <a style="color:#818cf8" href="/api/sessions/">/api/sessions/</a></p>
        </body>
        </html>
        """
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('health/', health_check, name='direct_health_check'),
    path('api/profile/', UserProfileView.as_view(), name='api_user_profile'),
    path('profile/', UserProfileView.as_view(), name='direct_user_profile'),
    path('api/auth/', include('users.urls')),
    path('auth/', include('users.urls')),
    path('api/', include('sessions_app.urls')),
    path('', include('sessions_app.urls')),
]

# Serve assets folder from frontend/dist/assets directly in development
dist_assets_path = Path(settings.BASE_DIR).parent / 'frontend' / 'dist' / 'assets'
if dist_assets_path.exists():
    urlpatterns += static('/assets/', document_root=dist_assets_path)

# Catch-all frontend route to serve the React SPA
urlpatterns.append(re_path(r'^(?!api|admin|assets|static).*$', serve_react, name='react_spa'))
