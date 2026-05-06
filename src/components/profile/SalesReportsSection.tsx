import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, Check, X, Flag, Send, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  MONTHS,
  SALES_STATUS_COLOR,
  SALES_STATUS_LABEL,
  type SalesReportStatus,
} from "@/lib/constants";

interface Row {
  id: string;
  item_name: string;
  month: string; // date
  quantity_sold: number;
  total_amount: number;
  note: string | null;
  status: SalesReportStatus;
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);

export function SalesReportsSection({ meProfileId }: { meProfileId: string }) {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_reports")
      .select("id, item_name, month, quantity_sold, total_amount, note, status")
      .eq("me_profile_id", meProfileId)
      .order("month", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [meProfileId]);

  const isMe = role === "me";
  const isDev = role === "developer";
  const isAdmin = role === "admin";

  const updateStatus = async (id: string, status: SalesReportStatus) => {
    const { error } = await supabase.from("sales_reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Monthly Sales Report</h3>
            <p className="text-xs text-muted-foreground">Track item-wise monthly sales and approval status.</p>
          </div>
          {isMe && (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Submit Sales Report
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Report
            </Button>
          )}
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Total (৳)</TableHead>
                <TableHead>Status</TableHead>
                {(isDev || isAdmin) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell>{format(new Date(r.month), "MMM yyyy")}</TableCell>
                  <TableCell className="text-right">{r.quantity_sold}</TableCell>
                  <TableCell className="text-right">৳ {Number(r.total_amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SALES_STATUS_COLOR[r.status]}>
                      {SALES_STATUS_LABEL[r.status]}
                    </Badge>
                  </TableCell>
                  {(isDev || isAdmin) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {isDev && r.status === "pending_review" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "under_developer_review")}>
                            <Flag className="h-3.5 w-3.5 mr-1" /> Flag
                          </Button>
                        )}
                        {isDev && (r.status === "pending_review" || r.status === "under_developer_review") && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "approved")}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Forward / Approve
                          </Button>
                        )}
                        {isAdmin && r.status !== "approved" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "approved")}>
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        )}
                        {(isAdmin || isDev) && r.status !== "rejected" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "rejected")}>
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isDev || isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                    No sales reports submitted yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        meProfileId={meProfileId}
        editing={editing}
        isAdmin={isAdmin}
        onSaved={() => { setOpen(false); load(); }}
      />
    </Card>
  );
}

function ReportDialog({
  open, onOpenChange, meProfileId, editing, isAdmin, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meProfileId: string;
  editing: Row | null;
  isAdmin: boolean;
  onSaved: () => void;
}) {
  const [itemName, setItemName] = useState("");
  const [monthIdx, setMonthIdx] = useState<string>(String(new Date().getMonth()));
  const [year, setYear] = useState<string>(String(currentYear));
  const [qty, setQty] = useState<string>("");
  const [total, setTotal] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      const d = new Date(editing.month);
      setItemName(editing.item_name);
      setMonthIdx(String(d.getMonth()));
      setYear(String(d.getFullYear()));
      setQty(String(editing.quantity_sold));
      setTotal(String(editing.total_amount));
      setNote(editing.note ?? "");
    } else {
      setItemName(""); setMonthIdx(String(new Date().getMonth())); setYear(String(currentYear));
      setQty(""); setTotal(""); setNote("");
    }
  }, [editing, open]);

  const submit = async () => {
    if (!itemName.trim() || !qty || !total) {
      toast.error("Please fill item name, quantity and total amount");
      return;
    }
    setSaving(true);
    const monthDate = `${year}-${String(Number(monthIdx) + 1).padStart(2, "0")}-01`;
    const payload: any = {
      item_name: itemName.trim(),
      month: monthDate,
      quantity_sold: Number(qty),
      total_amount: Number(total),
      note: note.trim() || null,
    };
    let error;
    if (editing && isAdmin) {
      ({ error } = await supabase.from("sales_reports").update(payload).eq("id", editing.id));
    } else {
      payload.me_profile_id = meProfileId;
      ({ error } = await supabase.from("sales_reports").insert(payload));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Report updated" : "Sales report submitted");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Sales Report" : "Submit Sales Report"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Item Name</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Cotton Saree" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={monthIdx} onValueChange={setMonthIdx}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantity Sold</Label>
              <Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Sales (৳)</Label>
              <Input type="number" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Save Changes" : "Submit Sales Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
