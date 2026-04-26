import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

interface PendingUser {
  id: string;
  display_name: string | null;
  email: string | null;
  account_status: "pending" | "approved" | "rejected";
  role: string | null;
}

export default function UserApprovals() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, display_name, email, account_status")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const ids = profiles?.map((p) => p.id) ?? [];
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);

    const rolesByUser = new Map<string, string>();
    (roles ?? []).forEach((r) => {
      const existing = rolesByUser.get(r.user_id);
      // priority admin > developer > me
      if (!existing) rolesByUser.set(r.user_id, r.role);
      else if (existing === "me" && r.role !== "me") rolesByUser.set(r.user_id, r.role);
      else if (existing === "developer" && r.role === "admin") rolesByUser.set(r.user_id, r.role);
    });

    setUsers(
      (profiles ?? []).map((p) => ({
        ...p,
        account_status: p.account_status as PendingUser["account_status"],
        role: rolesByUser.get(p.id) ?? null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setActing(id);
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: status })
      .eq("id", id);
    setActing(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`User ${status}`);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, account_status: status } : u)));
  };

  const statusBadge = (s: PendingUser["account_status"]) => {
    if (s === "approved") return <Badge className="bg-success/15 text-success border border-success/30">Approved</Badge>;
    if (s === "rejected") return <Badge className="bg-destructive/15 text-destructive border border-destructive/30">Rejected</Badge>;
    return <Badge className="bg-warning/15 text-warning border border-warning/30">Pending</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Approval Management</h1>
          <p className="text-sm text-muted-foreground">Approve or reject new accounts. Admins are auto-approved.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users yet</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.display_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email ?? "—"}</TableCell>
                    <TableCell className="capitalize">{u.role ?? "—"}</TableCell>
                    <TableCell>{statusBadge(u.account_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={acting === u.id || u.account_status === "approved" || u.role === "admin"}
                          onClick={() => updateStatus(u.id, "approved")}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={acting === u.id || u.account_status === "rejected" || u.role === "admin"}
                          onClick={() => updateStatus(u.id, "rejected")}
                          className="text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
