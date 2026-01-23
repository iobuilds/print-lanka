-- Fix permissive RLS policy on otp_sessions (avoid USING/WITH CHECK true)
DROP POLICY IF EXISTS "Service role can manage OTP sessions" ON public.otp_sessions;

CREATE POLICY "Service role can manage OTP sessions"
ON public.otp_sessions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
