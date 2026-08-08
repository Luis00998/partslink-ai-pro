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
import { smartSearchPart } from "@/lib/smart-search.functions";
import { buscarPecasCatalogo } from "@/lib/catalog.functions";
import { CandidateCard } from "@/components/candidate-card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

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

const FONTE_LABEL: Record<string, string> = {
  banco_local: "Banco local",
  api_vin: "NHTSA vPIC",
  "NHTSA vPIC": "NHTSA vPIC",
};

function SourceBadge({ source }: { source: string }) {
  const label = FONTE_LABEL[source] ?? source;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success">
      <CheckCircle2 className="h-3 w-3" /> {label}
    </span>
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
      <div className="mb-4 flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">Identificação do veículo</h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (vin.trim()) mut.mutate(vin.trim().toUpperCase());
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Input
          placeholder="Ex: 9BM9340F5EB012345"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          maxLength={17}
          className="h-14 flex-1 border-border/80 bg-surface-2/60 font-mono text-xl uppercase tracking-[0.12em] transition focus-visible:border-primary/60"
        />
        <Button
          type="submit"
          size="lg"
          className="h-14 px-6 sm:w-52"
          disabled={mut.isPending || !vin.trim()}
        >
          {mut.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Consultando chassi…
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" /> Identificar veículo
            </>
          )}
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        Consulta oficial NHTSA vPIC executada apenas para chassis ainda desconhecidos — o veículo já
        cadastrado responde instantaneamente pelo banco.
      </p>

      {mut.isPending && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border/60 bg-surface" />
          ))}
        </div>
      )}

      {data &&
        (data.error && !data.fabricante ? (
          <NoticeWarn message={data.error} title="Chassi não identificado" />
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            <div className="flex flex-wrap items-center gap-3 border-b border-border/70 bg-surface-2/50 px-5 py-3.5">
              <Car className="h-4 w-4 text-primary" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {[data.marca, data.modelo].filter(Boolean).join(" ") || "Veículo identificado"}
                  {data.ano ? <span className="text-muted-foreground"> · {data.ano}</span> : null}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">{data.vin}</div>
              </div>
              <div className="ml-auto">
                <SourceBadge source={data.source} />
              </div>
            </div>

            <div className="grid gap-px bg-border/50 sm:grid-cols-2 lg:grid-cols-4">
              <Cell label="Marca" value={data.marca} />
              <Cell label="Modelo" value={data.modelo} />
              <Cell label="Ano" value={data.ano} />
              <Cell label="Versão" value={data.versao} />
              <Cell label="Motor" value={data.motor} />
              <Cell label="Combustível" value={data.combustivel} />
              <Cell label="Câmbio" value={data.transmissao} />
              <Cell label="Tração" value={data.tracao} />
              <Cell label="Cilindrada" value={data.cilindrada} />
              <Cell label="Cilindros" value={data.cilindros} />
              <Cell label="Carroceria" value={data.cabine} />
              <Cell label="Fabricante" value={data.fabricante} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-3.5">
              <span className="text-xs text-muted-foreground">
                {data.pais ? `Planta: ${data.pais}` : "Origem não informada"}
              </span>
              <Button onClick={() => navigate({ to: "/catalogo/$vin", params: { vin: data.vin } })}>
                Abrir catálogo técnico do veículo →
              </Button>
            </div>
          </div>
        ))}
    </Panel>
  );
}

function Cell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="bg-surface px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm" title={value ?? undefined}>
        {value ?? <span className="italic text-muted-foreground">Não informado</span>}
      </div>
    </div>
  );
}


function CodeSearch({ tipo, placeholder }: { tipo: Tipo; placeholder: string; fields?: string[] }) {
  const navigate = useNavigate();
  const buscar = useServerFn(buscarPecasCatalogo);
  const [term, setTerm] = useState("");
  const [lastTerm, setLastTerm] = useState("");
  const mut = useMutation({
    mutationFn: async (t: string) => {
      // Pesquisa unificada: OEM, interno, paralelo, descrição, marca, fabricante,
      // categoria, aplicação, motores e chassis — tolera acento, caixa e digitação.
      const { resultados } = await buscar({ data: { termo: t, limite: 50 } });
      await saveHistorico(tipo, t, { total: resultados.length });
      return resultados as unknown as Array<Record<string, unknown>>;
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
          <ResultList items={mut.data as Array<Record<string, unknown>>} onOpen={(id) => navigate({ to: "/peca/$id", params: { id } })} />
        )
      )}
    </Panel>
  );
}

function SmartSearchFallback({ termo, onSaved }: { termo: string; onSaved: (id: string) => void }) {
  const runSmart = useServerFn(smartSearchPart);

  const search = useMutation({
    mutationFn: async () => {
      console.log(`[SmartSearch][client] auto-triggering fallback for termo="${termo}"`);
      return runSmart({ data: { termo, tipo: "original" } });
    },
    onSuccess: (r) => {
      console.log(`[SmartSearch][client] result candidatos=${r.candidatos.length} fontes=${r.fontes_consultadas.length}`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // Auto-dispara a pesquisa externa assim que o fallback aparece.
  useEffect(() => {
    if (!termo) return;
    search.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);


  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="flex-1">
          <div className="font-medium text-warning">Não encontrei esse item na base interna</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Nenhum registro corresponde a <span className="font-mono">{termo}</span> no catálogo interno.
            Consultando automaticamente fontes públicas (Firecrawl + Tavily) — sem inventar códigos.
          </div>
          {search.isPending && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Pesquisando na internet…
            </div>
          )}
          {!search.isPending && search.data && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => search.mutate()}>
              <Sparkles className="mr-2 h-4 w-4" /> Pesquisar novamente
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
            {search.data.candidatos.length} referência(s) encontrada(s) em fontes públicas — a peça foi identificada externamente.
          </div>
          {search.data.candidatos.map((c, i) => (
            <CandidateCard key={`${c.codigo_original ?? c.descricao}-${i}`} candidate={c} termo={termo} onSaved={onSaved} />
          ))}
        </div>
      )}
    </div>
  );
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
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {items.length} resultado(s) no catálogo técnico
        </div>
        <SourceBadge source="Banco local" />
      </div>

      {items.map((p) => {
        const oem = str(p.codigo_original);
        const interno = str(p.codigo_interno);
        const paralelo = str(p.codigo_paralelo);
        const equivalencias = Array.isArray(p.equivalencias) ? p.equivalencias.length : 0;
        return (
          <button
            key={String(p.id)}
            onClick={() => onOpen(String(p.id))}
            className="group flex w-full items-start gap-4 rounded-xl border border-border bg-surface p-4 text-left transition hover:border-primary/50 hover:bg-surface-2/60 hover:shadow-card"
          >
            {str(p.imagem_url) ? (
              <img
                src={String(p.imagem_url)}
                alt={String(p.descricao ?? "peça")}
                loading="lazy"
                className="h-14 w-14 shrink-0 rounded-lg border border-border/70 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-surface-2/50">
                <Wrench className="h-5 w-5 text-muted-foreground" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {oem && (
                  <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                    {oem}
                  </span>
                )}
                {str(p.marca) && (
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {String(p.marca)}
                  </span>
                )}
              </div>

              <div className="mt-1.5 truncate text-sm font-medium">{String(p.descricao ?? "—")}</div>

              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {interno && <span className="font-mono">Interno: {interno}</span>}
                {paralelo && <span className="font-mono">Paralelo: {paralelo}</span>}
                {str(p.fabricante) && <span>{String(p.fabricante)}</span>}
                {str(p.categoria) && <span>{String(p.categoria)}</span>}
                {equivalencias > 0 && <span>{equivalencias} equivalência(s)</span>}
              </div>

              {str(p.aplicacao) && (
                <div className="mt-1.5 truncate text-xs text-muted-foreground/80">
                  Aplicação: {String(p.aplicacao)}
                </div>
              )}
            </div>

            <span className="shrink-0 self-center text-xs text-muted-foreground transition group-hover:text-primary">
              ficha técnica →
            </span>
          </button>
        );
      })}
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
