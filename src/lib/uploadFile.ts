import { supabase } from "@/integrations/supabase/client";

export async function uploadFile(bucket: string, file: File, prefix = ""): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${prefix}${prefix ? "/" : ""}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  // create a long-lived signed URL (10 years) since buckets are private
  const { data, error: urlErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (urlErr) throw urlErr;
  return data.signedUrl;
}
