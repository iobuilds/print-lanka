-- Create user_coupons table to track which coupons users have
CREATE TABLE public.user_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_on_order_id UUID REFERENCES public.orders(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, coupon_id)
);

-- Enable RLS
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

-- Users can view their own coupons
CREATE POLICY "Users can view their own coupons" 
ON public.user_coupons 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own coupons (mark as used)
CREATE POLICY "Users can update their own coupons" 
ON public.user_coupons 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can manage all user coupons
CREATE POLICY "Admins can manage user coupons" 
ON public.user_coupons 
FOR ALL 
USING (public.is_admin_or_moderator(auth.uid()));