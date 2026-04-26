import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, ExternalLink, RefreshCw } from "lucide-react";
import { STATUS_LABEL, type TaskStatus } from "@/lib/constants";
import { toast } from "sonner";
import { uploadFile } from "@/lib/uploadFile";

interface Row {
  id: string;
  status: TaskStatus;
  proof_url: string | null;
  master_task_id: string;
  master_task: { name: string; display_order: number } | null;
}

const STATUS_DOT: Record<TaskStatus, string> = {
  pending: "bg-muted-foreground/60",
  processing: "bg-orange-500",
  completed: "bg-green-500",
};

const STATUS_TEXT: Record<TaskStatus, string> = {
  pending: "text-muted-foreground",
  processing: "text-orange-600 dark:text-orange-400",
  completed: "text-green-600 dark:text-green-400",
};

export function TasksSection({ meProfileId }: { meProfileId: string }) {
  const { role } = useAuth();
  const canManage = role === "admin" || role === "developer";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("me_tasks")
      .select("id, status, proof_url, master_task_id, master_task:master_tasks(name, display_order)")
      .eq("me_profile_id", meProfileId);
    const sorted = (data ?? []).sort(
      (a: any, b: any) => (a.master_task?.display_order ?? 0) - (b.master_task?.display_order ?? 0),
    );
    setRows(sorted as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [meProfileId]);

  const updateStatus = async (id: string, status: TaskStatus) => {
    const update: any = { status };
    if (status !== "completed") update.proof_url = null;
    const { error } = await supabase.from("me_tasks").update(update).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
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
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-[50%]">Task Name</TableHead>
                <TableHead className="w-[25%]">Status</TableHead>
                <TableHead className="w-[25%]">Upload Proof</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isCompleted = row.status === "completed";
                return (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[row.status]}`} />
                        <span>{row.master_task?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select value={row.status} onValueChange={(v) => updateStatus(row.id, v as TaskStatus)}>
                          <SelectTrigger className={`w-[150px] ${STATUS_TEXT[row.status]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`text-sm font-medium ${STATUS_TEXT[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!canManage ? (
                        row.proof_url ? (
                          <Button asChild variant="ghost" size="sm">
                            <a href={row.proof_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )
                      ) : isCompleted ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="inline-flex">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadProof(row.id, f);
                                e.target.value = "";
                              }}
                            />
                            <Button asChild variant="outline" size="sm">
                              <span className="cursor-pointer">
                                {row.proof_url ? (
                                  <>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Replace
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                          {row.proof_url && (
                            <Button asChild variant="ghost" size="sm">
                              <a href={row.proof_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View
                              </a>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No tasks attached.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
