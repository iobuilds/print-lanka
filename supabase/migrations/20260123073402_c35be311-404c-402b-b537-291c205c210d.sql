-- Add is_public flag to coupons table to distinguish public vs private coupons
ALTER TABLE public.coupons 
ADD COLUMN is_public boolean DEFAULT true;

-- Update RLS policy to only show public coupons to regular users
DROP POLICY IF EXISTS "Users can view active coupons for validation" ON public.coupons;

CREATE POLICY "Users can view active public coupons"
ON public.coupons
FOR SELECT
USING (
  is_active = true 
  AND (valid_until IS NULL OR valid_until > now())
  AND is_public = true
);

-- Admins can still see all coupons (already have ALL policy)