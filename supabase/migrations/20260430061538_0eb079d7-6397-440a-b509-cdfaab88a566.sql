
-- 1. Extend master_products
ALTER TABLE public.master_products
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS price numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.master_products
  DROP CONSTRAINT IF EXISTS master_products_stock_nonneg;
ALTER TABLE public.master_products
  ADD CONSTRAINT master_products_stock_nonneg CHECK (stock >= 0);

ALTER TABLE public.master_products
  DROP CONSTRAINT IF EXISTS master_products_price_nonneg;
ALTER TABLE public.master_products
  ADD CONSTRAINT master_products_price_nonneg CHECK (price >= 0);

-- 2. Order status enum
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  me_profile_id uuid NOT NULL,
  developer_id uuid,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  master_product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_orders_me_profile ON public.orders(me_profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_developer ON public.orders(developer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS policies for orders
DROP POLICY IF EXISTS orders_select_admin ON public.orders;
CREATE POLICY orders_select_admin ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS orders_select_developer ON public.orders;
CREATE POLICY orders_select_developer ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'developer') AND developer_id = auth.uid());

DROP POLICY IF EXISTS orders_select_me_own ON public.orders;
CREATE POLICY orders_select_me_own ON public.orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.me_profiles mp WHERE mp.id = me_profile_id AND mp.user_id = auth.uid()));

DROP POLICY IF EXISTS orders_insert_me ON public.orders;
CREATE POLICY orders_insert_me ON public.orders FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'me')
    AND EXISTS (SELECT 1 FROM public.me_profiles mp WHERE mp.id = me_profile_id AND mp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS orders_update_admin ON public.orders;
CREATE POLICY orders_update_admin ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS orders_update_developer ON public.orders;
CREATE POLICY orders_update_developer ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'developer') AND developer_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'developer') AND developer_id = auth.uid());

DROP POLICY IF EXISTS orders_delete_admin ON public.orders;
CREATE POLICY orders_delete_admin ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 5. RLS for order_items (mirror parent order access)
DROP POLICY IF EXISTS order_items_select ON public.order_items;
CREATE POLICY order_items_select ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
      public.has_role(auth.uid(),'admin')
      OR (public.has_role(auth.uid(),'developer') AND o.developer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.me_profiles mp WHERE mp.id = o.me_profile_id AND mp.user_id = auth.uid())
    )
  ));

DROP POLICY IF EXISTS order_items_insert_me ON public.order_items;
CREATE POLICY order_items_insert_me ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.me_profiles mp ON mp.id = o.me_profile_id
    WHERE o.id = order_id
      AND mp.user_id = auth.uid()
      AND public.has_role(auth.uid(),'me')
      AND o.status = 'pending'
  ));

DROP POLICY IF EXISTS order_items_delete_admin ON public.order_items;
CREATE POLICY order_items_delete_admin ON public.order_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- 6. Lock status transitions + stock deduction on approval
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
  current_stock integer;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Order status is locked once it is no longer pending';
  END IF;

  IF NEW.status = 'approved' THEN
    FOR item IN SELECT master_product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
      SELECT stock INTO current_stock FROM public.master_products WHERE id = item.master_product_id FOR UPDATE;
      IF current_stock IS NULL OR current_stock < item.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for one or more items';
      END IF;
      UPDATE public.master_products
        SET stock = stock - item.quantity
        WHERE id = item.master_product_id;
    END LOOP;
    NEW.decided_by := auth.uid();
    NEW.decided_at := now();
  ELSIF NEW.status = 'rejected' THEN
    NEW.decided_by := auth.uid();
    NEW.decided_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_status ON public.orders;
CREATE TRIGGER trg_orders_status
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_change();

-- 7. Storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "product_images_read_auth" ON storage.objects;
CREATE POLICY "product_images_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_write" ON storage.objects;
CREATE POLICY "product_images_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
CREATE POLICY "product_images_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
