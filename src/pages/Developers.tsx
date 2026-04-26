import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface DevRow {
  id: string; name: string; email: string | null;
  total: number; completed: number; pending: number;
}

export default function Developers() {
  const [rows, setRows] = useState<DevRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: roleRows } = await supabase.from("user_roles").select("user_id").eq("role", "developer");
    const ids = (roleRows ?? []).map((r) => r.user_id);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }
    const { data: profs } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
    const { data: meps } = await supabase.from("me_profiles").select("id, developer_id").in("developer_id", ids);
    const meIds = (meps ?? []).map((m) => m.id);
    const { data: tasks } = meIds.length
      ? await supabase.from("me_tasks").select("status, me_profile_id").in("me_profile_id", meIds)
      : { data: [] as any[] };
    const result: DevRow[] = (profs ?? []).map((p) => {
      const myMEs = (meps ?? []).filter((m) => m.developer_id === p.id);
      const myTasks = (tasks ?? []).filter((t) => myMEs.find((m) => m.id === t.me_profile_id));
      return {
        id: p.id, name: p.display_name || p.email || "Unknown", email: p.email,
        total: myMEs.length,
        completed: myTasks.filter((t) => t.status === "completed").length,
        pending: myTasks.filter((t) => t.status !== "completed").length,
      };
    });
    setRows(result);
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Developers</h1>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Developer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Assigned MEs</TableHead>
                  <TableHead className="text-right">Tasks Completed</TableHead>
                  <TableHead className="text-right">Tasks Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No developers yet. Sign up users with the Developer role.</TableCell></TableRow>}
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.email}</TableCell>
                    <TableCell className="text-right">{r.total}</TableCell>
                    <TableCell className="text-right text-success">{r.completed}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{r.pending}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
