import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — PartsLink AI Pro" }] }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["historico"],
    queryFn: async () => {
      const { data, error } = await supabase.from("historico_buscas").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader title="Histórico de buscas" description="Últimas 200 consultas realizadas." />
      <PageBody>
        <Card className="border-border/60 shadow-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center">
                <History className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma busca ainda.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase text-[10px]">{r.tipo}</Badge>
                        <span className="font-mono text-sm">{r.termo}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
