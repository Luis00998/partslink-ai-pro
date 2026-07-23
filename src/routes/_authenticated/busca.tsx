import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Search, AlertCircle, CheckCircle2, Camera, Upload, Barcode, FileText, Wrench, Car, Fingerprint } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { decodeVin, decodePlaca } from "@/lib/vehicle-lookup.functions";
import { identificarPecaPorImagem } from "@/lib/image-search.functions";
import { smartSearchPart, savePartFromSmartSearch, type SmartCandidate } from "@/lib/smart-search.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Sparkles, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/busca")({
  head: () => ({ meta: [{ title: "Buscar peça — PartsLink AI Pro" }] }),
  component: BuscaPage,
});

type Tipo = "placa" | "vin" | "original" | "fabricante" | "nome" | "imagem" | "smart";

async function saveHistorico(tipo: Tipo, termo: string, resultado: unknown) {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return;
  await supabase.from("historico_buscas").insert({
    tipo, termo, resultado: resultado as never, owner_id: uid,
  });
}

function BuscaPage() {
  return (
    <>
      <PageHeader
        title="Buscar peça"
        description="Identifique um veículo ou localize uma peça diretamente no seu catálogo técnico."
      />
      <PageBody>
        <div className="mx-auto max-w-4xl">
          <Tabs defaultValue="placa">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
              <TabsTrigger value="placa"><Car className="mr-1.5 h-3.5 w-3.5" />Placa</TabsTrigger>
              <TabsTrigger value="vin"><Fingerprint className="mr-1.5 h-3.5 w-3.5" />Chassi</TabsTrigger>
              <TabsTrigger value="original"><Barcode className="mr-1.5 h-3.5 w-3.5" />Original</TabsTrigger>
              <TabsTrigger value="fabricante"><Wrench className="mr-1.5 h-3.5 w-3.5" />Fabricante</TabsTrigger>
              <TabsTrigger value="nome"><FileText className="mr-1.5 h-3.5 w-3.5" />Nome</TabsTrigger>
              <TabsTrigger value="imagem"><Camera className="mr-1.5 h-3.5 w-3.5" />Imagem</TabsTrigger>
            </TabsList>

            <TabsContent value="placa"><PlacaSearch /></TabsContent>
            <TabsContent value="vin"><VinSearch /></TabsContent>
            <TabsContent value="original"><CodeSearch tipo="original" placeholder="Código original da montadora (ex: 5802915419)" fields={["codigo_original"]} /></TabsContent>
            <TabsContent value="fabricante"><CodeSearch tipo="fabricante" placeholder="Código do fabricante (ex: PSL962, W 950)" fields={["codigo_interno", "codigo_barras"]} /></TabsContent>
            <TabsContent value="nome"><CodeSearch tipo="nome" placeholder="Nome da peça (ex: filtro combustível separador)" fields={["descricao", "aplicacao"]} /></TabsContent>
            <TabsContent value="imagem"><ImageSearch /></TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            O sistema jamais inventa códigos, aplicações ou equivalências.
            Resultados vêm exclusivamente do seu catálogo técnico e das fontes conectadas.
          </p>
        </div>
      </PageBody>
    </>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <Card className="mt-4 border-border/60 shadow-card">
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

function PlacaSearch() {
  const decode = useServerFn(decodePlaca);
  const [placa, setPlaca] = useState("");
  const mut = useMutation({
    mutationFn: async (p: string) => {
      const r = await decode({ data: { placa: p } });
      await saveHistorico("placa", p, r);
      return r;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Panel>
      <form onSubmit={(e) => { e.preventDefault(); if (placa.trim()) mut.mutate(placa.trim().toUpperCase()); }} className="flex gap-3">
        <Input placeholder="ABC1D23" value={placa} onChange={(e) => setPlaca(e.target.value)} maxLength={8} className="font-mono uppercase text-lg" />
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>
      {mut.data?.error && <NoticeWarn message={mut.data.error} />}
    </Panel>
  );
}

function VinSearch() {
  const decode = useServerFn(decodeVin);
  const navigate = useNavigate();
  const [vin, setVin] = useState("");
  const mut = useMutation({
    mutationFn: async (v: string) => {
      const r = await decode({ data: { vin: v } });
      await saveHistorico("vin", v, r);
      return r;
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const data = mut.data;

  return (
    <Panel>
      <form onSubmit={(e) => { e.preventDefault(); if (vin.trim()) mut.mutate(vin.trim().toUpperCase()); }} className="flex gap-3">
        <Input placeholder="Ex: 9BM9340F5EB012345" value={vin} onChange={(e) => setVin(e.target.value)} maxLength={17} className="font-mono uppercase text-lg" />
        <Button type="submit" disabled={mut.isPending || !vin.trim()}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {data && (data.error && !data.fabricante ? (
        <NoticeWarn message={data.error} title="Chassi não identificado" />
      ) : (
        <div className="mt-6 rounded-lg border border-border bg-surface p-5">
          <div className="mb-4 flex items-center gap-2 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Veículo identificado</span>
            <span className="ml-auto text-xs text-muted-foreground">fonte: {data.source}</span>
          </div>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 md:grid-cols-3">
            <Field label="VIN" value={data.vin} mono />
            <Field label="Fabricante" value={data.fabricante} />
            <Field label="Modelo" value={data.modelo} />
            <Field label="Ano" value={data.ano} />
            <Field label="Motor" value={data.motor} />
            <Field label="Combustível" value={data.combustivel} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => navigate({ to: "/catalogo/$vin", params: { vin: data.vin } })}>
              Abrir catálogo do veículo →
            </Button>
          </div>
        </div>
      ))}
    </Panel>
  );
}

function CodeSearch({ tipo, placeholder, fields }: { tipo: Tipo; placeholder: string; fields: string[] }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [lastTerm, setLastTerm] = useState("");
  const mut = useMutation({
    mutationFn: async (t: string) => {
      const like = `%${t.replace(/[%_]/g, "")}%`;
      const { data, error } = await supabase
        .from("pecas")
        .select("*")
        .or(fields.map((f) => `${f}.ilike.${like}`).join(","))
        .limit(50);
      if (error) throw error;
      await saveHistorico(tipo, t, { total: data?.length ?? 0 });
      return data ?? [];
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Panel>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = term.trim();
          if (v) { setLastTerm(v); mut.mutate(v); }
        }}
        className="flex gap-3"
      >
        <Input placeholder={placeholder} value={term} onChange={(e) => setTerm(e.target.value)} className="text-base" />
        <Button type="submit" disabled={mut.isPending || !term.trim()}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {mut.data && (
        mut.data.length === 0 ? (
          <SmartSearchFallback termo={lastTerm} onSaved={(id) => navigate({ to: "/peca/$id", params: { id } })} />
        ) : (
          <ResultList items={mut.data} onOpen={(id) => navigate({ to: "/peca/$id", params: { id } })} />
        )
      )}
    </Panel>
  );
}

function SmartSearchFallback({ termo, onSaved }: { termo: string; onSaved: (id: string) => void }) {
  const runSmart = useServerFn(smartSearchPart);
  const saveSmart = useServerFn(savePartFromSmartSearch);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  const search = useMutation({
    mutationFn: async () => runSmart({ data: { termo, tipo: "original" } }),
    onError: (e) => toast.error((e as Error).message),
  });

  const save = useMutation({
    mutationFn: async (c: SmartCandidate) => saveSmart({ data: { candidate: c, termo_original: termo } }),
    onSuccess: ({ id }) => {
      toast.success("Peça salva na base");
      onSaved(id);
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => setSavingIdx(null),
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="flex-1">
          <div className="font-medium text-warning">Não encontrei esse item na base de dados</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Nenhum registro corresponde a <span className="font-mono">{termo}</span> no catálogo interno.
            Use a Pesquisa Inteligente para consultar fontes públicas confiáveis (fabricantes, distribuidores, catálogos técnicos) sem inventar códigos.
          </div>
          {!search.data && (
            <Button size="sm" className="mt-3" onClick={() => search.mutate()} disabled={search.isPending}>
              {search.isPending
                ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pesquisando na internet…</>)
                : (<><Sparkles className="mr-2 h-4 w-4" /> Pesquisa Inteligente</>)}
            </Button>
          )}
        </div>
      </div>

      {search.data && search.data.candidatos.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
          Nenhuma referência pública encontrada.
        </div>
      )}

      {search.data && search.data.candidatos.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {search.data.candidatos.length} referência(s) encontrada(s) em fontes públicas — revise e escolha qual salvar. Nada é salvo automaticamente.
          </div>
          {search.data.candidatos.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm">{c.codigo_original ?? "sem código OEM"}</span>
                    <ConfiancaBadge nivel={c.fonte_confianca} />
                  </div>
                  <div className="mt-1 text-sm font-medium">{c.descricao}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {c.fabricante ?? "fabricante não informado"}
                    {c.categoria ? ` · ${c.categoria}` : ""}
                  </div>
                  {c.aplicacao && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="uppercase tracking-wide">Aplicações: </span>{c.aplicacao}
                    </div>
                  )}
                  {c.justificativa && (
                    <div className="mt-2 text-xs italic text-muted-foreground">{c.justificativa}</div>
                  )}
                  <a
                    href={c.fonte_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> {c.fonte_nome}
                  </a>
                </div>
                <Button
                  size="sm"
                  onClick={() => { setSavingIdx(i); save.mutate(c); }}
                  disabled={save.isPending}
                >
                  {savingIdx === i && save.isPending
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Save className="mr-2 h-4 w-4" />}
                  Salvar na Base
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfiancaBadge({ nivel }: { nivel: "alta" | "media" | "baixa" }) {
  const label = nivel === "alta" ? "Confiança alta" : nivel === "media" ? "Confiança média" : "Confiança baixa";
  const variant = nivel === "alta" ? "default" : nivel === "media" ? "secondary" : "outline";
  return <Badge variant={variant as never} className="text-[10px] uppercase tracking-wide">{label}</Badge>;
}

function ImageSearch() {
  const identify = useServerFn(identificarPecaPorImagem);
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mut = useMutation({
    mutationFn: async (dataUrl: string) => {
      const r = await identify({ data: { image_data_url: dataUrl } });
      await saveHistorico("imagem", r.keywords.join(", ") || "foto", { total: r.resultados.length });
      return r;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const onFile = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) { toast.error("Imagem muito grande (máx 4 MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setPreview(url);
      mut.mutate(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Panel>
      <div className="flex flex-col items-center gap-4">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-surface/40 p-10 transition hover:border-primary/50 hover:bg-surface"
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm font-medium">Enviar foto da peça</div>
            <div className="text-xs text-muted-foreground">JPG ou PNG, até 4 MB</div>
          </button>
        ) : (
          <div className="flex w-full flex-col items-center gap-3">
            <img src={preview} alt="peça" className="max-h-64 rounded-lg border border-border" />
            <Button variant="outline" size="sm" onClick={() => { setPreview(null); mut.reset(); }}>Trocar imagem</Button>
          </div>
        )}

        {mut.isPending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analisando com IA de visão…</div>}

        {mut.data && (
          <div className="w-full space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Descrição visual (IA)</div>
              <div className="mt-1 text-sm">{mut.data.description}</div>
            </div>
            {mut.data.resultados.length === 0 ? (
              <NoticeWarn
                title="Nenhuma peça correspondente no catálogo"
                message="A IA descreveu a imagem mas não achou correspondência no seu catálogo técnico. Nenhum código será sugerido por dedução."
              />
            ) : (
              <ResultList items={mut.data.resultados as never[]} onOpen={(id) => navigate({ to: "/peca/$id", params: { id } })} />
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

function ResultList({ items, onOpen }: { items: Array<Record<string, unknown>>; onOpen: (id: string) => void }) {
  return (
    <div className="mt-6 space-y-2">
      <div className="text-xs text-muted-foreground">{items.length} resultado(s) — todos vindos do catálogo interno</div>
      {items.map((p) => (
        <button
          key={String(p.id)}
          onClick={() => onOpen(String(p.id))}
          className="flex w-full items-center justify-between rounded-md border border-border bg-surface p-3 text-left transition hover:border-primary/40 hover:bg-surface/70"
        >
          <div>
            <div className="text-sm font-medium">{String(p.descricao ?? "—")}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{String(p.codigo_original ?? "sem código original")}</span>
              {p.fabricante ? <> · {String(p.fabricante)}</> : null}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">abrir ficha →</div>
        </button>
      ))}
    </div>
  );
}

function NoticeWarn({ title, message }: { title?: string; message: string }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div>
        {title && <div className="font-medium text-warning">{title}</div>}
        <div className="mt-1 text-sm text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`}>
        {value ?? <span className="text-muted-foreground italic">Não informado</span>}
      </div>
    </div>
  );
}
