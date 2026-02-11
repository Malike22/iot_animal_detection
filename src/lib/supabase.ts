import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CapturedImage {
  id: string;
  user_id: string;
  image_url: string;
  thingspeak_url?: string;
  detection_timestamp: string;
  uploaded_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface LabeledImage {
  id: string;
  captured_image_id: string;
  user_id: string;
  labeled_image_url: string;
  animal_detected: string;
  confidence_score?: number;
  processed_at: string;
  colab_notebook_id?: string;
  thingspeak_url?: string;
  sms_sent: boolean;
  sms_sent_at?: string;
}
