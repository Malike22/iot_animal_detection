/*
  # Animal Detection System Database Schema

  ## Overview
  This migration sets up the complete database schema for an IoT-based animal detection system
  that integrates Raspberry Pi hardware with cloud AI and web interface.

  ## New Tables
  
  ### `captured_images`
  Stores raw images captured by Raspberry Pi camera when PIR sensor detects motion
  - `id` (uuid, primary key) - Unique identifier for each capture
  - `user_id` (uuid, foreign key) - References auth.users, owner of the monitoring device
  - `image_url` (text) - URL to the stored image in Supabase Storage
  - `thingspeak_url` (text, nullable) - URL to image stored in ThingSpeak
  - `detection_timestamp` (timestamptz) - When the motion was detected
  - `uploaded_at` (timestamptz) - When image was uploaded to server
  - `status` (text) - Processing status: 'pending', 'processing', 'completed', 'failed'
  - `metadata` (jsonb, nullable) - Additional data like sensor readings, device info

  ### `labeled_images`
  Stores AI-analyzed images with animal identification results
  - `id` (uuid, primary key) - Unique identifier
  - `captured_image_id` (uuid, foreign key) - Links to original captured image
  - `user_id` (uuid, foreign key) - References auth.users
  - `labeled_image_url` (text) - URL to processed/labeled image
  - `animal_detected` (text) - Name of detected animal (Elephant, Cow, Dog, Monkey, etc.)
  - `confidence_score` (float, nullable) - AI model confidence percentage
  - `processed_at` (timestamptz) - When AI processing completed
  - `colab_notebook_id` (text, nullable) - Google Colab session identifier
  - `thingspeak_url` (text, nullable) - URL to labeled image in ThingSpeak
  - `sms_sent` (boolean) - Whether SMS alert was sent
  - `sms_sent_at` (timestamptz, nullable) - When SMS was sent

  ## Security
  - Enable RLS on all tables
  - Users can only view their own images
  - Authenticated users can insert their own images
  - API service role can insert/update for Raspberry Pi integration

  ## Notes
  - Images are stored in Supabase Storage buckets (not as blobs in DB)
  - ThingSpeak integration stores image URLs for cloud backup
  - SMS notifications triggered automatically after labeling
*/

-- Create captured_images table
CREATE TABLE IF NOT EXISTS captured_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  thingspeak_url text,
  detection_timestamp timestamptz DEFAULT now() NOT NULL,
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create labeled_images table
CREATE TABLE IF NOT EXISTS labeled_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_image_id uuid REFERENCES captured_images(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  labeled_image_url text NOT NULL,
  animal_detected text NOT NULL,
  confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 100),
  processed_at timestamptz DEFAULT now() NOT NULL,
  colab_notebook_id text,
  thingspeak_url text,
  sms_sent boolean DEFAULT false NOT NULL,
  sms_sent_at timestamptz
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_captured_images_user_id ON captured_images(user_id);
CREATE INDEX IF NOT EXISTS idx_captured_images_status ON captured_images(status);
CREATE INDEX IF NOT EXISTS idx_captured_images_timestamp ON captured_images(detection_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_labeled_images_user_id ON labeled_images(user_id);
CREATE INDEX IF NOT EXISTS idx_labeled_images_captured_id ON labeled_images(captured_image_id);

-- Enable Row Level Security
ALTER TABLE captured_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE labeled_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for captured_images
CREATE POLICY "Users can view own captured images"
  ON captured_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own captured images"
  ON captured_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own captured images"
  ON captured_images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own captured images"
  ON captured_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for labeled_images
CREATE POLICY "Users can view own labeled images"
  ON labeled_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own labeled images"
  ON labeled_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own labeled images"
  ON labeled_images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own labeled images"
  ON labeled_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);