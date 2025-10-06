# Microblog Setup

## Local Development

This project uses Django's built-in file storage for image uploads during development.

### Prerequisites
- Python 3.8+ for backend
- Node.js for frontend

### Run the Application

1. Backend:
   ```bash
   cd microblog/backend
   python manage.py runserver 127.0.0.1:8000
   ```

2. ASGI Server for WebSockets (in another terminal):
   ```bash
   cd microblog/backend
   daphne microblog.asgi:application --port 8001
   ```

3. Frontend:
   ```bash
   cd microblog/frontend
   npm run dev
   ```

### Image Uploads

- Images are stored locally in `backend/media/user_uploads/`
- Accessible via `/media/user_uploads/` URLs
- No external dependencies required

For production, you can configure AWS S3 or other cloud storage.