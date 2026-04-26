import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SUB_SECTORS } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export default function SubSectors() {
  const [rows, setRows] = useState<{ name: string; total: number; high: number; mid: number; low: number; }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: tasks }] = await Promise.all([
      supabase.from("me_profiles").select("id, sub_sector"),
      supabase.from("me_tasks").select("status, me_profile_id"),
    ]);
    const taskMap = new Map<string, { total: number; completed: number }>();
    tasks?.forEach((t) => {
      const cur = taskMap.get(t.me_profile_id) ?? { total: 0, completed: 0 };
      cur.total++;
      if (t.status === "completed") cur.completed++;
      taskMap.set(t.me_profile_id, cur);
    });
    const result = SUB_SECTORS.map((s) => {
      const list = (profiles ?? []).filter((p) => p.sub_sector === s);
      let high = 0, mid = 0, low = 0;
      list.forEach((p) => {
        const tp = taskMap.get(p.id);
        const pct = tp && tp.total ? (tp.completed / tp.total) * 100 : 0;
        if (pct >= 75) high++; else if (pct >= 50) mid++; else low++;
      });
      return { name: s, total: list.length, high, mid, low };
    });
    setRows(result);
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Sub-Sector Performance</h1>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sub Sector</TableHead>
                  <TableHead className="text-right">Total MEs</TableHead>
                  <TableHead className="text-right">75%+ Completed</TableHead>
                  <TableHead className="text-right">50–74% Completed</TableHead>
                  <TableHead className="text-right">&lt;50% Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.total}</TableCell>
                    <TableCell className="text-right text-success">{r.high}</TableCell>
                    <TableCell className="text-right text-warning">{r.mid}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{r.low}</TableCell>
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
