-- Add user_id column to gallery_posts for order owner tracking
ALTER TABLE public.gallery_posts 
ADD COLUMN user_id UUID;

-- Update reviews policy to only allow order owner to review
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;

CREATE POLICY "Order owners can create reviews"
ON public.reviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gallery_posts 
    WHERE gallery_posts.id = reviews.gallery_post_id 
    AND gallery_posts.user_id = auth.uid()
  )
);