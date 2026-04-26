-- Add social link columns to me_profiles
ALTER TABLE public.me_profiles
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text;

-- Restrict ME from modifying tasks/products: tighten can_modify_me_profile to admin+developer only
CREATE OR REPLACE FUNCTION public.can_modify_me_profile(_me_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.me_profiles mp WHERE mp.id = _me_profile_id AND (
      public.has_role(auth.uid(),'admin')
      OR (public.has_role(auth.uid(),'developer') AND mp.developer_id = auth.uid())
    )
  );
$function$;

-- Remove ME's ability to update their own profile after creation
DROP POLICY IF EXISTS mep_update_me_own ON public.me_profiles;