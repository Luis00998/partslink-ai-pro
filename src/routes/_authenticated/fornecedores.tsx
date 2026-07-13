import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, Truck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({ meta: [{ title: "Fornecedores — PartsLink AI Pro" }] }),
  component: FornecedoresPage,
});

type Forn = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  contato_comercial: string | null;
};

function FornecedoresPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Forn | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fornecedores").select("*").order("razao_social");
      if (error) throw error;
      return data as Forn[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: Partial<Forn>) => {
      const user = (await supabase.auth.getUser()).data.user!;
      if (editing) {
        const { error } = await supabase.from("fornecedores").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fornecedores").insert({ ...payload, owner_id: user.id, razao_social: payload.razao_social ?? "Sem nome" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atualizado" : "Criado");
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["fornecedores"] }); },
  });

  return (
    <>
      <PageHeader
        title="Fornecedores"
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo</Button></DialogTrigger>
            <FornForm editing={editing} onSubmit={(p) => saveMut.mutate(p)} pending={saveMut.isPending} />
          </Dialog>
        }
      />
      <PageBody>
        <Card className="border-border/60 shadow-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center">
                <Truck className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razão social</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.razao_social}<div className="text-xs text-muted-foreground">{r.nome_fantasia}</div></TableCell>
                      <TableCell className="font-mono text-xs">{r.cnpj ?? "—"}</TableCell>
                      <TableCell>{r.telefone ?? r.email ?? "—"}</TableCell>
                      <TableCell>{[r.cidade, r.estado].filter(Boolean).join("/") || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) delMut.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
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

function FornForm({ editing, onSubmit, pending }: { editing: Forn | null; onSubmit: (p: Partial<Forn>) => void; pending: boolean }) {
  const [form, setForm] = useState<Partial<Forn>>(editing ?? {});
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
        <div className="space-y-1"><Label>Razão social*</Label><Input required value={form.razao_social ?? ""} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Nome fantasia</Label><Input value={form.nome_fantasia ?? ""} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} /></div>
          <div className="space-y-1"><Label>CNPJ</Label><Input value={form.cnpj ?? ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1"><Label>Cidade</Label><Input value={form.cidade ?? ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
          <div className="space-y-1"><Label>UF</Label><Input maxLength={2} value={form.estado ?? ""} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></div>
        </div>
        <div className="space-y-1"><Label>Contato comercial</Label><Input value={form.contato_comercial ?? ""} onChange={(e) => setForm({ ...form, contato_comercial: e.target.value })} /></div>
        <DialogFooter><Button type="submit" disabled={pending}>{editing ? "Salvar" : "Criar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
