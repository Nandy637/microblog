# posts/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, get_presigned_url, UserProfileView, FeedView

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='posts')

urlpatterns = [
    path("", include(router.urls)),
    path("uploads/presign/", get_presigned_url, name="presigned-url"),
    path('users/<str:username>/', UserProfileView.as_view(), name='user-profile'),
    path('feed/', FeedView.as_view(), name='feed'),
]