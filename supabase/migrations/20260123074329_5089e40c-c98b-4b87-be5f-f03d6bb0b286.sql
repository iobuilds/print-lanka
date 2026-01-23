-- Create bank_details table to store admin-managed payment account information
CREATE TABLE public.bank_details (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  branch text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

-- Anyone can view active bank details (for payment instructions)
CREATE POLICY "Anyone can view active bank details"
ON public.bank_details
FOR SELECT
USING (is_active = true);

-- Only admins can manage bank details
CREATE POLICY "Admins can manage bank details"
ON public.bank_details
FOR ALL
USING (is_admin_or_moderator(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_bank_details_updated_at
BEFORE UPDATE ON public.bank_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();