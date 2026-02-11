/*
  # Create Captured Images Storage Bucket

  Creates the storage bucket for storing animal detection images captured by Raspberry Pi.
  The bucket will be used to store images before and after AI processing.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('captured-images', 'captured-images', true)
ON CONFLICT (id) DO NOTHING;
