/*
  # User Settings Table

  ## Overview
  Stores user-specific configuration for third-party integrations including
  ThingSpeak, Google Colab, and SMS notification services.

  ## New Tables
  
  ### `user_settings`
  Stores API keys and configuration for external services
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key, unique) - References auth.users, one setting per user
  - `thingspeak_api_key` (text, nullable) - ThingSpeak Write API Key
  - `thingspeak_channel_id` (text, nullable) - ThingSpeak Channel ID
  - `colab_webhook_url` (text, nullable) - Google Colab webhook endpoint URL
  - `sms_service` (text, nullable) - SMS provider: 'twilio' or 'fast2sms'
  - `sms_api_key` (text, nullable) - API key for SMS service
  - `sms_phone` (text, nullable) - User's phone number for receiving alerts
  - `twilio_account_sid` (text, nullable) - Twilio Account SID (if using Twilio)
  - `twilio_phone` (text, nullable) - Twilio phone number (if using Twilio)
  - `created_at` (timestamptz) - When settings were first created
  - `updated_at` (timestamptz) - When settings were last updated

  ## Security
  - Enable RLS on user_settings table
  - Users can only view and modify their own settings
  - Sensitive API keys are stored securely

  ## Notes
  - One settings record per user (enforced by unique constraint)
  - All integration fields are optional
  - Settings are automatically passed to edge functions during image processing
*/

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  thingspeak_api_key text,
  thingspeak_channel_id text,
  colab_webhook_url text,
  sms_service text CHECK (sms_service IN ('twilio', 'fast2sms')),
  sms_api_key text,
  sms_phone text,
  twilio_account_sid text,
  twilio_phone text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
