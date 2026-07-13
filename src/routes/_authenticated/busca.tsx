import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { decodeVin, decodePlaca } from "@/lib/vehicle-lookup.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/busca")({
  head: () => ({ meta: [{ title: "Busca de Peças — PartsLink AI Pro" }] }),
  component: BuscaPage,
});

function BuscaPage() {
  return (
    <>
      <PageHeader
        title="Busca de Peças"
        description="Identifique veículos por VIN ou placa e pesquise peças no seu catálogo."
      />
      <PageBody>
        <Tabs defaultValue="vin" className="max-w-4xl">
          <TabsList>
            <TabsTrigger value="vin">Por Chassi (VIN)</TabsTrigger>
            <TabsTrigger value="placa">Por Placa</TabsTrigger>
            <TabsTrigger value="codigo">Por Código / Nome</TabsTrigger>
          </TabsList>
          <TabsContent value="vin"><VinSearch /></TabsContent>
          <TabsContent value="placa"><PlacaSearch /></TabsContent>
          <TabsContent value="codigo"><CodeSearch /></TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

function VinSearch() {
  const decode = useServerFn(decodeVin);
  const [vin, setVin] = useState("");
  const mut = useMutation({
    mutationFn: async (v: string) => {
      const result = await decode({ data: { vin: v } });
      await supabase.from("historico_buscas").insert({
        tipo: "vin",
        termo: v,
        resultado: result as never,
        owner_id: (await supabase.auth.getUser()).data.user!.id,
      });
      return result;
    },
  });

  const data = mut.data;

  return (
    <Card className="mt-4 border-border/60 shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Consulta por Chassi (VIN)</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => { e.preventDefault(); if (vin.trim()) mut.mutate(vin.trim().toUpperCase()); }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor="vin">Número do chassi</Label>
            <Input
              id="vin"
              placeholder="Ex: 1HGCM82633A004352"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              maxLength={17}
              className="font-mono uppercase"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={mut.isPending || !vin.trim()} className="w-full sm:w-auto">
              {mut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Consultar
            </Button>
          </div>
        </form>

        {data && (
          <div className="mt-6 rounded-lg border border-border bg-surface p-5">
            {data.error && !data.fabricante ? (
              <div className="flex items-start gap-3 text-warning">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="font-medium">Informação não encontrada</div>
                  <div className="mt-1 text-sm text-muted-foreground">{data.error}</div>
                </div>
              </div>
            ) : (
              <>
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
                  <Field label="Cilindrada (L)" value={data.cilindrada} />
                  <Field label="Potência (HP)" value={data.potencia} />
                  <Field label="Combustível" value={data.combustivel} />
                  <Field label="Transmissão" value={data.transmissao} />
                  <Field label="Carroceria" value={data.cabine} />
                  <Field label="Tração" value={data.tracao} />
                  <Field label="País" value={data.pais} />
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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

function PlacaSearch() {
  const decode = useServerFn(decodePlaca);
  const [placa, setPlaca] = useState("");
  const mut = useMutation({ mutationFn: (p: string) => decode({ data: { placa: p } }) });

  return (
    <Card className="mt-4 border-border/60 shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Consulta por Placa</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => { e.preventDefault(); if (placa.trim()) mut.mutate(placa.trim().toUpperCase()); }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor="placa">Placa</Label>
            <Input id="placa" placeholder="ABC1D23" value={placa} onChange={(e) => setPlaca(e.target.value)} maxLength={8} className="font-mono uppercase" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Consultar
            </Button>
          </div>
        </form>
        {mut.data?.error && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-warning">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm text-muted-foreground">{mut.data.error}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CodeSearch() {
  const [term, setTerm] = useState("");
  const mut = useMutation({
    mutationFn: async (t: string) => {
      const { data, error } = await supabase
        .from("pecas")
        .select("*")
        .or(`codigo_original.ilike.%${t}%,codigo_interno.ilike.%${t}%,descricao.ilike.%${t}%`)
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card className="mt-4 border-border/60 shadow-card">
      <CardHeader>
        <CardTitle className="text-base">Busca no catálogo interno</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => { e.preventDefault(); if (term.trim()) mut.mutate(term.trim()); }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <Input placeholder="Código original, código interno ou descrição" value={term} onChange={(e) => setTerm(e.target.value)} />
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar
          </Button>
        </form>
        {mut.data && (
          <div className="mt-6 space-y-2">
            {mut.data.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma peça encontrada.</div>
            ) : (
              mut.data.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
                  <div>
                    <div className="text-sm font-medium">{p.descricao}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{p.codigo_original ?? "—"}</span> · {p.fabricante ?? "sem fabricante"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {p.preco_venda ? Number(p.preco_venda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">estoque: {p.estoque}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
