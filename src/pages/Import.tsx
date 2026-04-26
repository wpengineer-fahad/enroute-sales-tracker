import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Download } from "lucide-react";

const TEMPLATE_HEADERS = [
  "owner_name","enterprise_name","business_category","sub_sector",
  "contact_number","email","location","registration_date","trade_license_text",
];

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  return lines.map((line) => {
    const out: string[] = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (c === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  });
}

export default function ImportPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number; errors: string[] } | null>(null);

  const downloadTemplate = () => {
    const csv = TEMPLATE_HEADERS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "me_profiles_template.csv";
    a.click();
  };

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setResult(null);
    try {
      const text = await f.text();
      const rows = parseCSV(text);
      if (rows.length < 2) throw new Error("CSV is empty");
      const headers = rows[0];
      let ok = 0, failed = 0;
      const errors: string[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj: any = {};
        headers.forEach((h, idx) => { obj[h] = row[idx] || null; });
        if (!obj.owner_name || !obj.enterprise_name) { failed++; errors.push(`Row ${i + 1}: missing required fields`); continue; }
        const { error } = await supabase.from("me_profiles").insert(obj);
        if (error) { failed++; errors.push(`Row ${i + 1}: ${error.message}`); }
        else ok++;
      }
      setResult({ ok, failed, errors: errors.slice(0, 10) });
      toast.success(`Imported ${ok} profile${ok !== 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Import</h1>
        <p className="text-sm text-muted-foreground">Upload a CSV to create many ME profiles at once.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV Template</CardTitle>
          <CardDescription>Use these column headers: {TEMPLATE_HEADERS.join(", ")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-2" /> Download template</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Upload CSV</CardTitle></CardHeader>
        <CardContent>
          <Input type="file" accept=".csv" onChange={handle} disabled={busy} />
          {busy && <div className="mt-3 flex items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</div>}
          {result && (
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-success">✓ Imported: {result.ok}</p>
              {result.failed > 0 && <p className="text-destructive">✗ Failed: {result.failed}</p>}
              {result.errors.length > 0 && (
                <div className="bg-secondary p-3 rounded text-xs space-y-1">
                  {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
