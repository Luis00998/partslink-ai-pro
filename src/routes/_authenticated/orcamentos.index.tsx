import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/orcamentos/")({
  head: () => ({ meta: [{ title: "Orçamentos — PartsLink AI Pro" }] }),
  component: OrcamentosPage,
});

type Orc = {
  id: string;
  numero: number;
  cliente_nome: string | null;
  veiculo_info: string | null;
  status: string;
  total: number;
  created_at: string;
};

function OrcamentosPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["orcamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orcamentos").select("id, numero, cliente_nome, veiculo_info, status, total, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Orc[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user!;
      const { data, error } = await supabase.from("orcamentos").insert({ owner_id: user.id, status: "aberto" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orcamentos"] }); toast.success("Orçamento criado"); setCreating(false); },
    onError: (e) => { toast.error((e as Error).message); setCreating(false); },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orcamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orcamentos"] }); toast.success("Removido"); },
  });

  return (
    <>
      <PageHeader
        title="Orçamentos"
        description="Crie e acompanhe orçamentos para seus clientes."
        actions={
          <Button onClick={() => { setCreating(true); createMut.mutate(); }} disabled={creating}>
            <Plus className="mr-2 h-4 w-4" /> Novo orçamento
          </Button>
        }
      />
      <PageBody>
        <Card className="border-border/60 shadow-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum orçamento ainda.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono">#{String(o.numero).padStart(5, "0")}</TableCell>
                      <TableCell>{o.cliente_nome ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.veiculo_info ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">
                        {Number(o.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Link to="/orcamentos/$id" params={{ id: o.id }}>
                            <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                          </Link>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) delMut.mutate(o.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
