// Admin-only edge function: create a new user (admin/developer/me) pre-verified & approved.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role = "admin" | "developer" | "me";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    // Caller client (uses caller's JWT to identify them)
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    // Verify caller is admin
    const { data: hasRole, error: roleErr } = await caller.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !hasRole) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json();
    const { email, password, displayName, role } = body as {
      email: string; password: string; displayName: string; role: Role;
    };

    if (!email || !password || !role) return json({ error: "Missing fields" }, 400);
    if (!["admin", "developer", "me"].includes(role)) return json({ error: "Invalid role" }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 chars" }, 400);

    // Service-role admin client
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification
      user_metadata: {
        display_name: displayName || email,
        role,
        admin_provisioned: true, // trigger reads this
      },
    });

    if (createErr) return json({ error: createErr.message }, 400);

    // Ensure account_status approved (trigger should already do it, but be defensive)
    await admin
      .from("profiles")
      .update({ account_status: "approved" })
      .eq("id", created.user!.id);

    return json({ ok: true, user_id: created.user!.id });
  } catch (e: any) {
    console.error("admin-create-user error", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
