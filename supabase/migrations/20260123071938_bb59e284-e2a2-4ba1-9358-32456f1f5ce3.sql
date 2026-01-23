-- Add unique constraint to prevent users from claiming the same coupon twice
ALTER TABLE public.user_coupons 
ADD CONSTRAINT user_coupons_user_coupon_unique UNIQUE (user_id, coupon_id);

-- Also ensure that when checking coupons, we properly check the is_used flag