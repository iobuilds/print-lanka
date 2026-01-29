-- Allow admins/moderators to read shop shipping config
CREATE POLICY "Admins can view shop settings" 
ON public.system_settings 
FOR SELECT 
USING (key = 'shop_shipping_config' AND is_admin_or_moderator(auth.uid()));

-- Allow anyone to read shop shipping config (for checkout page)
CREATE POLICY "Anyone can view shop shipping config" 
ON public.system_settings 
FOR SELECT 
USING (key = 'shop_shipping_config');