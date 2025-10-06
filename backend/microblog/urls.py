# microblog/urls.py

from django.contrib import admin
from django.urls import path, include
from django.views.generic.base import RedirectView
from django.conf import settings
from django.conf.urls.static import static
from posts.views import RegisterView, MeView, MyTokenObtainPairView  # Corrected import
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # Redirect the root URL to the API base path
    path('', RedirectView.as_view(url='api/', permanent=False)),

    path('admin/', admin.site.urls),
    path('api/', include('posts.urls')),

    # Auth and user endpoints
    path('api/register/', RegisterView.as_view(), name="register"),
    path('api/token/', MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path('api/token/refresh/', TokenRefreshView.as_view(), name="token_refresh"),
    path('api/me/', MeView.as_view(), name="me"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)