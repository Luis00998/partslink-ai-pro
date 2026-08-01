import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, AlertCircle, Loader2, Copy, Share2, Star, FileDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/busca" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(data.codigo_original || "");
              toast.success("OEM copiado!");
            }}>
              <Copy className="mr-2 h-4 w-4" /> Copiar OEM
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info("Funcionalidade em desenvolvimento")}>
              <Star className="mr-2 h-4 w-4" /> Favoritar
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <FileDown className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 shadow-card lg:col-span-1">
            <CardContent className="p-0 overflow-hidden bg-surface/60 aspect-square flex flex-col items-center justify-center">
              {data.imagem_url ? (
                <img src={data.imagem_url} alt={data.descricao} className="h-full w-full object-contain p-4 transition-transform hover:scale-110 cursor-zoom-in" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <Package className="mx-auto h-14 w-14" />
                  <div className="mt-3 text-xs">Imagem indisponível</div>
                </div>
              )}
            </CardContent>
            {data.imagens_adicionais && (data.imagens_adicionais as string[]).length > 0 && (
              <div className="p-4 flex gap-2 overflow-x-auto border-t border-border">
                {(data.imagens_adicionais as string[]).map((img, idx) => (
                   <img key={idx} src={img} className="h-12 w-12 object-cover rounded border border-border cursor-pointer hover:border-primary" />
                ))}
              </div>
            )}
          </Card>

          <Card className="border-border/60 shadow-card lg:col-span-2">
            <CardContent className="p-6">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Código original" value={data.codigo_original} mono />
                <Field label="Código interno" value={data.codigo_interno} mono />
                <Field label="Código paralelo" value={data.codigo_paralelo} mono />
                <Field label="Código de barras" value={data.codigo_barras} mono />
                <Field label="Marca" value={data.marca} />
                <Field label="Fabricante" value={data.fabricante} />
                <Field label="Categoria" value={data.categoria} />
                <Field label="Subcategoria" value={data.subcategoria} />
                <Field label="Motores" value={data.motores_compativeis} />
                <Field label="Chassis" value={data.chassis_compativeis} />
                <Field label="Anos" value={data.ano_inicial ? `${data.ano_inicial} - ${data.ano_final ?? "Atual"}` : null} />
              </div>

              <div className="my-6 h-px bg-border" />

              <div className="space-y-4">
                <FieldBlock label="Aplicação" value={data.aplicacao} />
                <FieldBlock label="Observações técnicas" value={data.observacoes} />
              </div>

              <div className="my-6 h-px bg-border" />

              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Torque" value={data.torque} />
                <Field label="Qtd por veículo" value={data.quantidade_por_veiculo} />
                <Field label="Tipo de óleo" value={data.tipo_oleo} />
                <Field label="Qtd de óleo" value={data.quantidade_oleo} />
                <Field label="Líquido arrefecimento" value={data.liquido_arrefecimento} />
                <Field label="Tempo estimado" value={data.tempo_estimado} />
              </div>

              <div className="my-6 h-px bg-border" />

              <div className="space-y-4">
                <FieldBlock label="Ferramentas necessárias" value={data.ferramentas_necessarias} />
                <FieldBlock label="Procedimentos técnicos" value={data.procedimentos_tecnicos} />
                <FieldBlock label="Fonte" value={data.fonte_url ? `${data.fonte_nome ?? "Web"} (${data.fonte_url})` : null} />
              </div>

              <div className="my-6 h-px bg-border" />

              <div className="flex flex-wrap items-center gap-4">
                {preco && <div className="text-2xl font-semibold">{preco}</div>}
                <Badge variant={data.estoque > 0 ? "default" : "outline"}>
                  {data.estoque > 0 ? `${data.estoque} em estoque` : "Sem estoque"}
                </Badge>
                {data.fonte_confianca && (
                  <Badge variant="secondary" className="uppercase tracking-wide">
                    Confiança: {data.fonte_confianca}
                  </Badge>
                )}
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
