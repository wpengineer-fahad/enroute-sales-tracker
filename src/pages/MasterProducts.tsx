import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Pencil, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductFormDialog, type ProductRow } from "@/components/products/ProductFormDialog";
import { SUB_SECTORS } from "@/lib/constants";

export default function MasterProducts() {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("__all__");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("master_products").select("*").order("display_order");
    if (error) toast.error(error.message);
    setItems((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("master_products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed"); load();
  };

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: ProductRow) => { setEditing(p); setDialogOpen(true); };

  const filtered = items.filter((p) => {
    if (filterCat !== "__all__" && p.category !== filterCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Master Products</h1>
          <p className="text-sm text-muted-foreground">Manage the global product catalog with stock & pricing.</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex gap-3 flex-wrap items-center">
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="max-w-xs"><SelectValue placeholder="Filter by sub-sector" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All sub-sectors</SelectItem>
                {SUB_SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <CardTitle className="text-sm font-normal text-muted-foreground ml-auto">{filtered.length} products</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0">
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price (৳)</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No products found.</TableCell></TableRow>
                )}
                {filtered.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">৳ {Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={p.stock === 0 ? "text-destructive font-medium" : ""}>{p.stock}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} onSaved={load} />
    </div>
  );
}
