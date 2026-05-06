import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Check, X, Flag, Send, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MONTHS, SALES_STATUS_COLOR, SALES_STATUS_LABEL, type SalesReportStatus,
} from "@/lib/constants";

interface Row {
  id: string;
  item_name: string;
  month: string;
  quantity_sold: number;
  total_amount: number;
  status: SalesReportStatus;
  me_profile_id: string;
  developer_id: string | null;
  me_profile: { enterprise_name: string; owner_name: string } | null;
  developer: { display_name: string | null; email: string | null } | null;
}

export default function SalesReports() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [meFilter, setMeFilter] = useState("");
  const [devFilter, setDevFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [itemFilter, setItemFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_reports")
      .select("id, item_name, month, quantity_sold, total_amount, status, me_profile_id, developer_id, me_profile:me_profiles(enterprise_name, owner_name)")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    const devIds = Array.from(new Set((data ?? []).map((r: any) => r.developer_id).filter(Boolean)));
    const devMap: Record<string, { display_name: string | null; email: string | null }> = {};
    if (devIds.length) {
      const { data: devs } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", devIds as string[]);
      (devs ?? []).forEach((d: any) => { devMap[d.id] = { display_name: d.display_name, email: d.email }; });
    }
    setRows(((data ?? []) as any).map((r: any) => ({ ...r, developer: r.developer_id ? devMap[r.developer_id] ?? null : null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: SalesReportStatus) => {
    const { error } = await supabase.from("sales_reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    load();
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (meFilter && !r.me_profile?.enterprise_name?.toLowerCase().includes(meFilter.toLowerCase())) return false;
      if (devFilter && !(r.developer?.display_name ?? r.developer?.email ?? "").toLowerCase().includes(devFilter.toLowerCase())) return false;
      if (monthFilter !== "all" && new Date(r.month).getMonth() !== Number(monthFilter)) return false;
      if (itemFilter && !r.item_name.toLowerCase().includes(itemFilter.toLowerCase())) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [rows, meFilter, devFilter, monthFilter, itemFilter, statusFilter]);

  const totalApproved = filtered.filter(r => r.status === "approved").reduce((s, r) => s + Number(r.total_amount), 0);

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Sales Reports</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? "All sales reports across the platform." : "Sales reports from your assigned MEs."}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">ME (Enterprise)</Label>
            <Input placeholder="Search..." value={meFilter} onChange={(e) => setMeFilter(e.target.value)} />
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label className="text-xs">Developer</Label>
              <Input placeholder="Search..." value={devFilter} onChange={(e) => setDevFilter(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Month</Label>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Item Name</Label>
            <Input placeholder="Search..." value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(SALES_STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length}</span> reports
          </div>
          <div className="text-sm">
            Approved total: <span className="font-semibold text-foreground">৳ {totalApproved.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ME</TableHead>
                    {isAdmin && <TableHead>Developer</TableHead>}
                    <TableHead>Item Name</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total (৳)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{r.me_profile?.enterprise_name ?? "—"}</TableCell>
                      {isAdmin && <TableCell>{r.developer?.display_name ?? r.developer?.email ?? "—"}</TableCell>}
                      <TableCell>{r.item_name}</TableCell>
                      <TableCell>{format(new Date(r.month), "MMM yyyy")}</TableCell>
                      <TableCell className="text-right">{r.quantity_sold}</TableCell>
                      <TableCell className="text-right">৳ {Number(r.total_amount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SALES_STATUS_COLOR[r.status]}>
                          {SALES_STATUS_LABEL[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {!isAdmin && r.status === "pending_review" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "under_developer_review")}>
                              <Flag className="h-3.5 w-3.5 mr-1" /> Flag
                            </Button>
                          )}
                          {!isAdmin && (r.status === "pending_review" || r.status === "under_developer_review") && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "approved")}>
                              <Send className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                          )}
                          {isAdmin && r.status !== "approved" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "approved")}>
                              <Check className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                          )}
                          {r.status !== "rejected" && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rejected")}>
                              <X className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          )}
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/profiles/${r.me_profile_id}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">
                        No sales reports found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
