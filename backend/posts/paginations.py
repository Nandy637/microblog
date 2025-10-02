# posts/paginations.py

from rest_framework.pagination import CursorPagination, PageNumberPagination

class FeedCursorPagination(CursorPagination):
    page_size = 20
    ordering = '-created_at'  # Ensures the feed is ordered by newest posts first
    cursor_query_param = 'cursor'

class ProfilePostPagination(PageNumberPagination):
    page_size = 20