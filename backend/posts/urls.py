# posts/urls.py
from django.urls import path
from .views import (
    PostListCreateView, PostDetailView, toggle_like, toggle_follow, UserProfileView, api_root
)

urlpatterns = [
    path('', api_root),  # Welcome view for /api/
    path("posts/", PostListCreateView.as_view(), name="post-list-create"),
    path("posts/<int:pk>/", PostDetailView.as_view(), name="post-detail"),
    path("posts/<int:pk>/like/", toggle_like, name="post-like"),
    path("users/<int:pk>/follow/", toggle_follow, name="user-follow"),
    path("users/<str:username>/", UserProfileView.as_view(), name="user-profile"),
]