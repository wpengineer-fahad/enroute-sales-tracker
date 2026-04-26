import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, Building2 } from "lucide-react";
import { SUB_SECTORS } from "@/lib/constants";

interface Profile {
  id: string;
  owner_name: string;
  enterprise_name: string;
  business_category: string | null;
  sub_sector: string | null;
  contact_number: string | null;
  email: string | null;
  location: string | null;
  owner_image_url: string | null;
  developer_id: string | null;
}

const PAGE_SIZE = 20;

export default function Profiles() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subSectorFilter, setSubSectorFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    // ME redirected to own
    if (role === "me") {
      navigate("/me", { replace: true });
      return;
    }
    load();
    // eslint-disable-next-line
  }, [role, search, subSectorFilter, page]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("me_profiles").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (search) q = q.or(`owner_name.ilike.%${search}%,enterprise_name.ilike.%${search}%,email.ilike.%${search}%`);
    if (subSectorFilter !== "all") q = q.eq("sub_sector", subSectorFilter as any);
    q = q.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data } = await q;
    setProfiles(data ?? []);
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">{role === "developer" ? "My Assigned MEs" : "ME Profiles"}</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} profile{profiles.length !== 1 ? "s" : ""} loaded</p>
        </div>
        {role === "admin" && (
          <Button onClick={() => navigate("/profiles/new")}>
            <Plus className="h-4 w-4 mr-2" /> New Profile
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by owner, enterprise, email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
            </div>
            <Select value={subSectorFilter} onValueChange={(v) => { setSubSectorFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sub-sectors</SelectItem>
                {SUB_SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : profiles.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No profiles found.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/profiles/${p.id}`)}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                    {p.owner_image_url ? (
                      <img src={p.owner_image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-semibold text-muted-foreground">{p.owner_name?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{p.enterprise_name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{p.owner_name}</p>
                    {p.sub_sector && <Badge variant="secondary" className="mt-2 text-xs">{p.sub_sector}</Badge>}
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {p.contact_number && <p>📞 {p.contact_number}</p>}
                  {p.location && <p>📍 {p.location}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-2">
        <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
        <Button variant="outline" disabled={profiles.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
