import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ListChecks, CheckCircle2, Clock, Loader2, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SUB_SECTORS } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface Counts { total: number; pending: number; processing: number; completed: number; }
interface SubSectorRow { sub_sector: string; total: number; high: number; mid: number; low: number; }
interface DevRow { developer_id: string | null; developer_name: string; total: number; completed: number; pending: number; }

const COLORS = { pending: "hsl(var(--muted-foreground))", processing: "hsl(var(--warning))", completed: "hsl(var(--success))" };

export default function Dashboard() {
  const { role, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileCount, setProfileCount] = useState(0);
  const [taskCounts, setTaskCounts] = useState<Counts>({ total: 0, pending: 0, processing: 0, completed: 0 });
  const [subSectorRows, setSubSectorRows] = useState<SubSectorRow[]>([]);
  const [devRows, setDevRows] = useState<DevRow[]>([]);
  const [meProfileId, setMeProfileId] = useState<string | null>(null);
  const [meCompletion, setMeCompletion] = useState(0);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      // Fetch all profiles visible (RLS scopes them)
      const { data: profiles } = await supabase.from("me_profiles").select("id, sub_sector, developer_id, owner_name, enterprise_name, user_id");
      const { data: tasks } = await supabase.from("me_tasks").select("id, status, me_profile_id");

      setProfileCount(profiles?.length ?? 0);
      const c: Counts = { total: tasks?.length ?? 0, pending: 0, processing: 0, completed: 0 };
      tasks?.forEach((t) => { c[t.status as keyof Counts]++; });
      setTaskCounts(c);

      // ME-specific
      if (role === "me" && profiles && profiles.length) {
        const mp = profiles.find((p) => p.user_id === user?.id) ?? profiles[0];
        setMeProfileId(mp.id);
        const mt = tasks?.filter((t) => t.me_profile_id === mp.id) ?? [];
        const completed = mt.filter((t) => t.status === "completed").length;
        setMeCompletion(mt.length ? Math.round((completed / mt.length) * 100) : 0);
      }

      // Sub-sector aggregation (admin only)
      if (role === "admin" && profiles && tasks) {
        const tasksByProfile = new Map<string, { total: number; completed: number }>();
        tasks.forEach((t) => {
          const cur = tasksByProfile.get(t.me_profile_id) ?? { total: 0, completed: 0 };
          cur.total++;
          if (t.status === "completed") cur.completed++;
          tasksByProfile.set(t.me_profile_id, cur);
        });
        const rows: SubSectorRow[] = SUB_SECTORS.map((s) => {
          const list = profiles.filter((p) => p.sub_sector === s);
          let high = 0, mid = 0, low = 0;
          list.forEach((p) => {
            const tp = tasksByProfile.get(p.id);
            const pct = tp && tp.total ? (tp.completed / tp.total) * 100 : 0;
            if (pct >= 75) high++; else if (pct >= 50) mid++; else low++;
          });
          return { sub_sector: s, total: list.length, high, mid, low };
        });
        setSubSectorRows(rows);

        // Developer rows
        const devIds = Array.from(new Set(profiles.map((p) => p.developer_id).filter(Boolean))) as string[];
        let devNames: Record<string, string> = {};
        if (devIds.length) {
          const { data: devs } = await supabase.from("profiles").select("id, display_name, email").in("id", devIds);
          devs?.forEach((d) => { devNames[d.id] = d.display_name || d.email || "Unknown"; });
        }
        const devMap = new Map<string, DevRow>();
        profiles.forEach((p) => {
          const id = p.developer_id ?? "unassigned";
          const name = p.developer_id ? (devNames[p.developer_id] ?? "Developer") : "Unassigned";
          const cur = devMap.get(id) ?? { developer_id: p.developer_id, developer_name: name, total: 0, completed: 0, pending: 0 };
          cur.total++;
          const tp = tasks.filter((t) => t.me_profile_id === p.id);
          cur.completed += tp.filter((t) => t.status === "completed").length;
          cur.pending += tp.filter((t) => t.status !== "completed").length;
          devMap.set(id, cur);
        });
        setDevRows(Array.from(devMap.values()));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (role) load(); /* eslint-disable-next-line */ }, [role]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const pieData = [
    { name: "Completed", value: taskCounts.completed, key: "completed" },
    { name: "Processing", value: taskCounts.processing, key: "processing" },
    { name: "Pending", value: taskCounts.pending, key: "pending" },
  ];

  const subSectorBarData = subSectorRows.map((r) => ({
    name: r.sub_sector.length > 14 ? r.sub_sector.slice(0, 12) + "…" : r.sub_sector,
    "75%+": r.high, "50–74%": r.mid, "<50%": r.low,
  }));

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {role === "admin" ? "Admin Dashboard" : role === "developer" ? "Developer Dashboard" : "My Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {role === "admin" ? "Global overview of all MEs, tasks and developers" :
             role === "developer" ? "Your assigned MEs and their progress" :
             "Your enterprise profile and task progress"}
          </p>
        </div>
        <button onClick={load} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard icon={Users} label={role === "developer" ? "Assigned MEs" : role === "me" ? "My Profile" : "Total Profiles"} value={profileCount} accent="primary" />
        <SummaryCard icon={ListChecks} label="Total Tasks" value={taskCounts.total} accent="accent" />
        <SummaryCard icon={CheckCircle2} label="Completed" value={taskCounts.completed} accent="success" />
        <SummaryCard icon={Loader2} label="Processing" value={taskCounts.processing} accent="warning" />
        <SummaryCard icon={Clock} label="Pending" value={taskCounts.pending} accent="muted" />
      </div>

      {role === "me" && meProfileId && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Completion</CardTitle>
            <CardDescription>Progress of your 24 fixed tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{meCompletion}% complete</span>
              <button onClick={() => navigate("/me")} className="text-sm text-primary hover:underline">View profile →</button>
            </div>
            <Progress value={meCompletion} />
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>Across {role === "admin" ? "all" : "visible"} ME profiles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((d) => <Cell key={d.key} fill={COLORS[d.key as keyof typeof COLORS]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {role === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Completion by Sub-Sector</CardTitle>
              <CardDescription>Number of MEs in each completion tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subSectorBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="75%+" stackId="a" fill="hsl(var(--success))" />
                    <Bar dataKey="50–74%" stackId="a" fill="hsl(var(--warning))" />
                    <Bar dataKey="<50%" stackId="a" fill="hsl(var(--muted-foreground))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {role === "admin" && (
        <>
          <Card>
            <CardHeader><CardTitle>Sub-Sector Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sub Sector</TableHead>
                      <TableHead className="text-right">Total MEs</TableHead>
                      <TableHead className="text-right">75%+</TableHead>
                      <TableHead className="text-right">50–74%</TableHead>
                      <TableHead className="text-right">&lt;50%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subSectorRows.map((r) => (
                      <TableRow key={r.sub_sector}>
                        <TableCell className="font-medium">{r.sub_sector}</TableCell>
                        <TableCell className="text-right">{r.total}</TableCell>
                        <TableCell className="text-right text-success">{r.high}</TableCell>
                        <TableCell className="text-right text-warning">{r.mid}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{r.low}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Developer Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead className="text-right">Total MEs</TableHead>
                    <TableHead className="text-right">Tasks Completed</TableHead>
                    <TableHead className="text-right">Tasks Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devRows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No developers assigned yet</TableCell></TableRow>}
                  {devRows.map((d) => (
                    <TableRow key={d.developer_id ?? "unassigned"}>
                      <TableCell className="font-medium">{d.developer_name}</TableCell>
                      <TableCell className="text-right">{d.total}</TableCell>
                      <TableCell className="text-right text-success">{d.completed}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{d.pending}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
