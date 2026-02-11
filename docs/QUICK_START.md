# Quick Start Guide

Get your Animal Detection System up and running in 10 minutes!

## 1. Access the Web Application

The application should now be running. Open it in your browser.

## 2. Create Your Account

1. Click "Sign Up"
2. Enter your email and password (minimum 6 characters)
3. Click "Sign Up" button
4. You'll see a success message
5. Click "Go to Login"
6. Login with your credentials

## 3. Create Storage Buckets (One-Time Setup)

**IMPORTANT:** Before uploading images, create storage buckets in Supabase:

1. Go to [your Supabase project](https://supabase.com/dashboard)
2. Click on "Storage" in the left sidebar
3. Click "Create a new bucket"
4. Create bucket named: `captured-images`
   - Make it **Public**
   - Click "Create bucket"
5. Create another bucket named: `labeled-images`
   - Make it **Public**
   - Click "Create bucket"

## 4. Test the System (Without Hardware)

1. In the dashboard, click "Show Upload"
2. Click "Click to upload an image"
3. Select any animal image from your computer
4. Wait a few seconds
5. The image will appear in "Captured Images" tab

**Success!** You've successfully uploaded your first image.

## 5. Configure Integrations (Optional)

Click "Settings" button to configure:

### ThingSpeak (Cloud Storage)
- Sign up at [ThingSpeak.com](https://thingspeak.com)
- Create a new channel
- Copy your Write API Key and Channel ID
- Paste in Settings → Save

### Google Colab (AI Detection)
- Open the Google Colab guide: `docs/GOOGLE_COLAB_SETUP.md`
- Follow the setup instructions
- Copy the webhook URL
- Paste in Settings → Save
- Now AI will automatically detect animals!

### SMS Alerts
- Choose Twilio or Fast2SMS
- Sign up for an account
- Get your API credentials
- Enter in Settings → Save
- You'll receive SMS when animals are detected!

## 6. Set Up Raspberry Pi (Optional)

For real hardware detection:

1. Open `docs/RASPBERRY_PI_SETUP.md`
2. Follow the wiring diagram
3. Install the Python script
4. Configure with your User ID
5. Run the script
6. Test by waving hand in front of PIR sensor

## What Happens Next?

### With Hardware:
1. Animal enters field
2. PIR sensor detects movement
3. LED turns ON instantly
4. Camera captures image
5. Image uploads to cloud
6. After 2 minutes → Buzzer sounds
7. (If Colab configured) AI identifies animal
8. (If SMS configured) You receive alert
9. View everything in dashboard!

### Without Hardware (Testing):
1. Upload image manually
2. View in "Captured Images"
3. (If Colab configured) Wait for AI processing
4. Check "Labeled Images" for results
5. (If SMS configured) Receive notification

## System URLs

Save these for later:

- **Dashboard:** Your web app URL
- **Supabase Project:** https://supabase.com/dashboard
- **ThingSpeak Channel:** https://thingspeak.com/channels/YOUR_CHANNEL_ID
- **API Endpoint:** `https://YOUR_SUPABASE_URL/functions/v1/upload-image`

## Getting Your User ID

Need your User ID for Raspberry Pi setup?

1. Login to dashboard
2. Open browser console (F12)
3. Type: `localStorage.getItem('supabase.auth.token')`
4. Look for "user" object
5. Copy the "id" field

Or check the Settings page URL parameters.

## Verification Checklist

- [ ] Can login to dashboard
- [ ] Storage buckets created
- [ ] Can upload test image
- [ ] Image appears in Captured Images tab
- [ ] Settings page accessible
- [ ] (Optional) ThingSpeak configured
- [ ] (Optional) Colab webhook configured
- [ ] (Optional) SMS service configured
- [ ] (Optional) Raspberry Pi connected

## Common First-Time Issues

### "Upload failed" error
- **Fix:** Create storage buckets in Supabase (see step 3)

### Images not appearing
- **Fix:** Refresh the page or click "Refresh" button

### Can't see labeled images
- **Fix:** This is normal if Google Colab is not configured. It's optional.

### SMS not working
- **Fix:** Verify phone number format includes country code (e.g., +1234567890)

## Next Steps

Once everything is working:

1. **Read Full Documentation**
   - `README.md` - Complete overview
   - `docs/API_DOCUMENTATION.md` - API reference
   - `docs/RASPBERRY_PI_SETUP.md` - Hardware guide
   - `docs/GOOGLE_COLAB_SETUP.md` - AI setup

2. **Train Custom AI Model**
   - Collect your own animal images
   - Follow Colab guide to train model
   - Improve detection accuracy

3. **Deploy to Production**
   - Build: `npm run build`
   - Deploy to Vercel, Netlify, or your server
   - Use production Supabase instance

4. **Add More Features**
   - Multiple cameras
   - Video recording
   - Advanced analytics
   - Mobile app

## Support

Stuck? Check:
- Browser console for errors (F12)
- Supabase logs in dashboard
- Network tab for failed requests
- API documentation

## You're All Set!

Your Animal Detection System is ready to protect your fields and property. The system will:

- Detect animals 24/7
- Capture clear images
- Identify what animal it is
- Alert you immediately
- Store all data safely in the cloud

**Happy monitoring!**
