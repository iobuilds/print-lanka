-- Add DELETE policies for admins on orders and related tables

-- Allow admins to delete orders
CREATE POLICY "Admin/moderators can delete orders"
ON public.orders
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

-- Allow admins to delete order items  
CREATE POLICY "Admin/moderators can delete order items"
ON public.order_items
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

-- Allow admins to delete payment slips
CREATE POLICY "Admin/moderators can delete payment slips"
ON public.payment_slips
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

-- Allow admins to delete profiles (for user management)
CREATE POLICY "Admin/moderators can delete profiles"
ON public.profiles
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

-- Allow admins to delete user roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));