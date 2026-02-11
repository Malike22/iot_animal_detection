# Flask Backend Setup Guide

This guide explains how to set up a public Flask backend that works with Google Colab as a worker.

## Architecture

```
User uploads image via web app
         ↓
    Supabase Storage
         ↓
  Flask Backend
    /api/pending-tasks    ← Colab polls
    /api/submit-results   ← Colab posts results
         ↓
   Database updated
    Labeled images saved
```

## Prerequisites

- Python 3.8+
- Flask
- Supabase account with credentials
- Deployment platform (Vercel, Render, Railway, or Heroku)

## Local Development

### Step 1: Create Python Project

```bash
mkdir animal-detection-backend
cd animal-detection-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 2: Install Dependencies

```bash
pip install flask flask-cors python-dotenv supabase requests
```

### Step 3: Create `.env` File

First, get your Supabase credentials:
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click "Settings" → "API"
4. Copy your Project URL and API keys

```bash
# .env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key-from-dashboard
SUPABASE_SERVICE_KEY=your-service-role-key-from-dashboard
BACKEND_SECRET_KEY=your-secret-key-for-colab  # Optional: for security
```

Example with actual URLs:
```bash
# .env
SUPABASE_URL=https://kocncqnksuumkeuypxim.supabase.co
SUPABASE_KEY=sb_publishable_zXOblkJ0vHCgz209ik0AGg_efctsNlE
SUPABASE_SERVICE_KEY=your-service-role-key
BACKEND_SECRET_KEY=my-secure-key-123
```

### Step 4: Create Flask Application

Create `app.py`:

```python
import os
import base64
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
import uuid

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
BACKEND_SECRET_KEY = os.getenv('BACKEND_SECRET_KEY', '')

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def verify_colab_secret(request_headers):
    """Verify Colab secret key if configured"""
    if not BACKEND_SECRET_KEY:
        return True

    provided_key = request_headers.get('X-Colab-Secret', '')
    return provided_key == BACKEND_SECRET_KEY


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()}), 200


@app.route('/api/pending-tasks', methods=['GET'])
def get_pending_task():
    """
    Get next pending task for Colab worker

    Returns:
    {
        "task": {
            "id": "task-id",
            "captured_image_id": "image-id",
            "user_id": "user-id",
            "image_url": "https://..."
        }
    }
    or
    {
        "task": null
    }
    """
    try:
        # Verify Colab secret if configured
        if not verify_colab_secret(request.headers):
            return jsonify({'error': 'Unauthorized'}), 401

        # Get the first pending image that hasn't been processed yet
        response = supabase.table('captured_images') \
            .select('id, user_id, image_url') \
            .eq('status', 'pending') \
            .limit(1) \
            .execute()

        if response.data:
            image = response.data[0]

            # Create a task record
            task_id = str(uuid.uuid4())

            return jsonify({
                'task': {
                    'id': task_id,
                    'captured_image_id': image['id'],
                    'user_id': image['user_id'],
                    'image_url': image['image_url']
                }
            }), 200
        else:
            return jsonify({'task': None}), 200

    except Exception as e:
        print(f"Error getting task: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/submit-results', methods=['POST'])
def submit_results():
    """
    Submit processing results from Colab

    Expected payload:
    {
        "task_id": "task-id",
        "captured_image_id": "image-id",
        "user_id": "user-id",
        "success": true,
        "animal_detected": "Elephant",
        "confidence_score": 92.5,
        "labeled_image_base64": "base64-encoded-image",
        "error": null (if success=false)
    }
    """
    try:
        # Verify Colab secret if configured
        if not verify_colab_secret(request.headers):
            return jsonify({'error': 'Unauthorized'}), 401

        data = request.json

        # Validate required fields
        required_fields = ['captured_image_id', 'user_id', 'success']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        captured_image_id = data['captured_image_id']
        user_id = data['user_id']
        success = data['success']

        if success:
            # Process successful detection
            animal_detected = data.get('animal_detected', 'Unknown')
            confidence_score = data.get('confidence_score', 0)
            labeled_image_base64 = data.get('labeled_image_base64', '')

            # Upload labeled image to Supabase Storage
            if labeled_image_base64:
                try:
                    # Decode base64 to bytes
                    image_bytes = base64.b64decode(labeled_image_base64)

                    # Generate unique filename
                    filename = f"{user_id}/labeled-{captured_image_id}.jpg"

                    # Upload to storage
                    supabase.storage.from_bucket('captured-images').upload(
                        filename,
                        image_bytes,
                        {'contentType': 'image/jpeg'}
                    )

                    # Get public URL
                    labeled_url = supabase.storage.from_bucket('captured-images').get_public_url(filename)
                except Exception as e:
                    print(f"Error uploading labeled image: {e}")
                    labeled_url = None
            else:
                labeled_url = None

            # Insert into labeled_images table
            insert_response = supabase.table('labeled_images').insert({
                'captured_image_id': captured_image_id,
                'user_id': user_id,
                'labeled_image_url': labeled_url or '',
                'animal_detected': animal_detected,
                'confidence_score': confidence_score,
                'processed_at': datetime.now().isoformat()
            }).execute()

            # Update captured_image status to completed
            supabase.table('captured_images') \
                .update({'status': 'completed'}) \
                .eq('id', captured_image_id) \
                .execute()

            return jsonify({
                'success': True,
                'message': 'Result recorded',
                'animal': animal_detected,
                'confidence': confidence_score
            }), 200

        else:
            # Process failed detection
            error = data.get('error', 'Unknown error')

            # Update captured_image status to failed
            supabase.table('captured_images') \
                .update({
                    'status': 'failed',
                    'metadata': {'error': error}
                }) \
                .eq('id', captured_image_id) \
                .execute()

            return jsonify({
                'success': True,
                'message': 'Failure recorded'
            }), 200

    except Exception as e:
        print(f"Error submitting results: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """Get status of a specific captured image"""
    try:
        image_id = request.args.get('image_id')
        if not image_id:
            return jsonify({'error': 'Missing image_id parameter'}), 400

        response = supabase.table('captured_images') \
            .select('status, metadata') \
            .eq('id', image_id) \
            .single() \
            .execute()

        if response.data:
            return jsonify({
                'status': response.data['status'],
                'metadata': response.data.get('metadata', {})
            }), 200
        else:
            return jsonify({'error': 'Task not found'}), 404

    except Exception as e:
        print(f"Error getting task status: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### Step 5: Test Locally

```bash
python app.py
```

The backend will run on `http://localhost:5000`

Test the endpoints:
```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/pending-tasks
```

## Deployment to Vercel

### Step 1: Create Vercel Project

```bash
pip install vercel
```

### Step 2: Create `vercel.json`

```json
{
  "buildCommand": "pip install -r requirements.txt",
  "outputDirectory": ".",
  "functions": {
    "app.py": {
      "runtime": "python3.9"
    }
  },
  "env": [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "SUPABASE_SERVICE_KEY",
    "BACKEND_SECRET_KEY"
  ]
}
```

### Step 3: Create `requirements.txt`

```bash
pip freeze > requirements.txt
```

Should contain:
```
Flask==2.3.0
flask-cors==4.0.0
python-dotenv==1.0.0
supabase==2.0.0
requests==2.31.0
```

### Step 4: Update `app.py` for Vercel

At the end of `app.py`, add:

```python
# For Vercel serverless
from vercel_python_asgi import AsgiToWsgi

asgi_app = AsgiToWsgi(app)
```

### Step 5: Deploy

```bash
vercel --prod
```

Follow prompts to:
1. Link to your Vercel account
2. Set environment variables
3. Deploy

## Deployment to Render

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Create Render Service

1. Go to [render.com](https://render.com)
2. Click "Create" → "Web Service"
3. Connect your GitHub repository
4. Set Build Command: `pip install -r requirements.txt`
5. Set Start Command: `gunicorn app:app`
6. Add environment variables:
   - SUPABASE_URL
   - SUPABASE_KEY
   - SUPABASE_SERVICE_KEY
   - BACKEND_SECRET_KEY

### Step 3: Deploy

Click "Create Web Service" to deploy. Render will provide your public URL.

## Deployment to Railway

### Step 1: Create Python Project on Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository

### Step 2: Add Environment Variables

In Railway dashboard:
1. Click "Variables"
2. Add:
   - SUPABASE_URL
   - SUPABASE_KEY
   - SUPABASE_SERVICE_KEY
   - BACKEND_SECRET_KEY

### Step 3: Deploy

Railway auto-deploys on push to main branch.

## API Endpoints

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-07T10:30:00"
}
```

### GET `/api/pending-tasks`
Get next pending image for processing.

**Headers (optional):**
```
X-Colab-Secret: your-secret-key
```

**Response (with task):**
```json
{
  "task": {
    "id": "task-uuid",
    "captured_image_id": "image-id",
    "user_id": "user-id",
    "image_url": "https://supabase-url/storage/v1/object/public/..."
  }
}
```

**Response (no tasks):**
```json
{
  "task": null
}
```

### POST `/api/submit-results`
Submit detection results from Colab.

**Headers:**
```
Content-Type: application/json
X-Colab-Secret: your-secret-key (if configured)
```

**Payload (success):**
```json
{
  "task_id": "task-uuid",
  "captured_image_id": "image-id",
  "user_id": "user-id",
  "success": true,
  "animal_detected": "Elephant",
  "confidence_score": 92.5,
  "labeled_image_base64": "iVBORw0KGgoAAAANSUhE..."
}
```

**Payload (failure):**
```json
{
  "task_id": "task-uuid",
  "captured_image_id": "image-id",
  "user_id": "user-id",
  "success": false,
  "error": "Model inference failed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Result recorded",
  "animal": "Elephant",
  "confidence": 92.5
}
```

## Configuration

### Security

To add authentication:

1. Set `BACKEND_SECRET_KEY` environment variable
2. In Colab notebook, set `BACKEND_SECRET_KEY` to the same value
3. All requests will require `X-Colab-Secret` header

### CORS

By default, CORS is enabled for all origins. To restrict:

```python
CORS(app, resources={r"/api/*": {"origins": ["https://your-domain.com"]}})
```

### Rate Limiting

To add rate limiting:

```bash
pip install Flask-Limiter
```

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/api/pending-tasks', methods=['GET'])
@limiter.limit("30 per minute")
def get_pending_task():
    # ...
```

## Monitoring

### Logging

Add detailed logging:

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/api/pending-tasks')
def get_pending_task():
    logger.info(f"Task request from {request.remote_addr}")
    # ...
```

### Database Queries

Monitor Supabase with:
```python
print(response.data)  # View query results
print(response.error) # Check for errors
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 500 error on /api/pending-tasks | Check Supabase credentials in .env |
| Colab can't reach backend | Verify public URL is correct |
| Results not saving | Ensure Supabase keys have write permissions |
| CORS errors | Check CORS configuration in Flask app |
| Task processing slow | Add indexes to captured_images table in Supabase |

## Next Steps

1. Deploy Flask backend to your preferred platform
2. Update Colab notebook with backend URL
3. Run Colab worker
4. Upload image via web app
5. Watch results appear in Colab output
