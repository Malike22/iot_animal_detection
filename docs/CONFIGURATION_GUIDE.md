# Configuration Guide - Finding Your URLs and Keys

This guide helps you locate all the necessary configuration values for your Animal Detection System.

## Supabase Configuration

### Finding Your Supabase URL and Keys

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Log in with your account

2. **Select Your Project**
   - Click on your project name (e.g., "Animal Detection")

3. **Get API Credentials**
   - Click "Settings" in the left sidebar
   - Select "API" tab
   - You'll see:

```
Project URL:        https://[PROJECT-ID].supabase.co
Anon Public Key:    sb_publishable_[YOUR-ANON-KEY]
Service Role Key:   [YOUR-SERVICE-ROLE-KEY]
```

### Example with Your Project

```
Project URL:        https://kocncqnksuumkeuypxim.supabase.co
Anon Public Key:    sb_publishable_zXOblkJ0vHCgz209ik0AGg_efctsNlE
```

## Where to Use These Values

### In Flask Backend

**File: `.env`**

```env
SUPABASE_URL=https://kocncqnksuumkeuypxim.supabase.co
SUPABASE_KEY=sb_publishable_zXOblkJ0vHCgz209ik0AGg_efctsNlE
SUPABASE_SERVICE_KEY=[your-service-role-key]
BACKEND_SECRET_KEY=my-secure-key-123
```

### In Google Colab Notebook

**Cell 3: Configuration**

```python
BACKEND_URL = "https://your-flask-backend.com"  # Where you deployed Flask
```

No need to set Supabase URL in Colab - the Flask backend handles it!

### In Raspberry Pi Script

**File: `animal_detection.py`**

```python
# API Configuration
API_URL = "https://kocncqnksuumkeuypxim.supabase.co/functions/v1/upload-image"
USER_ID = "your-user-id-here"
```

## Web App Configuration

Your React web app automatically uses the Supabase URL from:

**File: `src/lib/supabase.ts`**

Already configured to use environment variables:
```
VITE_SUPABASE_URL=https://kocncqnksuumkeuypxim.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_zXOblkJ0vHCgz209ik0AGg_efctsNlE
```

## Finding Your User ID

Your User ID is needed for Raspberry Pi and direct API calls.

### Method 1: From Web App Settings

1. Log in to your animal detection web app
2. Click "Settings" button
3. Look for User ID in the URL or settings panel

### Method 2: From Browser Console

1. Log in to web app
2. Open browser console (F12)
3. Paste and run:
```javascript
console.log(localStorage.getItem('supabase.auth.token'))
```
4. Look for the `sub` field (Subject) - that's your User ID

### Method 3: From Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Click "New Query"
5. Run:
```sql
SELECT id, email, created_at FROM auth.users;
```

## Setting Up Flask Backend URL

After deploying your Flask backend, you'll get a public URL:

### Vercel
```
https://your-project-name.vercel.app
```

### Render
```
https://your-project-name.onrender.com
```

### Railway
```
https://your-project-name-production.up.railway.app
```

Use this URL in:
- Google Colab `BACKEND_URL`
- Any external service that calls your backend

## Database URLs (For Advanced Users)

If you need to connect directly to the database:

**Connection Pooling (Recommended for Flask)**
```
postgresql://postgres.kocncqnksuumkeuypxim:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Direct Connection (For Migrations)**
```
postgresql://postgres.kocncqnksuumkeuypxim:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

Replace `[PASSWORD]` with your database password from Supabase Settings → Database.

## Summary Table

| Component | URL Format | Where to Find |
|-----------|-----------|---------------|
| Supabase Project | `https://[PROJECT-ID].supabase.co` | Supabase Dashboard → Settings → API |
| Flask Backend | `https://your-app.vercel.app` | After deployment |
| Google Colab | No URL needed | Uses Flask backend URL |
| Raspberry Pi | Uses Supabase URL + `/functions/v1/upload-image` | Supabase Project URL |
| User ID | UUID format | Web app Settings or SQL query |

## Quick Copy-Paste Template

Update these with YOUR values:

```bash
# Supabase (from dashboard)
SUPABASE_URL="https://kocncqnksuumkeuypxim.supabase.co"
SUPABASE_ANON_KEY="sb_publishable_zXOblkJ0vHCgz209ik0AGg_efctsNlE"
SUPABASE_SERVICE_KEY="your-service-role-key-here"

# Flask Backend (after deployment)
BACKEND_URL="https://your-app.vercel.app"
BACKEND_SECRET_KEY="my-secret-key-123"

# Raspberry Pi / Direct API
USER_ID="your-user-id-uuid"
API_ENDPOINT="${SUPABASE_URL}/functions/v1/upload-image"
```

## Troubleshooting

### "Invalid API Key"
- Copy the correct key from Supabase dashboard
- Use Anon key for client-side code
- Use Service Role key for backend/server-side code

### "Connection refused"
- Verify Supabase URL is correct format: `https://[ID].supabase.co`
- Check internet connection

### "404 Not Found on /functions/v1"
- Ensure Edge Functions are deployed
- Check function exists in Supabase dashboard

### "Backend unreachable"
- Verify Flask backend URL is correct
- Test with: `curl https://your-backend.com/health`
- Check backend is still running

## Security Notes

- NEVER commit API keys to Git
- Use `.env` files for local development
- Deploy services use environment variables, not hardcoded keys
- Service Role Key is sensitive - only use on backend
- Share Anon Key with frontend only

## Next Steps

1. Gather all your URLs and keys using this guide
2. Update Flask backend `.env` file
3. Update Colab notebook configuration
4. Update Raspberry Pi script
5. Deploy Flask backend
6. Test connections with health check endpoints
