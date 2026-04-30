import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUB_SECTORS } from "@/lib/constants";
import { uploadFile } from "@/lib/uploadFile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  category: z.enum(SUB_SECTORS),
  price: z.number().min(0, "Price must be ≥ 0"),
  stock: z.number().int().min(0, "Stock must be ≥ 0"),
});

export interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  display_order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product?: ProductRow | null;
  onSaved: () => void;
}

export function ProductFormDialog({ open, onOpenChange, product, onSaved }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [price, setPrice] = useState<string>("0");
  const [stock, setStock] = useState<string>("0");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setCategory(product?.category ?? "");
      setPrice(String(product?.price ?? 0));
      setStock(String(product?.stock ?? 0));
      setImageUrl(product?.image_url ?? null);
      setFile(null);
    }
  }, [open, product]);

  const save = async () => {
    const parsed = schema.safeParse({
      name,
      category,
      price: Number(price),
      stock: Number(stock),
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    try {
      let finalImage = imageUrl;
      if (file) {
        finalImage = await uploadFile("product-images", file, "products");
      }

      const payload = {
        name: parsed.data.name,
        category: parsed.data.category,
        price: parsed.data.price,
        stock: parsed.data.stock,
        image_url: finalImage,
      };

      if (product) {
        const { error } = await supabase.from("master_products").update(payload).eq("id", product.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { data: maxRow } = await supabase
          .from("master_products")
          .select("display_order")
          .order("display_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextOrder = (maxRow?.display_order ?? 0) + 1;
        const { error } = await supabase.from("master_products").insert({ ...payload, display_order: nextOrder });
        if (error) throw error;
        toast.success("Product added");
      }
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Product Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>Category (Sub-Sector)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select sub-sector" /></SelectTrigger>
              <SelectContent>
                {SUB_SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price (৳)</Label>
              <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" min={0} step="1" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Product Image</Label>
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {imageUrl && !file && (
              <img src={imageUrl} alt="Current" className="h-16 w-16 rounded object-cover border" />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {product ? "Save Changes" : "Add Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
