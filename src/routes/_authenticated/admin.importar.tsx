import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, RefreshCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/page-shell";
import { importPecas, type ImportSummary } from "@/lib/import-pecas.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/importar")({
  component: AdminImportarPage,
});

const FIELDS = [
  { key: "codigo_original", label: "Código OEM / Original" },
  { key: "codigo_interno", label: "Código Interno" },
  { key: "descricao", label: "Descrição *" },
  { key: "fabricante", label: "Fabricante" },
  { key: "categoria", label: "Categoria" },
  { key: "aplicacao", label: "Aplicações" },
  { key: "observacoes", label: "Equivalências / Observações" },
  { key: "imagem_url", label: "Imagem (URL)" },
] as const;

type Row = Record<string, unknown>;

function AdminImportarPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [running, setRunning] = useState(false);
  const runImport = useServerFn(importPecas);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return setIsAdmin(false);
      const { data } = await supabase.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" });
      setIsAdmin(!!data);
    })();
  }, []);

  const mappedRows = useMemo(() => {
    return rows.map((r) => {
      const out: Row = {};
      for (const f of FIELDS) {
        const col = mapping[f.key];
        if (col) out[f.key] = r[col];
      }
      return out;
    });
  }, [rows, mapping]);

  const canImport =
    !!mapping.descricao && rows.length > 0 && !running && (mapping.codigo_original || mapping.codigo_interno);

  async function onFile(file: File) {
    setSummary(null);
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "txt") {
      Papa.parse<Row>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const h = res.meta.fields ?? [];
          setHeaders(h);
          setRows(res.data);
          autoMap(h);
        },
        error: () => toast.error("Falha ao ler CSV"),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
      const h = json.length ? Object.keys(json[0]) : [];
      setHeaders(h);
      setRows(json);
      autoMap(h);
    } else {
      toast.error("Formato não suportado. Use .xlsx ou .csv");
    }
  }

  function autoMap(h: string[]) {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const guesses: Record<string, string[]> = {
      codigo_original: ["codigooriginal", "codigooem", "oem", "originalcode", "codigo"],
      codigo_interno: ["codigointerno", "sku", "internalcode"],
      descricao: ["descricao", "description", "nome", "produto"],
      fabricante: ["fabricante", "marca", "manufacturer", "brand"],
      categoria: ["categoria", "category", "grupo"],
      aplicacao: ["aplicacao", "aplicacoes", "application", "veiculo"],
      observacoes: ["equivalencias", "equivalencia", "observacoes", "notes", "similares"],
      imagem_url: ["imagem", "imagemurl", "image", "imageurl", "foto"],
    };
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      const target = guesses[f.key] ?? [];
      const found = h.find((col) => target.includes(norm(col)));
      if (found) next[f.key] = found;
    }
    setMapping(next);
  }

  async function handleImport() {
    setRunning(true);
    setSummary(null);
    try {
      const res = await runImport({ data: { rows: mappedRows } });
      setSummary(res);
      toast.success(`Importação concluída: ${res.inserted} novas, ${res.updated} atualizadas, ${res.rejected} rejeitadas`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSummary(null);
  }

  if (isAdmin === null) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <PageBody>
        <div className="rounded-lg border border-border/60 bg-surface/40 p-6 text-sm text-muted-foreground">
          Acesso restrito a administradores.
        </div>
      </PageBody>
    );
  }

  return (
    <>
      <PageHeader
        title="Importação em massa de peças"
        description="Envie um arquivo .xlsx ou .csv, mapeie as colunas e importe. Peças com código já existente serão atualizadas."
        actions={
          rows.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Recomeçar
            </Button>
          ) : null
        }
      />
      <PageBody>
        {rows.length === 0 ? (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/60 bg-surface/30 px-8 py-16 text-center transition hover:border-primary/60 hover:bg-surface/50">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Selecionar arquivo .xlsx ou .csv</div>
              <div className="text-xs text-muted-foreground">Máx. 5.000 linhas por importação</div>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 rounded-md border border-border/60 bg-surface/40 px-4 py-3 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">· {rows.length} linhas · {headers.length} colunas</span>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Mapeamento de colunas
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center gap-3 rounded-md border border-border/60 bg-surface/30 px-3 py-2">
                    <label className="w-56 text-sm">{f.label}</label>
                    <select
                      className="flex-1 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm"
                      value={mapping[f.key] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                    >
                      <option value="">— não mapear —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                * <b>Descrição</b> é obrigatória. Informe pelo menos <b>Código OEM</b> ou <b>Código Interno</b> para permitir atualização de duplicados.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Prévia (5 primeiras linhas)
              </h2>
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-xs">
                  <thead className="bg-surface/60">
                    <tr>
                      {FIELDS.map((f) => (
                        <th key={f.key} className="px-3 py-2 text-left font-medium">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-border/40">
                        {FIELDS.map((f) => (
                          <td key={f.key} className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                            {String(r[f.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleImport} disabled={!canImport}>
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Importar {rows.length} linhas
              </Button>
              {!canImport && !running && (
                <span className="text-xs text-muted-foreground">Mapeie <b>Descrição</b> e um dos códigos.</span>
              )}
            </div>

            {summary && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Inseridas" value={summary.inserted} tone="ok" />
                  <StatCard label="Atualizadas" value={summary.updated} tone="info" />
                  <StatCard label="Rejeitadas" value={summary.rejected} tone="err" />
                </div>
                {summary.results.some((r) => r.action === "rejected") && (
                  <div className="rounded-md border border-border/60">
                    <div className="border-b border-border/60 bg-surface/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                      Linhas rejeitadas
                    </div>
                    <div className="max-h-72 overflow-auto">
                      <table className="w-full text-xs">
                        <tbody>
                          {summary.results.filter((r) => r.action === "rejected").map((r) => (
                            <tr key={r.row} className="border-t border-border/40">
                              <td className="w-16 px-3 py-2 text-muted-foreground">L{r.row}</td>
                              <td className="w-40 px-3 py-2">{r.codigo ?? "—"}</td>
                              <td className="px-3 py-2 text-destructive">{r.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "ok" | "info" | "err" }) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "err" ? XCircle : RefreshCcw;
  const color = tone === "ok" ? "text-emerald-400" : tone === "err" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-md border border-border/60 bg-surface/40 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
