import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/lib/constants";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  allow?: AppRole[];
}

export function ProtectedRoute({ children, allow }: Props) {
  const { user, role, accountStatus, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Email not confirmed -> verify page
  if (!user.email_confirmed_at && !user.confirmed_at) {
    if (location.pathname !== "/verify-email") {
      return <Navigate to="/verify-email" replace />;
    }
  } else if (accountStatus && accountStatus !== "approved") {
    // Verified but not approved
    if (location.pathname !== "/pending-approval") {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  if (allow && role && !allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
