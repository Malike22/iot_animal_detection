import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ProcessRequest {
  capturedImageId: string;
  userId: string;
  labeledImage: string;
  animalDetected: string;
  confidenceScore?: number;
  colabNotebookId?: string;
  thingspeakApiKey?: string;
  thingspeakChannelId?: string;
  smsApiKey?: string;
  smsPhone?: string;
  smsService?: 'twilio' | 'fast2sms';
  twilioAccountSid?: string;
  twilioPhone?: string;
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

    const requestData: ProcessRequest = await req.json();
    const {
      capturedImageId,
      userId,
      labeledImage,
      animalDetected,
      confidenceScore,
      colabNotebookId,
      thingspeakApiKey,
      thingspeakChannelId,
      smsApiKey,
      smsPhone,
      smsService,
      twilioAccountSid,
      twilioPhone
    } = requestData;

    if (!capturedImageId || !userId || !labeledImage || !animalDetected) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBuffer = Uint8Array.from(atob(labeledImage), c => c.charCodeAt(0));
    const fileName = `${Date.now()}-labeled-${animalDetected.toLowerCase()}.jpg`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('labeled-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('labeled-images')
      .getPublicUrl(filePath);

    let thingspeakUrl = null;
    if (thingspeakApiKey && thingspeakChannelId) {
      try {
        const thingspeakResponse = await fetch(
          `https://api.thingspeak.com/update.json?api_key=${thingspeakApiKey}&field2=${encodeURIComponent(publicUrl)}&field3=${encodeURIComponent(animalDetected)}`
        );
        if (thingspeakResponse.ok) {
          const thingspeakData = await thingspeakResponse.json();
          thingspeakUrl = `https://thingspeak.com/channels/${thingspeakChannelId}/feeds/${thingspeakData}`;
        }
      } catch (error) {
        console.error('ThingSpeak upload error:', error);
      }
    }

    let smsSent = false;
    let smsError = null;

    if (smsApiKey && smsPhone) {
      try {
        const message = `Alert! A ${animalDetected} has entered your field. Detection confidence: ${confidenceScore ? confidenceScore.toFixed(1) + '%' : 'N/A'}`;

        if (smsService === 'twilio' && twilioAccountSid && twilioPhone) {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const twilioAuth = btoa(`${twilioAccountSid}:${smsApiKey}`);
          
          const twilioResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${twilioAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              To: smsPhone,
              From: twilioPhone,
              Body: message
            })
          });

          smsSent = twilioResponse.ok;
        } else if (smsService === 'fast2sms') {
          const fast2smsUrl = 'https://www.fast2sms.com/dev/bulkV2';
          const fast2smsResponse = await fetch(fast2smsUrl, {
            method: 'POST',
            headers: {
              'authorization': smsApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              route: 'q',
              message: message,
              language: 'english',
              flash: 0,
              numbers: smsPhone
            })
          });

          smsSent = fast2smsResponse.ok;
        }
      } catch (error) {
        console.error('SMS sending error:', error);
        smsError = error.message;
      }
    }

    const { data: labeledImageData, error: dbError } = await supabase
      .from('labeled_images')
      .insert({
        captured_image_id: capturedImageId,
        user_id: userId,
        labeled_image_url: publicUrl,
        animal_detected: animalDetected,
        confidence_score: confidenceScore,
        colab_notebook_id: colabNotebookId,
        thingspeak_url: thingspeakUrl,
        sms_sent: smsSent,
        sms_sent_at: smsSent ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    await supabase
      .from('captured_images')
      .update({ status: 'completed' })
      .eq('id', capturedImageId);

    return new Response(
      JSON.stringify({
        success: true,
        labeledImageId: labeledImageData.id,
        labeledImageUrl: publicUrl,
        thingspeakUrl,
        smsSent,
        smsError
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