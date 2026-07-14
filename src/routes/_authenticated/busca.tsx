import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/busca")({
  head: () => ({ meta: [{ title: "Buscar peça — PartsLink AI Pro" }] }),
  component: BuscaPage,
});

type Tipo = "placa" | "vin" | "original" | "fabricante" | "nome" | "imagem";

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
      <form onSubmit={(e) => { e.preventDefault(); if (term.trim()) mut.mutate(term.trim()); }} className="flex gap-3">
        <Input placeholder={placeholder} value={term} onChange={(e) => setTerm(e.target.value)} className="text-base" />
        <Button type="submit" disabled={mut.isPending || !term.trim()}>
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {mut.data && (
        mut.data.length === 0 ? (
          <NoticeWarn
            title="Não encontrei esse item na base de dados configurada"
            message="Nenhum registro corresponde ao termo pesquisado. Nenhuma equivalência será sugerida por dedução — cadastre a peça ou conecte uma fonte de dados oficial."
          />
        ) : (
          <ResultList items={mut.data} onOpen={(id) => navigate({ to: "/peca/$id", params: { id } })} />
        )
      )}
    </Panel>
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
