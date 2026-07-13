import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

export const Route = createFileRoute("/_authenticated/orcamentos/$id")({
  head: () => ({ meta: [{ title: "Orçamento — PartsLink AI Pro" }] }),
  component: OrcamentoDetail,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function OrcamentoDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data: orc } = useQuery({
    queryKey: ["orcamento", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orcamentos").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: itens = [] } = useQuery({
    queryKey: ["orcamento-itens", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orcamento_itens").select("*").eq("orcamento_id", id).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select"],
    queryFn: async () => {
      const { data } = await supabase.from("clientes").select("id, nome").order("nome");
      return data ?? [];
    },
  });

  const [form, setForm] = useState({ cliente_nome: "", veiculo_info: "", observacoes: "", mao_de_obra: 0, desconto: 0, frete: 0 });
  useMemo(() => {
    if (orc) setForm({
      cliente_nome: orc.cliente_nome ?? "",
      veiculo_info: orc.veiculo_info ?? "",
      observacoes: orc.observacoes ?? "",
      mao_de_obra: Number(orc.mao_de_obra) || 0,
      desconto: Number(orc.desconto) || 0,
      frete: Number(orc.frete) || 0,
    });
  }, [orc]);

  const subtotal = itens.reduce((s, it) => s + Number(it.subtotal), 0);
  const total = subtotal + Number(form.mao_de_obra) + Number(form.frete) - Number(form.desconto);

  const saveHeader = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orcamentos").update({ ...form, total }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orcamento", id] }); qc.invalidateQueries({ queryKey: ["orcamentos"] }); toast.success("Orçamento salvo"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const [novoItem, setNovoItem] = useState({ descricao: "", codigo: "", quantidade: 1, preco_unitario: 0 });
  const addItem = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user!;
      const sub = Number(novoItem.quantidade) * Number(novoItem.preco_unitario);
      const { error } = await supabase.from("orcamento_itens").insert({
        orcamento_id: id, owner_id: user.id, ...novoItem, subtotal: sub,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orcamento-itens", id] }); setNovoItem({ descricao: "", codigo: "", quantidade: 1, preco_unitario: 0 }); },
  });

  const delItem = useMutation({
    mutationFn: async (itemId: string) => { const { error } = await supabase.from("orcamento_itens").delete().eq("id", itemId); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orcamento-itens", id] }),
  });

  const generatePdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Orçamento", 14, 20);
    doc.setFontSize(10);
    doc.text(`Nº: ${String(orc?.numero ?? "").padStart(5, "0")}`, 14, 30);
    doc.text(`Cliente: ${form.cliente_nome || "-"}`, 14, 36);
    doc.text(`Veículo: ${form.veiculo_info || "-"}`, 14, 42);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 48);
    let y = 60;
    doc.setFontSize(11); doc.text("Itens", 14, y); y += 6;
    doc.setFontSize(9);
    itens.forEach((it) => {
      const line = `${it.quantidade}x ${it.descricao} — ${brl(Number(it.subtotal))}`;
      doc.text(line, 14, y); y += 5;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 6;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${brl(subtotal)}`, 14, y); y += 5;
    doc.text(`Mão de obra: ${brl(Number(form.mao_de_obra))}`, 14, y); y += 5;
    doc.text(`Frete: ${brl(Number(form.frete))}`, 14, y); y += 5;
    doc.text(`Desconto: -${brl(Number(form.desconto))}`, 14, y); y += 5;
    doc.setFontSize(12); doc.text(`Total: ${brl(total)}`, 14, y + 3);
    doc.save(`orcamento-${orc?.numero ?? id}.pdf`);
  };

  return (
    <>
      <PageHeader
        title={`Orçamento #${String(orc?.numero ?? "").padStart(5, "0")}`}
        actions={
          <>
            <Link to="/orcamentos"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button></Link>
            <Button variant="outline" onClick={generatePdf}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
            <Button onClick={() => saveHeader.mutate()} disabled={saveHeader.isPending}>
              {saveHeader.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 shadow-card lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Cliente & Veículo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cliente</Label>
                  <Input list="cli-list" value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} placeholder="Nome do cliente" />
                  <datalist id="cli-list">{clientes.map((c) => <option key={c.id} value={c.nome} />)}</datalist>
                </div>
                <div className="space-y-1"><Label>Veículo</Label><Input value={form.veiculo_info} onChange={(e) => setForm({ ...form, veiculo_info: e.target.value })} placeholder="Ex: Scania R450 2018" /></div>
              </div>
              <div className="space-y-1"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader><CardTitle className="text-base">Totais</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Row label="Subtotal" value={brl(subtotal)} />
              <div className="space-y-1"><Label className="text-xs">Mão de obra</Label><Input type="number" step="0.01" value={form.mao_de_obra} onChange={(e) => setForm({ ...form, mao_de_obra: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Frete</Label><Input type="number" step="0.01" value={form.frete} onChange={(e) => setForm({ ...form, frete: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Desconto</Label><Input type="number" step="0.01" value={form.desconto} onChange={(e) => setForm({ ...form, desconto: Number(e.target.value) })} /></div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">{brl(total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-border/60 shadow-card">
          <CardHeader><CardTitle className="text-base">Itens</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); if (novoItem.descricao) addItem.mutate(); }}
              className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr_80px_120px_auto]"
            >
              <Input placeholder="Descrição*" required value={novoItem.descricao} onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })} />
              <Input placeholder="Código" className="font-mono" value={novoItem.codigo} onChange={(e) => setNovoItem({ ...novoItem, codigo: e.target.value })} />
              <Input type="number" min={1} value={novoItem.quantidade} onChange={(e) => setNovoItem({ ...novoItem, quantidade: Number(e.target.value) })} />
              <Input type="number" step="0.01" placeholder="Preço" value={novoItem.preco_unitario} onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: Number(e.target.value) })} />
              <Button type="submit"><Plus className="h-4 w-4" /></Button>
            </form>

            {itens.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Nenhum item.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.descricao}</TableCell>
                      <TableCell className="font-mono text-xs">{it.codigo ?? "—"}</TableCell>
                      <TableCell className="text-right">{it.quantidade}</TableCell>
                      <TableCell className="text-right">{brl(Number(it.preco_unitario))}</TableCell>
                      <TableCell className="text-right font-medium">{brl(Number(it.subtotal))}</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => delItem.mutate(it.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
