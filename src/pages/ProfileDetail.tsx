import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { TasksSection } from "@/components/profile/TasksSection";
import { ProductsSection } from "@/components/profile/ProductsSection";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from("me_profiles").select("*").eq("id", id).maybeSingle();
    if (error) toast.error(error.message);
    setProfile(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from("me_profiles").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Profile deleted"); navigate("/profiles"); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!profile) return <div className="text-center py-12 text-muted-foreground">Profile not found.</div>;

  const canEdit = role === "admin" || role === "developer" || role === "me";
  const canDelete = role === "admin";

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-2" /> Edit</Button>}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove the ME profile and all its tasks and products. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* 3-column profile card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-12 items-start">
            {/* LEFT: Owner avatar */}
            <div className="md:col-span-3 flex flex-col items-center text-center">
              <div className="h-32 w-32 rounded-full overflow-hidden bg-secondary border-4 border-card shadow-md">
                {profile.owner_image_url ? (
                  <img src={profile.owner_image_url} alt={profile.owner_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                    {profile.owner_name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="mt-3 font-semibold">{profile.owner_name}</h2>
              <p className="text-sm text-muted-foreground">Owner</p>
            </div>

            {/* MIDDLE: Profile info */}
            <div className="md:col-span-6 space-y-3">
              <h1 className="text-2xl font-bold">{profile.enterprise_name}</h1>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Field label="Business Category" value={profile.business_category} />
                <Field label="Sub-Sector" value={profile.sub_sector} />
                <Field label="Contact" value={profile.contact_number} />
                <Field label="Email" value={profile.email} />
                <Field label="Location" value={profile.location} />
                <Field label="Registration Date" value={profile.registration_date ? format(new Date(profile.registration_date), "PPP") : null} />
                {profile.trade_license_url && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Trade License</dt>
                    <dd className="mt-1"><a href={profile.trade_license_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">View document</a></dd>
                  </div>
                )}
              </dl>
            </div>

            {/* RIGHT: Shop image */}
            <div className="md:col-span-3">
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-secondary border">
                {profile.shop_image_url ? (
                  <img src={profile.shop_image_url} alt="Shop" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">No shop image</div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">Shop Image</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Tasks & Products */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-4">
          <TasksSection meProfileId={profile.id} />
        </TabsContent>
        <TabsContent value="products" className="mt-4">
          <ProductsSection meProfileId={profile.id} />
        </TabsContent>
      </Tabs>

      <ProfileEditDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} onSaved={() => { setEditOpen(false); load(); }} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value || <span className="text-muted-foreground italic">Not set</span>}</dd>
    </div>
  );
}
