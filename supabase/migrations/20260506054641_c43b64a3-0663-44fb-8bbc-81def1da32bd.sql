
CREATE TYPE public.sales_report_status AS ENUM ('pending_review','under_developer_review','approved','rejected');

CREATE TABLE public.sales_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  me_profile_id uuid NOT NULL,
  developer_id uuid,
  item_name text NOT NULL,
  month date NOT NULL,
  quantity_sold integer NOT NULL CHECK (quantity_sold >= 0),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  note text,
  status public.sales_report_status NOT NULL DEFAULT 'pending_review',
  decided_by uuid,
  decided_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_reports_me ON public.sales_reports(me_profile_id);
CREATE INDEX idx_sales_reports_dev ON public.sales_reports(developer_id);
CREATE INDEX idx_sales_reports_month ON public.sales_reports(month);

ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "sr_select_admin" ON public.sales_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sr_select_developer" ON public.sales_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'developer') AND EXISTS (
    SELECT 1 FROM public.me_profiles mp WHERE mp.id = sales_reports.me_profile_id AND mp.developer_id = auth.uid()
  ));
CREATE POLICY "sr_select_me_own" ON public.sales_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.me_profiles mp WHERE mp.id = sales_reports.me_profile_id AND mp.user_id = auth.uid()));

-- INSERT: ME for own profile, admin for any
CREATE POLICY "sr_insert_me" ON public.sales_reports FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'me')
    AND EXISTS (SELECT 1 FROM public.me_profiles mp WHERE mp.id = me_profile_id AND mp.user_id = auth.uid())
    AND status = 'pending_review'
  );
CREATE POLICY "sr_insert_admin" ON public.sales_reports FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- UPDATE: developer (assigned) and admin
CREATE POLICY "sr_update_admin" ON public.sales_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sr_update_developer" ON public.sales_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'developer') AND EXISTS (
    SELECT 1 FROM public.me_profiles mp WHERE mp.id = sales_reports.me_profile_id AND mp.developer_id = auth.uid()
  ))
  WITH CHECK (public.has_role(auth.uid(),'developer') AND EXISTS (
    SELECT 1 FROM public.me_profiles mp WHERE mp.id = sales_reports.me_profile_id AND mp.developer_id = auth.uid()
  ));

-- DELETE: admin only
CREATE POLICY "sr_delete_admin" ON public.sales_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Auto-fill developer_id from me_profile and stamp decisions
CREATE OR REPLACE FUNCTION public.handle_sales_report_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT developer_id INTO NEW.developer_id FROM public.me_profiles WHERE id = NEW.me_profile_id;
    IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status <> OLD.status AND NEW.status IN ('approved','rejected') THEN
      NEW.decided_by := auth.uid();
      NEW.decided_at := now();
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sales_reports_change
BEFORE INSERT OR UPDATE ON public.sales_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_sales_report_change();
