
-- 1. Account status enum
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status public.account_status NOT NULL DEFAULT 'pending';

-- 3. Backfill: existing users -> approved (so live system keeps working)
UPDATE public.profiles SET account_status = 'approved' WHERE account_status = 'pending';

-- 4. Replace handle_new_user: block admin role from public signup, set pending status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  selected_role public.app_role;
  is_admin_provisioned boolean;
  initial_status public.account_status;
BEGIN
  -- flag set by admin-create-user edge function via raw_user_meta_data
  is_admin_provisioned := COALESCE((NEW.raw_user_meta_data->>'admin_provisioned')::boolean, false);

  selected_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'me'::public.app_role);

  -- HARD GUARD: only admin-provisioned signups may obtain admin role
  IF selected_role = 'admin'::public.app_role AND NOT is_admin_provisioned THEN
    selected_role := 'me'::public.app_role;
  END IF;

  -- Admin-provisioned accounts are pre-approved; everyone else is pending
  IF is_admin_provisioned OR selected_role = 'admin'::public.app_role THEN
    initial_status := 'approved';
  ELSE
    initial_status := 'pending';
  END IF;

  INSERT INTO public.profiles (id, display_name, email, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email,
    initial_status
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, selected_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 5. Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Make sure all existing admins are approved
UPDATE public.profiles p
SET account_status = 'approved'
WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin');

-- 7. RLS: admins can update profiles (for approval workflow)
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Helper: check approval status (security definer to bypass RLS in checks)
CREATE OR REPLACE FUNCTION public.get_account_status(_user_id uuid)
RETURNS public.account_status
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT account_status FROM public.profiles WHERE id = _user_id;
$$;
