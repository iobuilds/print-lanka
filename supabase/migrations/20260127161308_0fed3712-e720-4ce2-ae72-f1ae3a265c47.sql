-- Create storage bucket for pricing/marketing images
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for site assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- Allow admins to manage site assets
CREATE POLICY "Admins can manage site assets"
ON storage.objects FOR ALL
USING (bucket_id = 'site-assets' AND is_admin_or_moderator(auth.uid()))
WITH CHECK (bucket_id = 'site-assets' AND is_admin_or_moderator(auth.uid()));