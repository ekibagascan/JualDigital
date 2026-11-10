-- Allow account deletion while keeping order and payout rows.
-- Personal fields are cleared. Seller products are unpublished.

ALTER TABLE public.order_items ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_seller_id_fkey;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.products ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_seller_id_fkey;
ALTER TABLE public.products
  ADD CONSTRAINT products_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.withdrawals ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_seller_id_fkey;
ALTER TABLE public.withdrawals
  ADD CONSTRAINT withdrawals_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_seller_id_fkey;
ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.service_orders ALTER COLUMN seller_id DROP NOT NULL;
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_seller_id_fkey;
ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_buyer_id_fkey;
ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.service_deliverables DROP CONSTRAINT IF EXISTS service_deliverables_created_by_fkey;
ALTER TABLE public.service_deliverables
  ADD CONSTRAINT service_deliverables_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- This trigger reads NEW.status, but order_items has no status column,
-- so any update on that table fails. It cannot have been applying updates.
DROP TRIGGER IF EXISTS trigger_update_product_stats ON public.order_items;

CREATE OR REPLACE FUNCTION public.prepare_account_deletion(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  IF target IS NULL THEN
    RAISE EXCEPTION 'missing user';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM target THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'admin accounts cannot be deleted here';
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = target;

  DELETE FROM public.analytics WHERE user_id = target;
  DELETE FROM public.notifications WHERE user_id = target;
  DELETE FROM public.wishlist WHERE user_id = target;
  DELETE FROM public.reviews WHERE user_id = target;
  DELETE FROM public.downloads WHERE user_id = target;
  DELETE FROM public.carts WHERE user_id = target;
  UPDATE public.cart_items SET seller_id = NULL WHERE seller_id = target;

  UPDATE public.orders
  SET user_id = NULL,
      guest_name = NULL,
      guest_email = NULL,
      notes = NULL,
      note = NULL,
      payment_proof_note = NULL
  WHERE user_id = target;

  UPDATE public.products
  SET status = 'inactive',
      seller_id = NULL
  WHERE seller_id = target;

  UPDATE public.order_items SET seller_id = NULL WHERE seller_id = target;
  UPDATE public.withdrawals SET seller_id = NULL WHERE seller_id = target;

  DELETE FROM public.membership_posts WHERE author_id = target;
  DELETE FROM public.service_messages WHERE sender_id = target;
  UPDATE public.service_deliverables SET created_by = NULL WHERE created_by = target;
  UPDATE public.service_orders SET buyer_id = NULL WHERE buyer_id = target;
  UPDATE public.service_orders SET seller_id = NULL WHERE seller_id = target;

  IF user_email IS NOT NULL THEN
    DELETE FROM public.email_subscribers WHERE email = user_email;
  END IF;

  DELETE FROM public.profiles WHERE id = target;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid) TO service_role;
