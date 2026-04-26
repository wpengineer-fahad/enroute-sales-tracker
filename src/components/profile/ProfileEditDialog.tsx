import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUB_SECTORS } from "@/lib/constants";
import { toast } from "sonner";
import { uploadFile } from "@/lib/uploadFile";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: any;
  onSaved: () => void;
}

export function ProfileEditDialog({ open, onOpenChange, profile, onSaved }: Props) {
  const { role } = useAuth();
  const [form, setForm] = useState<any>({});
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [developers, setDevelopers] = useState<{ id: string; display_name: string | null; email: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm({ ...profile });
  }, [profile]);

  useEffect(() => {
    supabase.from("business_categories").select("name").order("name").then(({ data }) => setCategories(data ?? []));
    if (role === "admin") {
      supabase.from("user_roles").select("user_id").eq("role", "developer").then(async ({ data }) => {
        if (!data?.length) return;
        const ids = data.map((d) => d.user_id);
        const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
        setDevelopers(profs ?? []);
      });
    }
  }, [role]);

  const handleFile = async (field: "owner_image_url" | "shop_image_url" | "trade_license_url", bucket: string, file: File) => {
    try {
      const url = await uploadFile(bucket, file, profile?.id || "new");
      setForm((f: any) => ({ ...f, [field]: url }));
      toast.success("Uploaded");
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); }
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      owner_name: form.owner_name,
      enterprise_name: form.enterprise_name,
      business_category: form.business_category,
      sub_sector: form.sub_sector,
      contact_number: form.contact_number,
      email: form.email,
      location: form.location,
      registration_date: form.registration_date || null,
      owner_image_url: form.owner_image_url,
      shop_image_url: form.shop_image_url,
      trade_license_text: form.trade_license_text,
      website_url: form.website_url || null,
      facebook_url: form.facebook_url || null,
      youtube_url: form.youtube_url || null,
      instagram_url: form.instagram_url || null,
      ...(role === "admin" ? { developer_id: form.developer_id || null } : {}),
    };
    const { error } = await supabase.from("me_profiles").update(payload).eq("id", profile.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner Name"><Input value={form.owner_name ?? ""} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></Field>
          <Field label="Enterprise Name"><Input value={form.enterprise_name ?? ""} onChange={(e) => setForm({ ...form, enterprise_name: e.target.value })} /></Field>
          <Field label="Business Category">
            <Select value={form.business_category ?? ""} onValueChange={(v) => setForm({ ...form, business_category: v })}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Sub-Sector">
            <Select value={form.sub_sector ?? ""} onValueChange={(v) => setForm({ ...form, sub_sector: v })}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{SUB_SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Contact Number"><Input value={form.contact_number ?? ""} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Location"><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label="Registration Date"><Input type="date" value={form.registration_date ?? ""} onChange={(e) => setForm({ ...form, registration_date: e.target.value })} /></Field>

          {role === "admin" && (
            <Field label="Assigned Developer">
              <Select value={form.developer_id ?? ""} onValueChange={(v) => setForm({ ...form, developer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {developers.map((d) => <SelectItem key={d.id} value={d.id}>{d.display_name || d.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Owner Image">
            <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile("owner_image_url", "owner-images", f); }} />
            {form.owner_image_url && <img src={form.owner_image_url} className="mt-2 h-16 w-16 rounded object-cover" alt="" />}
          </Field>
          <Field label="Shop Image">
            <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile("shop_image_url", "shop-images", f); }} />
            {form.shop_image_url && <img src={form.shop_image_url} className="mt-2 h-16 w-24 rounded object-cover" alt="" />}
          </Field>
          <Field label="Trade License">
            <Input
              placeholder="Enter Trade License Number or Details"
              value={form.trade_license_text ?? ""}
              onChange={(e) => setForm({ ...form, trade_license_text: e.target.value })}
            />
          </Field>

          <div className="sm:col-span-2 pt-2">
            <Label className="text-sm font-semibold text-muted-foreground">Social Links (optional)</Label>
          </div>
          <Field label="Website URL">
            <Input type="url" placeholder="https://example.com" value={form.website_url ?? ""} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
          </Field>
          <Field label="Facebook URL">
            <Input type="url" placeholder="https://facebook.com/..." value={form.facebook_url ?? ""} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} />
          </Field>
          <Field label="YouTube URL">
            <Input type="url" placeholder="https://youtube.com/..." value={form.youtube_url ?? ""} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} />
          </Field>
          <Field label="Instagram URL">
            <Input type="url" placeholder="https://instagram.com/..." value={form.instagram_url ?? ""} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
