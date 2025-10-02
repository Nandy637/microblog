# posts/views.py

# Add these imports for registration/profile endpoints
import boto3
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, action
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import F, Count
from django.db import transaction
from .serializers import RegisterSerializer, UserSerializer, MyTokenObtainPairSerializer  # Ensure RegisterSerializer exists
from .models import Post, Like, Follow
from .serializers import PostSerializer, RegisterSerializer, UserSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .paginations import FeedCursorPagination, ProfilePostPagination


# Custom token obtain view for email login
@method_decorator(csrf_exempt, name='dispatch')
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

    def dispatch(self, request, *args, **kwargs):
        print("DEBUG: ========== MyTokenObtainPairView.dispatch called! ==========")
        print(f"DEBUG: Raw request body: {repr(request.body)}")
        print(f"DEBUG: Content-Type: {request.content_type}")
        print(f"DEBUG: Request method: {request.method}")
        print(f"DEBUG: Request path: {request.path}")
        print(f"DEBUG: Request headers: {dict(request.headers)}")

        # Try to parse JSON manually to see what's happening
        try:
            import json
            if request.body:
                body_str = request.body.decode('utf-8')
                print(f"DEBUG: Body as string: '{body_str}'")
                if body_str.strip():
                    json_data = json.loads(body_str)
                    print(f"DEBUG: Parsed JSON: {json_data}")
                else:
                    print("DEBUG: Empty request body!")
            else:
                print("DEBUG: Request body is None or empty!")
        except Exception as e:
            print(f"DEBUG: Error parsing JSON: {e}")
            import traceback
            traceback.print_exc()

        print("DEBUG: =========================================================")
        return super().dispatch(request, *args, **kwargs)

# Registration endpoint
class RegisterView(generics.CreateAPIView):
    """API endpoint for user registration."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

# Profile endpoint
class MeView(APIView):
    """
    API endpoint to get the profile data for the currently authenticated user.
    Uses the GET method and requires a valid JWT Bearer Token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # request.user is automatically populated by the JWTAuthentication backend
        # if a valid token is provided in the Authorization header.
        return Response(UserSerializer(request.user).data)

# API root welcome view
@api_view(['GET'])
def api_root(request):
    return Response({
        'posts': 'http://127.0.0.1:8000/api/posts/',
        'users': 'http://127.0.0.1:8000/api/users/',
        'register': 'http://127.0.0.1:8000/api/register/',
    })

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by("-created_at")
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def get_queryset(self):
        return Post.objects.filter(user__in=[self.request.user])

    @action(detail=True, methods=['post'])
    def toggle_like(self, request, pk=None):
        post = self.get_object()
        with transaction.atomic():
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

class FeedView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FeedCursorPagination

    def get_queryset(self):
        # 1. Get the list of users the current user is following
        followees = Follow.objects.filter(follower=self.request.user).values_list("followee", flat=True)

        # 2. Filter posts by these users
        queryset = Post.objects.filter(user__in=followees).select_related('user')

        # 3. Denormalize the likes_count for the response
        queryset = queryset.annotate(likes_count_annotated=Count('likes'))

        # 4. Order the posts by creation date to prepare for cursor pagination
        return queryset.order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_presigned_url(request):
    filename = request.GET.get('filename')
    file_type = request.GET.get('file_type')
    if not filename or not file_type:
        return Response({'error': 'filename and file_type required'}, status=400)

    s3 = boto3.client('s3',
                      aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                      aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                      region_name=settings.AWS_S3_REGION_NAME)
    presigned_url = s3.generate_presigned_url('put_object',
                                               Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                                                       'Key': f'user_uploads/{filename}',
                                                       'ContentType': file_type},
                                               ExpiresIn=3600)
    public_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/user_uploads/{filename}"
    return Response({'presigned_url': presigned_url, 'public_url': public_url})


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, username):
        try:
            profile_user = User.objects.get(username=username)
            is_following = Follow.objects.filter(follower=request.user, followee=profile_user).exists() if request.user.is_authenticated else False

            # Get the user's posts
            posts_queryset = Post.objects.filter(user=profile_user).order_by('-created_at').annotate(likes_count_annotated=Count('likes'))

            # Paginate the posts
            paginator = ProfilePostPagination()
            paginated_posts = paginator.paginate_queryset(posts_queryset, request)
            posts_serializer = PostSerializer(paginated_posts, many=True, context={'request': request})

            return Response({
                'user': UserSerializer(profile_user).data,
                'is_following': is_following,
                'follower_count': profile_user.followers.count(),
                'following_count': profile_user.following.count(),
                'posts': posts_serializer.data,
                'posts_next': paginator.get_next_link(),
                'posts_previous': paginator.get_previous_link(),
            })
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)