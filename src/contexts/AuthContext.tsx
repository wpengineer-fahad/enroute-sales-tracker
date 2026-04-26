import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/constants";

export type AccountStatus = "pending" | "approved" | "rejected";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  accountStatus: AccountStatus | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoleAndStatus = async (uid: string) => {
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("profiles").select("account_status").eq("id", uid).maybeSingle(),
    ]);
    let r: AppRole | null = null;
    if (roles && roles.length) {
      const priority: AppRole[] = ["admin", "developer", "me"];
      r = priority.find((p) => roles.find((d) => d.role === p)) ?? (roles[0].role as AppRole);
    }
    const status = (profile?.account_status as AccountStatus) ?? null;
    return { role: r, status };
  };

  const refreshRole = async () => {
    if (!user) return;
    const { role: r, status } = await fetchRoleAndStatus(user.id);
    setRole(r);
    setAccountStatus(status);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => {
          fetchRoleAndStatus(sess.user.id).then(({ role: r, status }) => {
            setRole(r);
            setAccountStatus(status);
          });
        }, 0);
      } else {
        setRole(null);
        setAccountStatus(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchRoleAndStatus(sess.user.id).then(({ role: r, status }) => {
          setRole(r);
          setAccountStatus(status);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setAccountStatus(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, accountStatus, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
