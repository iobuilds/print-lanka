-- Add policy to allow users to claim coupons themselves
CREATE POLICY "Users can claim coupons"
ON public.user_coupons
FOR INSERT
WITH CHECK (auth.uid() = user_id);