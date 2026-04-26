import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(sessionStorage.getItem("pending_verify_email") ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // If already verified, route forward
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && (data.user.email_confirmed_at || data.user.confirmed_at)) {
        checkApprovalAndRoute(data.user.id);
      }
    });
    // eslint-disable-next-line
  }, []);

  const checkApprovalAndRoute = async (uid: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", uid)
      .maybeSingle();
    if (profile?.account_status === "approved") navigate("/dashboard");
    else navigate("/pending-approval");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || code.length !== 6) {
      toast.error("Enter your email and the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });
      if (error) throw error;
      sessionStorage.removeItem("pending_verify_email");
      toast.success("Email verified");
      if (data.user) await checkApprovalAndRoute(data.user.id);
      else navigate("/pending-approval");
    } catch (err: any) {
      toast.error(err.message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Verification code resent");
    } catch (err: any) {
      toast.error(err.message ?? "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary to-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We sent a 6-digit verification code to your email. Enter it below to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="text-center text-lg tracking-[0.5em] font-mono"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={resending} onClick={handleResend}>
              {resending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resend code
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
