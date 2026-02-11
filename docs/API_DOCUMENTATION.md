# API Documentation

Complete API reference for the Animal Detection System.

## Base URL

```
https://YOUR_SUPABASE_URL/functions/v1
```

## Authentication

Most endpoints require authentication using the Supabase Anon Key:

```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

## Endpoints

### 1. Upload Image (Raspberry Pi)

Upload a captured image from Raspberry Pi hardware.

**Endpoint:** `POST /upload-image`

**Authentication:** Public (no JWT verification)

**Request Body:**

```json
{
  "image": "base64_encoded_image_string",
  "userId": "uuid",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00",
    "device": "raspberry_pi_3b",
    "sensor_data": {}
  },
  "thingspeakApiKey": "optional_thingspeak_key",
  "thingspeakChannelId": "optional_channel_id",
  "colabWebhookUrl": "optional_colab_url"
}
```

**Response:**

```json
{
  "success": true,
  "capturedImageId": "uuid",
  "imageUrl": "https://storage.url/path/to/image.jpg",
  "thingspeakUrl": "https://thingspeak.com/channels/..."
}
```

**Error Response:**

```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing required fields
- `500` - Server error

---

### 2. Process Detection (Google Colab Callback)

Receive labeled image and AI detection results from Google Colab.

**Endpoint:** `POST /process-detection`

**Authentication:** Public (no JWT verification)

**Request Body:**

```json
{
  "capturedImageId": "uuid",
  "userId": "uuid",
  "labeledImage": "base64_encoded_labeled_image",
  "animalDetected": "Elephant",
  "confidenceScore": 95.5,
  "colabNotebookId": "colab-session-abc123",
  "thingspeakApiKey": "optional_key",
  "thingspeakChannelId": "optional_id",
  "smsApiKey": "optional_sms_key",
  "smsPhone": "+1234567890",
  "smsService": "twilio",
  "twilioAccountSid": "optional_twilio_sid",
  "twilioPhone": "+1234567890"
}
```

**Response:**

```json
{
  "success": true,
  "labeledImageId": "uuid",
  "labeledImageUrl": "https://storage.url/path/to/labeled.jpg",
  "thingspeakUrl": "https://thingspeak.com/channels/...",
  "smsSent": true,
  "smsError": null
}
```

**Error Response:**

```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing required fields
- `500` - Server error

---

## Database Schema

### Tables

#### `captured_images`

Stores raw images captured from Raspberry Pi.

```typescript
{
  id: uuid (primary key)
  user_id: uuid (foreign key → auth.users)
  image_url: text
  thingspeak_url: text | null
  detection_timestamp: timestamp
  uploaded_at: timestamp
  status: 'pending' | 'processing' | 'completed' | 'failed'
  metadata: jsonb
}
```

#### `labeled_images`

Stores AI-processed images with animal labels.

```typescript
{
  id: uuid (primary key)
  captured_image_id: uuid (foreign key → captured_images)
  user_id: uuid (foreign key → auth.users)
  labeled_image_url: text
  animal_detected: text
  confidence_score: float
  processed_at: timestamp
  colab_notebook_id: text | null
  thingspeak_url: text | null
  sms_sent: boolean
  sms_sent_at: timestamp | null
}
```

#### `user_settings`

Stores user configuration for integrations.

```typescript
{
  id: uuid (primary key)
  user_id: uuid (foreign key → auth.users, unique)
  thingspeak_api_key: text | null
  thingspeak_channel_id: text | null
  colab_webhook_url: text | null
  sms_service: 'twilio' | 'fast2sms' | null
  sms_api_key: text | null
  sms_phone: text | null
  twilio_account_sid: text | null
  twilio_phone: text | null
  created_at: timestamp
  updated_at: timestamp
}
```

---

## Supabase Client Usage

### Initialize Client

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)
```

### Fetch Captured Images

```typescript
const { data, error } = await supabase
  .from('captured_images')
  .select('*')
  .eq('user_id', userId)
  .order('detection_timestamp', { ascending: false })
```

### Fetch Labeled Images

```typescript
const { data, error } = await supabase
  .from('labeled_images')
  .select('*')
  .eq('user_id', userId)
  .order('processed_at', { ascending: false })
```

### Upload Image to Storage

```typescript
const { data, error } = await supabase.storage
  .from('captured-images')
  .upload(`${userId}/${fileName}`, file)
```

### Get Public URL

```typescript
const { data } = supabase.storage
  .from('captured-images')
  .getPublicUrl(filePath)

console.log(data.publicUrl)
```

---

## Third-Party Integrations

### ThingSpeak API

**Upload Data to ThingSpeak:**

```bash
curl "https://api.thingspeak.com/update.json?api_key=YOUR_API_KEY&field1=VALUE"
```

**Response:**
```json
1  // Entry ID
```

**View Channel:**
```
https://thingspeak.com/channels/YOUR_CHANNEL_ID
```

---

### Twilio SMS API

**Send SMS:**

```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
  --data-urlencode "To=+1234567890" \
  --data-urlencode "From=+1234567890" \
  --data-urlencode "Body=Alert! Animal detected" \
  -u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN
```

---

### Fast2SMS API

**Send SMS:**

```bash
curl -X POST "https://www.fast2sms.com/dev/bulkV2" \
  -H "authorization: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "route": "q",
    "message": "Alert! Animal detected",
    "language": "english",
    "flash": 0,
    "numbers": "1234567890"
  }'
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Missing or invalid parameters |
| 401 | Unauthorized - Invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Rate Limits

- API requests: 1000 per hour per user
- Image uploads: 100 per hour
- Storage: 1GB per user (free tier)

---

## Webhooks

### Colab Webhook Request Format

When an image is captured, the system sends:

```json
{
  "image_url": "https://storage.url/image.jpg",
  "captured_image_id": "uuid",
  "user_id": "uuid"
}
```

### Expected Webhook Response

Your Colab notebook should respond with:

```json
{
  "success": true,
  "animal": "Elephant",
  "confidence": 95.5
}
```

---

## Security Best Practices

1. **Never expose API keys** in client-side code
2. **Use Row Level Security** for all database tables
3. **Validate all inputs** on edge functions
4. **Use HTTPS** for all API calls
5. **Rotate keys** regularly
6. **Monitor usage** for unusual patterns

---

## Support

For issues or questions:
- Check the documentation
- Review error logs
- Contact system administrator
