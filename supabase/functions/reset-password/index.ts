import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetRequest {
  phone: string;
  new_password: string;
  session_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, new_password, session_id }: ResetRequest = await req.json();

    if (!phone || !new_password || !session_id) {
      return new Response(
        JSON.stringify({ error: 'Phone, new password, and session ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number
    const formatPhone = (phoneNum: string): string => {
      let cleaned = phoneNum.replace(/[^0-9]/g, '');
      if (cleaned.startsWith('0')) {
        cleaned = '94' + cleaned.substring(1);
      }
      if (!cleaned.startsWith('94')) {
        cleaned = '94' + cleaned;
      }
      return cleaned;
    };

    const formattedPhone = formatPhone(phone);

    // Verify the OTP session is valid and verified
    const { data: session, error: sessionError } = await supabase
      .from('otp_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('phone', formattedPhone)
      .eq('verified', true)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session. Please verify your phone again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session expired (give 10 more minutes after verification for password reset)
    const sessionExpiry = new Date(session.expires_at);
    sessionExpiry.setMinutes(sessionExpiry.getMinutes() + 10);
    
    if (sessionExpiry < new Date()) {
      await supabase.from('otp_sessions').delete().eq('id', session.id);
      return new Response(
        JSON.stringify({ error: 'Session expired. Please verify your phone again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the user by phone in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, phone')
      .or(`phone.eq.${formattedPhone},phone.eq.0${formattedPhone.substring(2)},phone.eq.+${formattedPhone}`)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the OTP session
    await supabase.from('otp_sessions').delete().eq('id', session.id);

    console.log(`Password reset successfully for ${formattedPhone}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reset password error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
