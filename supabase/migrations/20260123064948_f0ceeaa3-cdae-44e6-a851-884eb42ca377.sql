-- Add uses_per_user column to coupons table
-- This controls how many times a single user can use the coupon
-- NULL means unlimited uses per user, 1 means one-time use per user
ALTER TABLE public.coupons 
ADD COLUMN uses_per_user integer DEFAULT 1;

-- Add comment explaining the field
COMMENT ON COLUMN public.coupons.uses_per_user IS 'Number of times a single user can use this coupon. NULL = unlimited, 1 = one-time per user';

-- Add use_count to user_coupons to track multiple uses
ALTER TABLE public.user_coupons 
ADD COLUMN use_count integer DEFAULT 0;