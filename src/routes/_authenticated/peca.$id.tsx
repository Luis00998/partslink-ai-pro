import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/peca/$id")({
  head: () => ({ meta: [{ title: "Ficha técnica — PartsLink AI Pro" }] }),
  component: PecaPage,
});

function PecaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["peca", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pecas").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (error || !data) return <div className="p-8 text-sm text-muted-foreground">Peça não encontrada.</div>;

  const preco = data.preco_venda
    ? Number(data.preco_venda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;

  return (
    <>
      <PageHeader
        title={data.descricao}
        description={data.categoria ?? "Ficha técnica da peça"}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/busca" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 shadow-card lg:col-span-1">
            <CardContent className="flex aspect-square items-center justify-center bg-surface/60 p-6">
              <div className="text-center text-muted-foreground">
                <Package className="mx-auto h-14 w-14" />
                <div className="mt-3 text-xs">Imagem oficial não disponível</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card lg:col-span-2">
            <CardContent className="p-6">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Código original" value={data.codigo_original} mono />
                <Field label="Código interno" value={data.codigo_interno} mono />
                <Field label="Código de barras" value={data.codigo_barras} mono />
                <Field label="Fabricante" value={data.fabricante} />
                <Field label="Categoria" value={data.categoria} />
                <Field label="Subcategoria" value={data.subcategoria} />
              </div>

              <div className="my-6 h-px bg-border" />

              <div className="space-y-4">
                <FieldBlock label="Aplicação" value={data.aplicacao} />
                <FieldBlock label="Observações técnicas" value={data.observacoes} />
              </div>

              <div className="my-6 h-px bg-border" />

              <div className="flex flex-wrap items-center gap-4">
                {preco && <div className="text-2xl font-semibold">{preco}</div>}
                <Badge variant={data.estoque > 0 ? "default" : "outline"}>
                  {data.estoque > 0 ? `${data.estoque} em estoque` : "Sem estoque"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card lg:col-span-3">
            <CardContent className="p-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Equivalências</h3>
              <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-warning">Nenhuma equivalência cadastrada nesta peça.</span>
                  {" "}O sistema NÃO gera equivalências por dedução (Tecfil, Mann, Mahle, Bosch, Donaldson, Fleetguard, etc.).
                  Cadastre equivalências manualmente ou conecte uma fonte oficial (TecDoc, catálogo do fabricante).
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
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

function FieldBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm">{value ?? <span className="text-muted-foreground italic">Não informado</span>}</div>
    </div>
  );
}
