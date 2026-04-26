import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, ExternalLink } from "lucide-react";
import { STATUS_LABEL, STATUS_COLOR, type TaskStatus } from "@/lib/constants";
import { toast } from "sonner";
import { uploadFile } from "@/lib/uploadFile";

interface Row {
  id: string;
  status: TaskStatus;
  proof_url: string | null;
  master_task_id: string;
  master_task: { name: string; display_order: number } | null;
}

export function TasksSection({ meProfileId }: { meProfileId: string }) {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("me_tasks")
      .select("id, status, proof_url, master_task_id, master_task:master_tasks(name, display_order)")
      .eq("me_profile_id", meProfileId);
    const sorted = (data ?? []).sort((a: any, b: any) => (a.master_task?.display_order ?? 0) - (b.master_task?.display_order ?? 0));
    setRows(sorted as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [meProfileId]);

  const updateStatus = async (id: string, status: TaskStatus) => {
    const update: any = { status };
    if (status !== "completed") update.proof_url = null;
    const { error } = await supabase.from("me_tasks").update(update).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    load();
  };

  const uploadProof = async (id: string, file: File) => {
    try {
      const url = await uploadFile("task-proofs", file, meProfileId);
      const { error } = await supabase.from("me_tasks").update({ proof_url: url }).eq("id", id);
      if (error) throw error;
      toast.success("Proof uploaded");
      load();
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {rows.map((row) => (
            <div key={row.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{row.master_task?.name}</div>
                <Badge className={`mt-1 ${STATUS_COLOR[row.status]}`} variant="outline">{STATUS_LABEL[row.status]}</Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={row.status} onValueChange={(v) => updateStatus(row.id, v as TaskStatus)}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                {row.status === "completed" && (
                  <>
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProof(row.id, f); e.target.value = ""; }}
                      />
                      <Button asChild variant="outline" size="sm">
                        <span className="cursor-pointer"><Upload className="h-3.5 w-3.5 mr-1.5" /> {row.proof_url ? "Replace proof" : "Upload proof"}</span>
                      </Button>
                    </label>
                    {row.proof_url && (
                      <Button asChild variant="ghost" size="sm">
                        <a href={row.proof_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View</a>
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {rows.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No tasks attached.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
