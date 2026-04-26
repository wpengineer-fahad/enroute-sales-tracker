import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { STATUS_LABEL, STATUS_COLOR, type TaskStatus } from "@/lib/constants";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Row {
  id: string;
  status: TaskStatus;
  master_product_id: string;
  master_product: { name: string; display_order: number } | null;
}
interface MasterProduct { id: string; name: string; display_order: number; }

export function ProductsSection({ meProfileId }: { meProfileId: string }) {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [masters, setMasters] = useState<MasterProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const canManage = role === "admin" || role === "developer";

  const load = async () => {
    setLoading(true);
    const [rowsRes, mastersRes] = await Promise.all([
      supabase.from("me_products").select("id, status, master_product_id, master_product:master_products(name, display_order)").eq("me_profile_id", meProfileId),
      supabase.from("master_products").select("*").order("display_order"),
    ]);
    const sorted = (rowsRes.data ?? []).sort((a: any, b: any) => (a.master_product?.display_order ?? 0) - (b.master_product?.display_order ?? 0));
    setRows(sorted as any);
    setMasters(mastersRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [meProfileId]);

  const updateStatus = async (id: string, status: TaskStatus) => {
    const { error } = await supabase.from("me_products").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    load();
  };

  const assignProduct = async (master_product_id: string) => {
    const { error } = await supabase.from("me_products").insert({ me_profile_id: meProfileId, master_product_id, status: "pending" });
    if (error) { toast.error(error.message); return; }
    toast.success("Product assigned");
    setAddOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("me_products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const assignedIds = new Set(rows.map((r) => r.master_product_id));
  const available = masters.filter((m) => !assignedIds.has(m.id));

  return (
    <Card>
      <CardContent className="p-0">
        {canManage && (
          <div className="p-4 border-b flex justify-end">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" /> Assign Product</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Assign a product</DialogTitle></DialogHeader>
                <div className="max-h-96 overflow-y-auto divide-y">
                  {available.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">All products already assigned.</div>}
                  {available.map((m) => (
                    <button key={m.id} onClick={() => assignProduct(m.id)} className="w-full text-left p-3 hover:bg-secondary text-sm">{m.name}</button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <div className="divide-y">
          {rows.map((row) => (
            <div key={row.id} className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{row.master_product?.name}</div>
                <Badge className={`mt-1 ${STATUS_COLOR[row.status]}`} variant="outline">{STATUS_LABEL[row.status]}</Badge>
              </div>
              {canManage ? (
                <Select value={row.status} onValueChange={(v) => updateStatus(row.id, v as TaskStatus)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              {canManage && (
                <Button variant="ghost" size="icon" onClick={() => remove(row.id)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
          ))}
          {rows.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No products assigned yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
