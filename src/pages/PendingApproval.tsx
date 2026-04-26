import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function PendingApproval() {
  const { signOut, accountStatus, user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (accountStatus === "approved") return <Navigate to="/dashboard" replace />;

  const rejected = accountStatus === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary to-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className={`mx-auto h-12 w-12 rounded-xl flex items-center justify-center mb-2 ${rejected ? "bg-destructive/10" : "bg-warning/10"}`}>
            <Clock className={`h-6 w-6 ${rejected ? "text-destructive" : "text-warning"}`} />
          </div>
          <CardTitle>{rejected ? "Account rejected" : "Pending admin approval"}</CardTitle>
          <CardDescription>
            {rejected
              ? "Your account access has been rejected by an administrator. Please contact support if you think this is a mistake."
              : "Your email is verified. An administrator must approve your account before you can access the system."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
