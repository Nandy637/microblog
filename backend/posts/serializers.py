# posts/serializers.py
from rest_framework import serializers
from .models import Post, Like, Follow
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(source='likes_count_annotated', read_only=True)

    class Meta:
        model = Post
        fields = ["id", "author", "text", "image", "created_at", "likes_count", "is_liked"]

    def get_is_liked(self, obj):
        user = self.context['request'].user
        if user.is_anonymous:
            return False
        return obj.likes.filter(user=user).exists()