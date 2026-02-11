import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface UploadRequest {
  image: string;
  userId: string;
  metadata?: Record<string, unknown>;
  thingspeakApiKey?: string;
  thingspeakChannelId?: string;
  colabWebhookUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { image, userId, metadata, thingspeakApiKey, thingspeakChannelId, colabWebhookUrl }: UploadRequest = await req.json();

    if (!image || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image and userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBuffer = Uint8Array.from(atob(image), c => c.charCodeAt(0));
    const fileName = `${Date.now()}-detection.jpg`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('captured-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('captured-images')
      .getPublicUrl(filePath);

    let thingspeakUrl = null;
    if (thingspeakApiKey && thingspeakChannelId) {
      try {
        const thingspeakResponse = await fetch(
          `https://api.thingspeak.com/update.json?api_key=${thingspeakApiKey}&field1=${encodeURIComponent(publicUrl)}`
        );
        if (thingspeakResponse.ok) {
          const thingspeakData = await thingspeakResponse.json();
          thingspeakUrl = `https://thingspeak.com/channels/${thingspeakChannelId}/feeds/${thingspeakData}`;
        }
      } catch (error) {
        console.error('ThingSpeak upload error:', error);
      }
    }

    const { data: capturedImage, error: dbError } = await supabase
      .from('captured_images')
      .insert({
        user_id: userId,
        image_url: publicUrl,
        thingspeak_url: thingspeakUrl,
        status: 'pending',
        metadata: metadata || {}
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    if (colabWebhookUrl) {
      try {
        await fetch(colabWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: publicUrl,
            captured_image_id: capturedImage.id,
            user_id: userId
          })
        });

        await supabase
          .from('captured_images')
          .update({ status: 'processing' })
          .eq('id', capturedImage.id);
      } catch (error) {
        console.error('Colab webhook error:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        capturedImageId: capturedImage.id,
        imageUrl: publicUrl,
        thingspeakUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});