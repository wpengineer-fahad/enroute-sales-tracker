import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, type OrderStatus } from "@/lib/constants";
import { toast } from "sonner";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  master_product_id: string;
  quantity: number;
  unit_price: number;
  master_product: { name: string } | null;
}
interface Order {
  id: string;
  me_profile_id: string;
  developer_id: string | null;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  decided_at: string | null;
  me_profile: { enterprise_name: string; owner_name: string } | null;
  order_items: OrderItem[];
}

export default function Orders() {
  const { role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("__all__");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, me_profile_id, developer_id, status, total_amount, created_at, decided_at,
        me_profile:me_profiles(enterprise_name, owner_name),
        order_items(id, master_product_id, quantity, unit_price, master_product:master_products(name))
      `)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOrders((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "approved" ? "Order approved — stock deducted" : "Order rejected");
    load();
  };

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = filter === "__all__" ? orders : orders.filter((o) => o.status === filter);
  const canDecide = role === "developer" || role === "admin";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="text-sm text-muted-foreground">
          {role === "me" && "Track the status of your purchase requests."}
          {role === "developer" && "Review and approve purchase requests from your assigned MEs."}
          {role === "admin" && "Oversight of all purchase orders in the system."}
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <CardTitle className="text-sm font-normal text-muted-foreground ml-auto">{filtered.length} orders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Date</TableHead>
                  {role !== "me" && <TableHead>Enterprise</TableHead>}
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total (৳)</TableHead>
                  <TableHead>Status</TableHead>
                  {canDecide && <TableHead className="w-44 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canDecide ? 7 : 6} className="text-center text-muted-foreground py-10">No orders found.</TableCell>
                  </TableRow>
                )}
                {filtered.map((o) => {
                  const isOpen = expanded.has(o.id);
                  return (
                    <FragmentRow key={o.id}>
                      <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => toggle(o.id)}>
                        <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="text-sm">{format(new Date(o.created_at), "PP p")}</TableCell>
                        {role !== "me" && (
                          <TableCell>
                            <div className="font-medium">{o.me_profile?.enterprise_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{o.me_profile?.owner_name}</div>
                          </TableCell>
                        )}
                        <TableCell className="text-right tabular-nums">{o.order_items?.length ?? 0}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">৳ {Number(o.total_amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={ORDER_STATUS_COLOR[o.status]} variant="outline">{ORDER_STATUS_LABEL[o.status]}</Badge>
                        </TableCell>
                        {canDecide && (
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            {o.status === "pending" && role === "developer" ? (
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="outline" onClick={() => decide(o.id, "approved")}>
                                  <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => decide(o.id, "rejected")}>
                                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {o.decided_at ? format(new Date(o.decided_at), "PP") : "—"}
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                      {isOpen && (
                        <TableRow key={o.id + "-exp"}>
                          <TableCell colSpan={canDecide ? 7 : 6} className="bg-muted/20 p-0">
                            <div className="p-4">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Items</div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {o.order_items?.map((it) => (
                                    <TableRow key={it.id}>
                                      <TableCell>{it.master_product?.name ?? "—"}</TableCell>
                                      <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                                      <TableCell className="text-right tabular-nums">৳ {Number(it.unit_price).toFixed(2)}</TableCell>
                                      <TableCell className="text-right tabular-nums">৳ {(Number(it.unit_price) * it.quantity).toFixed(2)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
