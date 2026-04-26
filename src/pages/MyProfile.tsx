import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MyProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("me_profiles").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) navigate(`/profiles/${data.id}`, { replace: true });
      else setLoading(false);
    });
  }, [user, navigate]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardContent className="py-12 text-center">
          <h2 className="text-lg font-semibold">No profile yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create your enterprise profile to get started.</p>
          <Button onClick={() => navigate("/profiles/new")}><Plus className="h-4 w-4 mr-2" /> Create Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
