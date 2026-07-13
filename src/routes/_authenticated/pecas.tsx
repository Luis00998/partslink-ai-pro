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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pecas")({
  head: () => ({ meta: [{ title: "Peças / Estoque — PartsLink AI Pro" }] }),
  component: PecasPage,
});

type Peca = {
  id: string;
  codigo_original: string | null;
  codigo_interno: string | null;
  descricao: string;
  fabricante: string | null;
  categoria: string | null;
  aplicacao: string | null;
  preco_compra: number | null;
  preco_venda: number | null;
  estoque: number;
  estoque_minimo: number;
  localizacao: string | null;
};

const currency = (v: number | null | undefined) =>
  v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PecasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Peca | null>(null);
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["pecas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pecas").select("*").order("descricao");
      if (error) throw error;
      return data as Peca[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: Partial<Peca>) => {
      const user = (await supabase.auth.getUser()).data.user!;
      if (editing) {
        const { error } = await supabase.from("pecas").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pecas").insert({ ...payload, owner_id: user.id, descricao: payload.descricao ?? "Sem descrição" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Peça atualizada" : "Peça criada");
      qc.invalidateQueries({ queryKey: ["pecas"] });
      setOpen(false); setEditing(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pecas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["pecas"] }); },
  });

  const filtered = rows.filter((r) => {
    const s = search.toLowerCase();
    return !s || r.descricao.toLowerCase().includes(s) || (r.codigo_original ?? "").toLowerCase().includes(s) || (r.fabricante ?? "").toLowerCase().includes(s);
  });

  return (
    <>
      <PageHeader
        title="Peças & Estoque"
        description="Catálogo interno com códigos originais, preços e controle de estoque."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova peça</Button></DialogTrigger>
            <PecaForm editing={editing} onSubmit={(p) => saveMut.mutate(p)} pending={saveMut.isPending} />
          </Dialog>
        }
      />
      <PageBody>
        <div className="mb-4">
          <Input placeholder="Filtrar por descrição, código ou fabricante…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        </div>
        <Card className="border-border/60 shadow-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma peça encontrada.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Cód. original</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead className="text-right">Preço venda</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.descricao}<div className="text-xs text-muted-foreground">{p.categoria}</div></TableCell>
                      <TableCell className="font-mono text-xs">{p.codigo_original ?? "—"}</TableCell>
                      <TableCell>{p.fabricante ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{currency(p.preco_venda)}</TableCell>
                      <TableCell className="text-right">
                        {p.estoque <= p.estoque_minimo && p.estoque_minimo > 0 ? (
                          <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{p.estoque}</Badge>
                        ) : (
                          <span>{p.estoque}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) delMut.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
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

function PecaForm({ editing, onSubmit, pending }: { editing: Peca | null; onSubmit: (p: Partial<Peca>) => void; pending: boolean }) {
  const [form, setForm] = useState<Partial<Peca>>(editing ?? { estoque: 0, estoque_minimo: 0 });
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{editing ? "Editar peça" : "Nova peça"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
        <div className="space-y-1"><Label>Descrição*</Label><Input required value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Código original</Label><Input className="font-mono" value={form.codigo_original ?? ""} onChange={(e) => setForm({ ...form, codigo_original: e.target.value })} /></div>
          <div className="space-y-1"><Label>Código interno</Label><Input className="font-mono" value={form.codigo_interno ?? ""} onChange={(e) => setForm({ ...form, codigo_interno: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Fabricante</Label><Input value={form.fabricante ?? ""} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} /></div>
          <div className="space-y-1"><Label>Categoria</Label><Input value={form.categoria ?? ""} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Aplicação</Label><Textarea rows={2} value={form.aplicacao ?? ""} onChange={(e) => setForm({ ...form, aplicacao: e.target.value })} /></div>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1"><Label>Preço compra</Label><Input type="number" step="0.01" value={form.preco_compra ?? ""} onChange={(e) => setForm({ ...form, preco_compra: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="space-y-1"><Label>Preço venda</Label><Input type="number" step="0.01" value={form.preco_venda ?? ""} onChange={(e) => setForm({ ...form, preco_venda: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="space-y-1"><Label>Estoque</Label><Input type="number" value={form.estoque ?? 0} onChange={(e) => setForm({ ...form, estoque: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label>Estoque mín.</Label><Input type="number" value={form.estoque_minimo ?? 0} onChange={(e) => setForm({ ...form, estoque_minimo: Number(e.target.value) })} /></div>
        </div>
        <div className="space-y-1"><Label>Localização</Label><Input value={form.localizacao ?? ""} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></div>
        <DialogFooter><Button type="submit" disabled={pending}>{editing ? "Salvar" : "Criar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
