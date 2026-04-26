import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MasterTasks() {
  const [items, setItems] = useState<{ id: string; name: string; display_order: number }[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("master_tasks").select("*").order("display_order");
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const next = (items[items.length - 1]?.display_order ?? 0) + 1;
    const { error } = await supabase.from("master_tasks").insert({ name: name.trim(), display_order: next });
    if (error) { toast.error(error.message); return; }
    setName("");
    toast.success("Task added — auto-attached to all MEs");
    load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("master_tasks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed");
    load();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Master Tasks</h1>
        <p className="text-sm text-muted-foreground">These tasks are auto-attached to every ME profile.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add new task</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Task name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button onClick={add}><Plus className="h-4 w-4 mr-2" /> Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <div className="divide-y">
              {items.map((t, i) => (
                <div key={t.id} className="p-3 flex items-center justify-between">
                  <div><span className="text-sm text-muted-foreground mr-3">{i + 1}.</span><span className="font-medium">{t.name}</span></div>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
