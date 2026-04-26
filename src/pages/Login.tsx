import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import type { AppRole } from "@/lib/constants";

type SignupRole = Exclude<AppRole, "admin">;

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<SignupRole>("me");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/verify-email`,
            data: { display_name: displayName || email, role },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email for the verification code.");
        // Persist email for verify page convenience
        sessionStorage.setItem("pending_verify_email", email);
        navigate("/verify-email");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Check verification
        if (data.user && !data.user.email_confirmed_at && !data.user.confirmed_at) {
          sessionStorage.setItem("pending_verify_email", email);
          toast.message("Please verify your email to continue.");
          navigate("/verify-email");
          return;
        }

        // Check approval
        const { data: profile } = await supabase
          .from("profiles")
          .select("account_status")
          .eq("id", data.user!.id)
          .maybeSingle();

        if (profile?.account_status !== "approved") {
          navigate("/pending-approval");
          return;
        }

        toast.success("Welcome back");
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary to-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent items-center justify-center mb-3 shadow-lg">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Sales Tracking System</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage Micro Enterprises with ease</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{mode === "login" ? "Sign in" : "Create your account"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Welcome back. Sign in to continue."
                : "Pick the role that matches you. Admin accounts are issued by an administrator."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label>Sign up as</Label>
                  <RadioGroup value={role} onValueChange={(v) => setRole(v as SignupRole)} className="grid grid-cols-1 gap-2">
                    {([
                      ["me", "ME (Micro Enterprise)"],
                      ["developer", "Sales / Market Developer"],
                    ] as [SignupRole, string][]).map(([val, label]) => (
                      <label key={val} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-secondary transition">
                        <RadioGroupItem value={val} id={`r-${val}`} />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>Don't have an account? <button type="button" className="text-primary font-medium hover:underline" onClick={() => setMode("signup")}>Sign up</button></>
              ) : (
                <>Already have an account? <button type="button" className="text-primary font-medium hover:underline" onClick={() => setMode("login")}>Sign in</button></>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
