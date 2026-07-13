import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, Truck, FileText, Search, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PartsLink AI Pro" }] }),
  component: Dashboard,
});

function useCount(table: "pecas" | "clientes" | "fornecedores" | "orcamentos" | "historico_buscas") {
  return useQuery({
    queryKey: ["count", table],
    queryFn: async () => {
      const { count, error } = await supabase.from(table as never).select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function Dashboard() {
  const pecas = useCount("pecas");
  const clientes = useCount("clientes");
  const fornecedores = useCount("fornecedores");
  const orcamentos = useCount("orcamentos");
  const buscas = useCount("historico_buscas");

  const cards = [
    { label: "Peças em estoque", value: pecas.data, icon: Package, color: "text-chart-1" },
    { label: "Clientes", value: clientes.data, icon: Users, color: "text-chart-2" },
    { label: "Fornecedores", value: fornecedores.data, icon: Truck, color: "text-chart-3" },
    { label: "Orçamentos", value: orcamentos.data, icon: FileText, color: "text-chart-4" },
    { label: "Buscas realizadas", value: buscas.data, icon: Search, color: "text-chart-5" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral da sua operação em tempo real."
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) => (
            <Card key={c.label} className="border-border/60 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {c.label}
                </CardTitle>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {c.value === undefined ? "—" : c.value.toLocaleString("pt-BR")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" /> Primeiros passos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li>1. Cadastre seus <strong className="text-foreground">fornecedores</strong> e <strong className="text-foreground">clientes</strong>.</li>
                <li>2. Importe ou cadastre suas <strong className="text-foreground">peças</strong> com código original.</li>
                <li>3. Use a <strong className="text-foreground">busca por VIN</strong> para identificar veículos automaticamente.</li>
                <li>4. Monte <strong className="text-foreground">orçamentos</strong> profissionais em segundos.</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Integrações</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Busca por VIN utiliza a base pública <strong className="text-foreground">NHTSA vPIC</strong>.
              </p>
              <p className="mt-2">
                Para dados de placa brasileira, códigos originais oficiais das
                montadoras (Scania, Volvo, MB, VW, DAF, Iveco…) e equivalências
                Tecfil/Mann/Mahle/Bosch, é necessário contratar as APIs
                correspondentes. O sistema jamais inventa códigos ou aplicações.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
