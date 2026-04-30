import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, ShoppingCart, ImageIcon } from "lucide-react";
import { STATUS_LABEL, STATUS_COLOR, type TaskStatus } from "@/lib/constants";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/products/CartDrawer";

interface Row {
  id: string;
  status: TaskStatus;
  master_product_id: string;
  master_product: {
    name: string;
    display_order: number;
    price: number;
    stock: number;
    image_url: string | null;
    category: string | null;
  } | null;
}
interface MasterProduct { id: string; name: string; display_order: number; }

export function ProductsSection({ meProfileId }: { meProfileId: string }) {
  return (
    <CartProvider>
      <ProductsSectionInner meProfileId={meProfileId} />
    </CartProvider>
  );
}

function ProductsSectionInner({ meProfileId }: { meProfileId: string }) {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [masters, setMasters] = useState<MasterProduct[]>([]);
  const [developerId, setDeveloperId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const canManage = role === "admin" || role === "developer";
  const isMe = role === "me";

  const load = async () => {
    setLoading(true);
    const [rowsRes, mastersRes, profileRes] = await Promise.all([
      supabase.from("me_products").select("id, status, master_product_id, master_product:master_products(name, display_order, price, stock, image_url, category)").eq("me_profile_id", meProfileId),
      supabase.from("master_products").select("id, name, display_order").order("display_order"),
      supabase.from("me_profiles").select("developer_id").eq("id", meProfileId).maybeSingle(),
    ]);
    const sorted = (rowsRes.data ?? []).sort((a: any, b: any) => (a.master_product?.display_order ?? 0) - (b.master_product?.display_order ?? 0));
    setRows(sorted as any);
    setMasters(mastersRes.data ?? []);
    setDeveloperId((profileRes.data as any)?.developer_id ?? null);
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

  // ME view: shop-style table with cart
  if (isMe) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Products assigned to your profile</div>
            <CartDrawer meProfileId={meProfileId} developerId={developerId} />
          </div>
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0">
              <TableRow>
                <TableHead className="w-14">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price (৳)</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-56 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No products assigned yet.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <MeProductRow key={r.id} row={r} />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  // Admin / Developer view: assignment management (existing)
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
                <div className="text-xs text-muted-foreground mt-0.5">
                  ৳ {Number(row.master_product?.price ?? 0).toFixed(2)} · Stock: {row.master_product?.stock ?? 0}
                </div>
                <Badge className={`mt-1 ${STATUS_COLOR[row.status]}`} variant="outline">{STATUS_LABEL[row.status]}</Badge>
              </div>
              {canManage && (
                <Select value={row.status} onValueChange={(v) => updateStatus(row.id, v as TaskStatus)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              )}
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

function MeProductRow({ row }: { row: Row }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const product = row.master_product;
  const stock = product?.stock ?? 0;
  const price = Number(product?.price ?? 0);

  const handleAdd = () => {
    if (!product) return;
    if (stock <= 0) { toast.error("Out of stock"); return; }
    if (qty < 1) { toast.error("Quantity must be at least 1"); return; }
    if (qty > stock) { toast.error(`Only ${stock} available`); return; }
    add({
      productId: row.master_product_id,
      name: product.name,
      price,
      quantity: qty,
      maxStock: stock,
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        {product?.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-9 w-9 rounded object-cover border" />
        ) : (
          <div className="h-9 w-9 rounded border bg-muted flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium">{product?.name}</div>
        {product?.category && <div className="text-xs text-muted-foreground">{product.category}</div>}
      </TableCell>
      <TableCell className="text-right tabular-nums">৳ {price.toFixed(2)}</TableCell>
      <TableCell className="text-right tabular-nums">
        <span className={stock === 0 ? "text-destructive font-medium" : ""}>{stock}</span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Input type="number" min={1} max={stock} value={qty}
            onChange={(e) => setQty(parseInt(e.target.value || "1", 10))}
            className="h-8 w-20" disabled={stock === 0} />
          <Button size="sm" onClick={handleAdd} disabled={stock === 0}>
            <ShoppingCart className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
