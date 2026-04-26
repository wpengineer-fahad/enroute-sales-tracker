-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'developer', 'me');
CREATE TYPE public.task_status AS ENUM ('pending', 'processing', 'completed');
CREATE TYPE public.sub_sector AS ENUM (
  'Automobile Workshop','Dairy products','Dry fish processing and trade',
  'Eco-friendly tourism','Full grain rice','High-value crops',
  'High-value handicrafts rural area','Leather products','Loom',
  'Machinery & Equipment','Metal products','Mini garments','Poultry'
);

-- ============ TIMESTAMP TRIGGER FUNC ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY
    CASE role WHEN 'admin' THEN 1 WHEN 'developer' THEN 2 WHEN 'me' THEN 3 END LIMIT 1;
$$;

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ HANDLE NEW USER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  selected_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.email);

  selected_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'me'::public.app_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, selected_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ BUSINESS CATEGORIES ============
CREATE TABLE public.business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_select_all_auth" ON public.business_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "bc_admin_all" ON public.business_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.business_categories (name) VALUES
  ('Manufacturing'),('Retail'),('Services'),('Agriculture'),('Handicrafts'),
  ('Food & Beverage'),('Textile'),('Technology'),('Tourism'),('Other');

-- ============ MASTER TASKS ============
CREATE TABLE public.master_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.master_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_select_all_auth" ON public.master_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "mt_admin_all" ON public.master_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.master_tasks (name, display_order) VALUES
  ('Banner/Festoon',1),('Billboard',2),('Cutout Board',3),('Digital Media Posts',4),
  ('Environmental NOC',5),('Facebook Page Development',6),('Leaflet / Brochure / Product Catalog',7),
  ('Media Buying',8),('OVC & Documentary',9),('POSM Items',10),('Packaging',11),
  ('Post Design (5 times)',12),('Press Releases',13),('Price Tag',14),('Print Media Ads',15),
  ('Product License',16),('Product Testing Support',17),('Retail Branding',18),('Shop Sign',19),
  ('Trade License',20),('Visiting Card',21),('Voiceover Recording',22),('YouTube Channel',23),
  ('FB/YouTube Boosting',24);

-- ============ MASTER PRODUCTS ============
CREATE TABLE public.master_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mp_select_all_auth" ON public.master_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "mp_admin_all" ON public.master_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.master_products (name, display_order) VALUES
  ('Banner/Festoon',1),('Billboard',2),('Cutout Board',3),('Digital Media Posts',4),
  ('Environmental NOC',5),('Facebook Page Development',6),('Leaflet / Brochure / Product Catalog',7),
  ('Media Buying',8),('OVC & Documentary',9),('POSM Items',10),('Packaging',11),
  ('Post Design (5 times)',12),('Press Releases',13),('Price Tag',14),('Print Media Ads',15),
  ('Product License',16),('Product Testing Support',17),('Retail Branding',18),('Shop Sign',19),
  ('Trade License',20),('Visiting Card',21),('Voiceover Recording',22),('YouTube Channel',23),
  ('FB/YouTube Boosting',24);

-- ============ ME PROFILES ============
CREATE TABLE public.me_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  developer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name TEXT NOT NULL,
  enterprise_name TEXT NOT NULL,
  business_category TEXT,
  contact_number TEXT,
  email TEXT,
  location TEXT,
  registration_date DATE,
  sub_sector public.sub_sector,
  owner_image_url TEXT,
  shop_image_url TEXT,
  trade_license_url TEXT,
  trade_license_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_me_profiles_user ON public.me_profiles(user_id);
CREATE INDEX idx_me_profiles_developer ON public.me_profiles(developer_id);
CREATE INDEX idx_me_profiles_subsector ON public.me_profiles(sub_sector);
ALTER TABLE public.me_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mep_select_admin" ON public.me_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "mep_select_developer_assigned" ON public.me_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'developer') AND developer_id = auth.uid());
CREATE POLICY "mep_select_me_own" ON public.me_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "mep_insert_admin" ON public.me_profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "mep_insert_me_self" ON public.me_profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'me') AND user_id = auth.uid());

CREATE POLICY "mep_update_admin" ON public.me_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "mep_update_developer_assigned" ON public.me_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'developer') AND developer_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(),'developer') AND developer_id = auth.uid());
CREATE POLICY "mep_update_me_own" ON public.me_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "mep_delete_admin" ON public.me_profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_me_profiles_updated_at BEFORE UPDATE ON public.me_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ME TASKS ============
CREATE TABLE public.me_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  me_profile_id UUID NOT NULL REFERENCES public.me_profiles(id) ON DELETE CASCADE,
  master_task_id UUID NOT NULL REFERENCES public.master_tasks(id) ON DELETE CASCADE,
  status public.task_status NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(me_profile_id, master_task_id)
);
CREATE INDEX idx_me_tasks_profile ON public.me_tasks(me_profile_id);
CREATE INDEX idx_me_tasks_status ON public.me_tasks(status);
ALTER TABLE public.me_tasks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_me_profile(_me_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.me_profiles mp WHERE mp.id = _me_profile_id AND (
      public.has_role(auth.uid(),'admin')
      OR (public.has_role(auth.uid(),'developer') AND mp.developer_id = auth.uid())
      OR mp.user_id = auth.uid()
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_modify_me_profile(_me_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.me_profiles mp WHERE mp.id = _me_profile_id AND (
      public.has_role(auth.uid(),'admin')
      OR (public.has_role(auth.uid(),'developer') AND mp.developer_id = auth.uid())
      OR mp.user_id = auth.uid()
    )
  );
$$;

CREATE POLICY "met_select" ON public.me_tasks FOR SELECT TO authenticated USING (public.can_access_me_profile(me_profile_id));
CREATE POLICY "met_update" ON public.me_tasks FOR UPDATE TO authenticated USING (public.can_modify_me_profile(me_profile_id)) WITH CHECK (public.can_modify_me_profile(me_profile_id));
CREATE POLICY "met_insert_admin" ON public.me_tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "met_delete_admin" ON public.me_tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_me_tasks_updated_at BEFORE UPDATE ON public.me_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-attach all master tasks when ME profile is created
CREATE OR REPLACE FUNCTION public.attach_master_tasks_to_new_me()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.me_tasks (me_profile_id, master_task_id, status)
  SELECT NEW.id, mt.id, 'pending' FROM public.master_tasks mt
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER attach_tasks_on_me_profile_insert AFTER INSERT ON public.me_profiles FOR EACH ROW EXECUTE FUNCTION public.attach_master_tasks_to_new_me();

-- Backfill new master task to all existing ME profiles
CREATE OR REPLACE FUNCTION public.backfill_master_task()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.me_tasks (me_profile_id, master_task_id, status)
  SELECT mp.id, NEW.id, 'pending' FROM public.me_profiles mp
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER backfill_master_task_trigger AFTER INSERT ON public.master_tasks FOR EACH ROW EXECUTE FUNCTION public.backfill_master_task();

-- ============ ME PRODUCTS ============
CREATE TABLE public.me_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  me_profile_id UUID NOT NULL REFERENCES public.me_profiles(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  status public.task_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(me_profile_id, master_product_id)
);
CREATE INDEX idx_me_products_profile ON public.me_products(me_profile_id);
ALTER TABLE public.me_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mep2_select" ON public.me_products FOR SELECT TO authenticated USING (public.can_access_me_profile(me_profile_id));
CREATE POLICY "mep2_insert" ON public.me_products FOR INSERT TO authenticated WITH CHECK (public.can_modify_me_profile(me_profile_id) AND NOT public.has_role(auth.uid(),'me'));
CREATE POLICY "mep2_update" ON public.me_products FOR UPDATE TO authenticated USING (public.can_modify_me_profile(me_profile_id)) WITH CHECK (public.can_modify_me_profile(me_profile_id));
CREATE POLICY "mep2_delete_admin" ON public.me_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'developer') AND public.can_modify_me_profile(me_profile_id)));
CREATE TRIGGER update_me_products_updated_at BEFORE UPDATE ON public.me_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('owner-images','owner-images',true),
  ('shop-images','shop-images',true),
  ('trade-licenses','trade-licenses',true),
  ('task-proofs','task-proofs',true);

CREATE POLICY "owner_images_read" ON storage.objects FOR SELECT USING (bucket_id = 'owner-images');
CREATE POLICY "owner_images_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'owner-images');
CREATE POLICY "owner_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'owner-images');
CREATE POLICY "owner_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'owner-images');

CREATE POLICY "shop_images_read" ON storage.objects FOR SELECT USING (bucket_id = 'shop-images');
CREATE POLICY "shop_images_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shop-images');
CREATE POLICY "shop_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'shop-images');
CREATE POLICY "shop_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shop-images');

CREATE POLICY "trade_licenses_read" ON storage.objects FOR SELECT USING (bucket_id = 'trade-licenses');
CREATE POLICY "trade_licenses_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trade-licenses');
CREATE POLICY "trade_licenses_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'trade-licenses');
CREATE POLICY "trade_licenses_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'trade-licenses');

CREATE POLICY "task_proofs_read" ON storage.objects FOR SELECT USING (bucket_id = 'task-proofs');
CREATE POLICY "task_proofs_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-proofs');
CREATE POLICY "task_proofs_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'task-proofs');
CREATE POLICY "task_proofs_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'task-proofs');