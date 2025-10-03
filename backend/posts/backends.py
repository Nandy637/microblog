from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        # First try to find user by email (treating username as email)
        user = User.objects.filter(email=username).first()
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user

        # If not found by email, try normal username authentication
        user = User.objects.filter(username=username).first()
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None