import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  message: string;
  order_id?: string;
  user_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SMS settings from system_settings
    const { data: smsSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'sms_config')
      .single();

    if (settingsError || !smsSettings) {
      console.error('SMS settings not configured:', settingsError);
      return new Response(
        JSON.stringify({ error: 'SMS settings not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = smsSettings.value as {
      provider: string;
      api_key?: string;
      api_secret?: string;
      sender_id?: string;
      api_url?: string;
      enabled: boolean;
    };

    if (!config.enabled) {
      console.log('SMS notifications disabled');
      return new Response(
        JSON.stringify({ success: false, message: 'SMS notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone, message, order_id, user_id }: SMSRequest = await req.json();

    // Log the notification attempt
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        phone,
        message,
        order_id,
        user_id,
        status: 'pending'
      })
      .select()
      .single();

    if (notifError) {
      console.error('Failed to log notification:', notifError);
    }

    let smsResult = { success: false, response: '' };

    // Send SMS based on provider
    if (config.provider === 'textlk') {
      // Text.lk (Sri Lanka) SMS API
      const textlkUrl = 'https://app.text.lk/api/http/sms/send';
      
      const response = await fetch(textlkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          api_token: config.api_key,
          recipient: phone.replace('+', ''),
          sender_id: config.sender_id || 'Print3D',
          type: 'plain',
          message: message,
        }),
      });

      const result = await response.json();
      smsResult = { success: response.ok && result.status === 'success', response: JSON.stringify(result) };
    } else if (config.provider === 'twilio') {
      const twilioAccountSid = config.api_key;
      const twilioAuthToken = config.api_secret;
      const twilioFrom = config.sender_id;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: twilioFrom || '',
          Body: message,
        }),
      });

      const result = await response.json();
      smsResult = { success: response.ok, response: JSON.stringify(result) };
    } else if (config.provider === 'dialog') {
      // Dialog Axiata (Sri Lanka) SMS API
      const dialogUrl = config.api_url || 'https://e-sms.dialog.lk/api/v1/message/send';
      
      const response = await fetch(dialogUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msisdn: phone.replace('+', ''),
          message: message,
          sourceAddress: config.sender_id || 'Print3D',
        }),
      });

      const result = await response.text();
      smsResult = { success: response.ok, response: result };
    } else if (config.provider === 'mobitel') {
      // Mobitel (Sri Lanka) SMS API
      const mobitelUrl = config.api_url || 'https://sms.mobitel.lk/api/v1/send';
      
      const response = await fetch(mobitelUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          message: message,
          from: config.sender_id,
        }),
      });

      const result = await response.text();
      smsResult = { success: response.ok, response: result };
    } else if (config.provider === 'generic') {
      // Generic HTTP API
      const genericUrl = config.api_url;
      if (!genericUrl) {
        throw new Error('API URL not configured for generic provider');
      }

      const response = await fetch(genericUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone,
          message: message,
          sender_id: config.sender_id,
        }),
      });

      const result = await response.text();
      smsResult = { success: response.ok, response: result };
    }

    // Update notification status
    if (notification) {
      await supabase
        .from('notifications')
        .update({
          status: smsResult.success ? 'sent' : 'failed',
          provider_response: smsResult.response,
        })
        .eq('id', notification.id);
    }

    return new Response(
      JSON.stringify({ success: smsResult.success, message: 'SMS processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('SMS error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
