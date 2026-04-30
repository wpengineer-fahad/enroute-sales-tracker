import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Trash2, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  meProfileId: string;
  developerId: string | null;
}

export function CartDrawer({ meProfileId, developerId }: Props) {
  const { items, updateQty, remove, clear, total, count } = useCart();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checkout = async () => {
    if (items.length === 0) return;
    if (!developerId) {
      toast.error("No assigned developer found for your profile.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: order, error } = await supabase.from("orders").insert({
        me_profile_id: meProfileId,
        developer_id: developerId,
        status: "pending",
        total_amount: total,
      }).select("id").single();
      if (error) throw error;

      const itemPayload = items.map((i) => ({
        order_id: order.id,
        master_product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.price,
      }));
      const { error: itemErr } = await supabase.from("order_items").insert(itemPayload);
      if (itemErr) throw itemErr;

      toast.success("Purchase request submitted for approval");
      clear();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ShoppingCart className="h-4 w-4" /> Cart {count > 0 && <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">{count}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader><SheetTitle>Your Cart</SheetTitle></SheetHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.length === 0 && <div className="text-sm text-muted-foreground text-center py-10">Cart is empty.</div>}
          {items.map((i) => (
            <div key={i.productId} className="border rounded-md p-3 space-y-2">
              <div className="flex justify-between gap-2">
                <div className="font-medium text-sm">{i.name}</div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i.productId)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">৳ {i.price.toFixed(2)} × </div>
                <Input type="number" min={1} max={i.maxStock} value={i.quantity}
                  onChange={(e) => updateQty(i.productId, parseInt(e.target.value || "1", 10))}
                  className="h-8 w-20" />
                <div className="text-sm font-medium tabular-nums">৳ {(i.price * i.quantity).toFixed(2)}</div>
              </div>
              <div className="text-xs text-muted-foreground">Available: {i.maxStock}</div>
            </div>
          ))}
        </div>
        <SheetFooter className="border-t pt-4 flex-col gap-2 sm:flex-col">
          <div className="flex justify-between w-full text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold">৳ {total.toFixed(2)}</span>
          </div>
          <Button className="w-full" onClick={checkout} disabled={submitting || items.length === 0}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Request Purchase
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
