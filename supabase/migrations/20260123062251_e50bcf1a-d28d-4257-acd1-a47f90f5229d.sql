-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Enable realtime for payment_slips table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_slips;