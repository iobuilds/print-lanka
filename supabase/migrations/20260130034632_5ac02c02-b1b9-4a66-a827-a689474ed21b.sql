-- Create product categories table
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category to shop_products
ALTER TABLE public.shop_products ADD COLUMN category_id UUID REFERENCES public.product_categories(id);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active categories" 
ON public.product_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage categories" 
ON public.product_categories 
FOR ALL 
USING (is_admin_or_moderator(auth.uid()));

-- Store admin phone for notifications
INSERT INTO public.system_settings (key, value)
VALUES ('admin_phone', '"0770000000"')
ON CONFLICT (key) DO NOTHING;

-- Create SMS campaigns table
CREATE TABLE public.sms_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_filter JSONB DEFAULT '{}'::jsonb,
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Campaign recipients log
CREATE TABLE public.sms_campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  provider_response TEXT
);

-- Enable RLS
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Policies for campaigns
CREATE POLICY "Admins can manage campaigns" 
ON public.sms_campaigns 
FOR ALL 
USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can manage campaign recipients" 
ON public.sms_campaign_recipients 
FOR ALL 
USING (is_admin_or_moderator(auth.uid()));

-- Insert default categories
INSERT INTO public.product_categories (name, slug, sort_order) VALUES
  ('3D Printed Items', '3d-printed', 1),
  ('Accessories', 'accessories', 2),
  ('Custom Orders', 'custom', 3),
  ('Electronics', 'electronics', 4),
  ('Other', 'other', 5);