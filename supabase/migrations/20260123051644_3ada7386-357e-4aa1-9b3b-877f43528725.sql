-- Create available_colors table for admin to manage colors
CREATE TABLE public.available_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hex_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.available_colors ENABLE ROW LEVEL SECURITY;

-- Everyone can view active colors
CREATE POLICY "Anyone can view active colors" 
ON public.available_colors 
FOR SELECT 
USING (is_active = true);

-- Only admins/moderators can manage colors
CREATE POLICY "Admins can manage colors" 
ON public.available_colors 
FOR ALL 
USING (public.is_admin_or_moderator(auth.uid()));

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  min_order_value NUMERIC DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Only admins/moderators can manage coupons
CREATE POLICY "Admins can manage coupons" 
ON public.coupons 
FOR ALL 
USING (public.is_admin_or_moderator(auth.uid()));

-- Authenticated users can validate coupons (read active ones)
CREATE POLICY "Users can view active coupons for validation" 
ON public.coupons 
FOR SELECT 
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Insert default colors
INSERT INTO public.available_colors (name, hex_value, sort_order) VALUES
  ('White', '#FFFFFF', 1),
  ('Black', '#1a1a1a', 2),
  ('Red', '#ef4444', 3),
  ('Blue', '#3b82f6', 4),
  ('Green', '#22c55e', 5),
  ('Yellow', '#eab308', 6),
  ('Orange', '#f97316', 7),
  ('Purple', '#a855f7', 8),
  ('Gray', '#6b7280', 9),
  ('Pink', '#ec4899', 10);