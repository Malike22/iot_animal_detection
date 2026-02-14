-- Allow service role to insert into labeled_images table
-- This fixes the "new row violates row-level security policy" error when the backend saves detections.

CREATE POLICY "Allow service role insert"
ON labeled_images
FOR INSERT
TO service_role
WITH CHECK (true);
