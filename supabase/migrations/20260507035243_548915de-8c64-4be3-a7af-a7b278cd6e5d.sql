ALTER TABLE public.sales_reports
  ADD CONSTRAINT sales_reports_me_profile_id_fkey FOREIGN KEY (me_profile_id) REFERENCES public.me_profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT sales_reports_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT sales_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT sales_reports_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';