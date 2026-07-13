import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — PartsLink AI Pro" }] }),
  component: ClientesPage,
});

type Cliente = {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
};

function ClientesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("nome");
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: Partial<Cliente>) => {
      const user = (await supabase.auth.getUser()).data.user!;
      if (editing) {
        const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clientes").insert({ ...payload, owner_id: user.id, nome: payload.nome ?? "Sem nome" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Cliente atualizado" : "Cliente criado");
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Gerencie seus clientes e histórico de compras."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo cliente</Button>
            </DialogTrigger>
            <ClienteForm editing={editing} onSubmit={(p) => saveMut.mutate(p)} pending={saveMut.isPending} />
          </Dialog>
        }
      />
      <PageBody>
        <Card className="border-border/60 shadow-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : clientes.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{c.documento ?? "—"}</TableCell>
                      <TableCell>{c.telefone ?? "—"}</TableCell>
                      <TableCell>{[c.cidade, c.estado].filter(Boolean).join("/") || "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) delMut.mutate(c.id); }}>
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

function ClienteForm({ editing, onSubmit, pending }: { editing: Cliente | null; onSubmit: (p: Partial<Cliente>) => void; pending: boolean }) {
  const [form, setForm] = useState<Partial<Cliente>>(editing ?? {});
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
        className="space-y-3"
      >
        <div className="space-y-1"><Label>Nome*</Label><Input required value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>CPF/CNPJ</Label><Input value={form.documento ?? ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
          <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1"><Label>Cidade</Label><Input value={form.cidade ?? ""} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
          <div className="space-y-1"><Label>UF</Label><Input maxLength={2} value={form.estado ?? ""} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></div>
        </div>
        <div className="space-y-1"><Label>Observações</Label><Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        <DialogFooter>
          <Button type="submit" disabled={pending}>{editing ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
