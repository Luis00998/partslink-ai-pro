import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { decodeVin } from "@/lib/vehicle-lookup.functions";
import { AlertCircle, Cog, Fuel, Wind, Snowflake, Droplet, Gauge, Disc, Settings, Package, Zap, Volume2, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/catalogo/$vin")({
  head: ({ params }) => ({ meta: [{ title: `Catálogo ${params.vin} — PartsLink AI Pro` }] }),
  component: CatalogoPage,
});

const SISTEMAS: Array<{ id: string; label: string; icon: React.ElementType; group: string }> = [
  { group: "Powertrain", id: "motor", label: "Motor", icon: Cog },
  { group: "Powertrain", id: "combustivel", label: "Sistema de combustível", icon: Fuel },
  { group: "Powertrain", id: "ar", label: "Sistema de ar / admissão", icon: Wind },
  { group: "Powertrain", id: "arrefecimento", label: "Arrefecimento", icon: Snowflake },
  { group: "Powertrain", id: "lubrificacao", label: "Lubrificação", icon: Droplet },
  { group: "Powertrain", id: "turbo", label: "Turbo", icon: Gauge },
  { group: "Transmissão", id: "embreagem", label: "Embreagem", icon: Disc },
  { group: "Transmissão", id: "transmissao", label: "Transmissão", icon: Settings },
  { group: "Transmissão", id: "cambio", label: "Caixa de câmbio", icon: Settings },
  { group: "Transmissão", id: "diferencial", label: "Diferencial", icon: Settings },
  { group: "Chassi", id: "freios", label: "Freios", icon: Disc },
  { group: "Chassi", id: "direcao", label: "Direção", icon: Settings },
  { group: "Chassi", id: "susp-diant", label: "Suspensão dianteira", icon: Settings },
  { group: "Chassi", id: "susp-tras", label: "Suspensão traseira", icon: Settings },
  { group: "Chassi", id: "eixos", label: "Eixos", icon: Settings },
  { group: "Chassi", id: "cubos", label: "Cubos", icon: Disc },
  { group: "Chassi", id: "chassi", label: "Chassi", icon: Package },
  { group: "Carroceria", id: "cabine", label: "Cabine", icon: Package },
  { group: "Carroceria", id: "tanques", label: "Tanques", icon: Package },
  { group: "Elétrico", id: "eletrico", label: "Sistema elétrico", icon: Zap },
  { group: "Elétrico", id: "ar-cond", label: "Ar condicionado", icon: Snowflake },
  { group: "Outros", id: "escapamento", label: "Escapamento", icon: Volume2 },
  { group: "Outros", id: "pneumatico", label: "Sistema pneumático", icon: Wind },
];

function CatalogoPage() {
  const { vin } = Route.useParams();
  const navigate = useNavigate();
  const decode = useServerFn(decodeVin);
  const { data, isLoading } = useQuery({
    queryKey: ["vin", vin],
    queryFn: () => decode({ data: { vin } }),
  });

  const groups = Array.from(new Set(SISTEMAS.map((s) => s.group)));

  return (
    <>
      <PageHeader
        title={data?.fabricante ? `${data.fabricante} ${data.modelo ?? ""}`.trim() : "Catálogo do veículo"}
        description={`Chassi ${vin} · ${data?.ano ?? "ano não informado"}${data?.motor ? " · motor " + data.motor : ""}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate({ to: "/busca" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Nova busca
          </Button>
        }
      />
      <PageBody>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Identificando veículo…
          </div>
        )}

        <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-warning">Diagramas técnicos ainda não conectados a uma fonte oficial.</span>
            {" "}Os grupos abaixo mostram a estrutura de navegação do catálogo. Para exibir peças reais por sistema é
            necessário conectar TecDoc, PartsLink24, catálogo eletrônico da montadora ou importar dados oficiais.
            O sistema não gerará peças por dedução.
          </div>
        </div>

        <div className="space-y-8">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{g}</h2>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {SISTEMAS.filter((s) => s.group === g).map((s) => (
                  <Card key={s.id} className="border-border/60 shadow-card transition hover:border-primary/40">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <s.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.label}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="px-1.5 py-0 text-[9px] uppercase">sem dados</Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageBody>
    </>
  );
}
