-- Shop Products table
CREATE TABLE public.shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  main_image TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Product additional images (up to 4)
CREATE TABLE public.shop_product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shopping cart
CREATE TABLE public.shop_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Shop order status enum
CREATE TYPE public.shop_order_status AS ENUM (
  'pending_payment',
  'payment_submitted',
  'payment_approved',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

-- Shop orders
CREATE TABLE public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status shop_order_status DEFAULT 'pending_payment',
  subtotal NUMERIC NOT NULL,
  shipping_cost NUMERIC DEFAULT 0,
  total_price NUMERIC NOT NULL,
  shipping_address TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  tracking_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Shop order items
CREATE TABLE public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.shop_products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_at_purchase NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shop payment slips
CREATE TABLE public.shop_payment_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_payment_slips ENABLE ROW LEVEL SECURITY;

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can view active products" ON public.shop_products
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage products" ON public.shop_products
FOR ALL USING (is_admin_or_moderator(auth.uid()));

-- Product images policies
CREATE POLICY "Anyone can view product images" ON public.shop_product_images
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.shop_products WHERE id = product_id AND is_active = true
));

CREATE POLICY "Admins can manage product images" ON public.shop_product_images
FOR ALL USING (is_admin_or_moderator(auth.uid()));

-- Cart policies
CREATE POLICY "Users can manage their cart" ON public.shop_cart_items
FOR ALL USING (auth.uid() = user_id);

-- Shop orders policies
CREATE POLICY "Users can view their orders" ON public.shop_orders
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their orders" ON public.shop_orders
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending orders" ON public.shop_orders
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending_payment');

CREATE POLICY "Admins can view all shop orders" ON public.shop_orders
FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update shop orders" ON public.shop_orders
FOR UPDATE USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete shop orders" ON public.shop_orders
FOR DELETE USING (is_admin_or_moderator(auth.uid()));

-- Order items policies
CREATE POLICY "Users can view their order items" ON public.shop_order_items
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.shop_orders WHERE id = order_id AND user_id = auth.uid()
));

CREATE POLICY "Users can create order items" ON public.shop_order_items
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.shop_orders WHERE id = order_id AND user_id = auth.uid()
));

CREATE POLICY "Admins can view all order items" ON public.shop_order_items
FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete order items" ON public.shop_order_items
FOR DELETE USING (is_admin_or_moderator(auth.uid()));

-- Payment slips policies
CREATE POLICY "Users can view their payment slips" ON public.shop_payment_slips
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload payment slips" ON public.shop_payment_slips
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payment slips" ON public.shop_payment_slips
FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update payment slips" ON public.shop_payment_slips
FOR UPDATE USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete payment slips" ON public.shop_payment_slips
FOR DELETE USING (is_admin_or_moderator(auth.uid()));

-- Create storage bucket for shop products
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-products', 'shop-products', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for shop products
CREATE POLICY "Anyone can view shop product images" ON storage.objects
FOR SELECT USING (bucket_id = 'shop-products');

CREATE POLICY "Admins can upload shop product images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'shop-products' AND is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update shop product images" ON storage.objects
FOR UPDATE USING (bucket_id = 'shop-products' AND is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete shop product images" ON storage.objects
FOR DELETE USING (bucket_id = 'shop-products' AND is_admin_or_moderator(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_shop_products_updated_at
BEFORE UPDATE ON public.shop_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_orders_updated_at
BEFORE UPDATE ON public.shop_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for shop orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_orders;