# posts/views.py

# Add these imports for registration/profile endpoints
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.db.models import F, Count
from django.db import transaction
from .serializers import RegisterSerializer, UserSerializer  # Ensure RegisterSerializer exists
from .models import Post, Like, Follow
from .serializers import PostSerializer, RegisterSerializer, UserSerializer

# Registration endpoint
class RegisterView(generics.CreateAPIView):
    """API endpoint for user registration."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

# Profile endpoint
class MeView(APIView):
    """API endpoint to get the current authenticated user's profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

# API root welcome view
@api_view(['GET'])
def api_root(request):
    return Response({
        'posts': 'http://127.0.0.1:8000/api/posts/',
        'users': 'http://127.0.0.1:8000/api/users/',
        'register': 'http://127.0.0.1:8000/api/register/',
    })

class PostListCreateView(generics.ListCreateAPIView):
    queryset = Post.objects.all().select_related('author').annotate(likes_count_annotated=Count('likes'))
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Post.objects.all().select_related('author').annotate(likes_count_annotated=Count('likes'))
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_object(self):
        obj = super().get_object()
        self.check_object_permissions(self.request, obj)
        return obj

    def check_permissions(self, request):
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if request.user != self.get_object().author:
                self.permission_denied(request, message="You do not have permission to perform this action.")
        super().check_permissions(request)

# Like/Unlike Views (atomic and race-condition safe)
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def toggle_like(request, pk):
    try:
        with transaction.atomic():
            post = Post.objects.select_for_update().get(pk=pk)
            obj, created = Like.objects.get_or_create(user=request.user, post=post)
            if created:
                post.likes_count = F('likes_count') + 1
            else:
                obj.delete()
                post.likes_count = F('likes_count') - 1
            post.save(update_fields=['likes_count'])
            post.refresh_from_db()
            return Response({
                "likes_count": post.likes_count,
                "is_liked": created
            })
    except Post.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

# Follow/Unfollow Logic
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def toggle_follow(request, pk):
    try:
        followee = User.objects.get(pk=pk)
        if request.user == followee:
            return Response({"error": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)

        follow, created = Follow.objects.get_or_create(follower=request.user, followee=followee)
        if not created:
            follow.delete()
            return Response({"status": "unfollowed", "is_following": False}, status=status.HTTP_200_OK)
        
        return Response({"status": "followed", "is_following": True}, status=status.HTTP_201_CREATED)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        try:
            profile_user = User.objects.get(username=username)
            is_following = Follow.objects.filter(follower=request.user, followee=profile_user).exists()
            
            posts = Post.objects.filter(author=profile_user).order_by('-created_at')
            posts_serializer = PostSerializer(posts, many=True, context={'request': request})
            
            return Response({
                'user': UserSerializer(profile_user).data,
                'is_following': is_following,
                'posts': posts_serializer.data,
            })
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)