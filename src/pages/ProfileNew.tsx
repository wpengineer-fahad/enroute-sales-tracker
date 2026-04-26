import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUB_SECTORS } from "@/lib/constants";
import { toast } from "sonner";
import { uploadFile } from "@/lib/uploadFile";
import { Loader2 } from "lucide-react";

export default function ProfileNew() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<any>({ owner_name: "", enterprise_name: "" });
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [developers, setDevelopers] = useState<{ id: string; display_name: string | null; email: string | null }[]>([]);
  const [saving, setSaving] = useState(false);

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

  const handleFile = async (field: string, bucket: string, file: File) => {
    try {
      const url = await uploadFile(bucket, file, "new");
      setForm((f: any) => ({ ...f, [field]: url }));
      toast.success("Uploaded");
    } catch (e: any) { toast.error(e.message); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.owner_name || !form.enterprise_name) { toast.error("Owner Name and Enterprise Name are required"); return; }
    setSaving(true);
    const payload: any = {
      ...form,
      registration_date: form.registration_date || null,
    };
    if (role === "me") payload.user_id = user!.id;
    const { data, error } = await supabase.from("me_profiles").insert(payload).select("id").maybeSingle();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile created");
    navigate(`/profiles/${data!.id}`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader><CardTitle>{role === "me" ? "Create your profile" : "New ME Profile"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner Name *"><Input required value={form.owner_name ?? ""} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></Field>
            <Field label="Enterprise Name *"><Input required value={form.enterprise_name ?? ""} onChange={(e) => setForm({ ...form, enterprise_name: e.target.value })} /></Field>
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
              <Field label="Assign Developer">
                <Select value={form.developer_id ?? ""} onValueChange={(v) => setForm({ ...form, developer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>{developers.map((d) => <SelectItem key={d.id} value={d.id}>{d.display_name || d.email}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            )}

            <Field label="Owner Image">
              <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile("owner_image_url", "owner-images", f); }} />
            </Field>
            <Field label="Shop Image">
              <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile("shop_image_url", "shop-images", f); }} />
            </Field>
            <Field label="Trade License">
              <Input
                placeholder="Enter Trade License Number or Details"
                value={form.trade_license_text ?? ""}
                onChange={(e) => setForm({ ...form, trade_license_text: e.target.value })}
              />
            </Field>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
