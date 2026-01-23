-- Allow public read access to pricing and delivery config settings
CREATE POLICY "Anyone can view public pricing settings"
ON public.system_settings
FOR SELECT
USING (key IN ('pricing_config', 'delivery_config'));