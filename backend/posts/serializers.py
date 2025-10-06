# posts/serializers.py
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Post, Like, Follow
from django.contrib.auth.models import User
from django.contrib.auth import authenticate

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Replace username field with email field
        self.fields['email'] = serializers.EmailField()
        self.fields.pop('username', None)

    def validate(self, attrs):
        # Get email from attrs (it comes as 'email' now)
        email = attrs.get('email')
        password = attrs.get('password')

        print(f"DEBUG SERIALIZER: Attempting login with email={email}")

        if not email or not password:
            print("DEBUG SERIALIZER: Missing email or password")
            raise serializers.ValidationError('Email and password are required')

        # Try to authenticate with email as username (our EmailBackend handles this)
        user = authenticate(username=email, password=password)
        print(f"DEBUG SERIALIZER: Authentication result: {user}")

        if user is None:
            print(f"DEBUG SERIALIZER: Authentication failed for {email}")
            raise serializers.ValidationError('Invalid email or password')

        if not user.is_active:
            print(f"DEBUG SERIALIZER: User {email} is not active")
            raise serializers.ValidationError('User account is disabled')

        print(f"DEBUG SERIALIZER: Authentication successful for {user.username}")

        # Generate tokens manually instead of calling parent
        refresh = self.get_token(user)
        
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }
        
        print(f"DEBUG SERIALIZER: Returning tokens for {user.username}")
        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "date_joined"]


# Add this new class for registration
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class PostSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    content = serializers.CharField(source="text", allow_blank=True)
    likes_count = serializers.ReadOnlyField()
    is_liked = serializers.SerializerMethodField()
    image_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Post
        fields = ["id", "author", "content", "image_url", "created_at", "likes_count", "is_liked"]

    def get_author(self, obj):
        return {
            "id": obj.user.id,
            "username": obj.user.username,
            "avatar_url": getattr(obj.user, 'avatar_url', None)
        }

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False