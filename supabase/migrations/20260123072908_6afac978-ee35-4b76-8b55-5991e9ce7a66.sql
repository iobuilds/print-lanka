-- Lock down user coupon updates so users cannot reset coupons and reuse them

-- 1) Replace the overly-permissive user UPDATE policy
DROP POLICY IF EXISTS "Users can update their own coupons" ON public.user_coupons;

CREATE POLICY "Users can mark coupon as used once"
ON public.user_coupons
FOR UPDATE
USING (auth.uid() = user_id AND is_used = false)
WITH CHECK (auth.uid() = user_id AND is_used = true);

-- 2) Add a validation trigger to prevent tampering with immutable fields
CREATE OR REPLACE FUNCTION public.validate_user_coupon_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uses_per_user integer;
BEGIN
  -- Disallow changing immutable fields
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed';
  END IF;
  IF NEW.coupon_id IS DISTINCT FROM OLD.coupon_id THEN
    RAISE EXCEPTION 'coupon_id cannot be changed';
  END IF;
  IF NEW.assigned_at IS DISTINCT FROM OLD.assigned_at THEN
    RAISE EXCEPTION 'assigned_at cannot be changed';
  END IF;
  IF NEW.assigned_by IS DISTINCT FROM OLD.assigned_by THEN
    RAISE EXCEPTION 'assigned_by cannot be changed';
  END IF;

  -- Once used, cannot be edited anymore
  IF OLD.is_used = true THEN
    RAISE EXCEPTION 'Used coupons cannot be modified';
  END IF;

  -- If marking as used, enforce use limits
  SELECT COALESCE(uses_per_user, 1)
    INTO v_uses_per_user
  FROM public.coupons
  WHERE id = OLD.coupon_id;

  IF NEW.use_count IS NULL THEN
    NEW.use_count := 0;
  END IF;

  -- Enforce that use_count is at least 1 when marking used
  IF NEW.is_used = true THEN
    IF NEW.use_count < 1 THEN
      NEW.use_count := 1;
    END IF;

    IF NEW.use_count > v_uses_per_user THEN
      RAISE EXCEPTION 'Coupon usage limit exceeded';
    END IF;

    IF NEW.used_at IS NULL THEN
      NEW.used_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_user_coupon_update ON public.user_coupons;
CREATE TRIGGER trg_validate_user_coupon_update
BEFORE UPDATE ON public.user_coupons
FOR EACH ROW
EXECUTE FUNCTION public.validate_user_coupon_update();
