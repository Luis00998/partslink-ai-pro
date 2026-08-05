import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { decodeVin } from "@/lib/vehicle-lookup.functions";
import { chatWithPartsAI } from "@/lib/parts-ai.functions";
import { listarSistemas, buscarDiagramasVeiculo, obterItensDiagrama, obterDiagrama } from "@/lib/diagrams.functions";
import { obterRelacionamentosPeca } from "@/lib/catalog.functions";
import { CandidateCard } from "@/components/candidate-card";
import type { SmartCandidate } from "@/lib/smart-search.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, BookOpen, LayoutGrid, Package, GitCompare, Sparkles, History,
  Star, Settings as SettingsIcon, Layers, ArrowLeft, ChevronRight, ChevronDown,
  AlertCircle, Loader2, Send, User, Truck, PanelRightClose, PanelRightOpen,
  X, Info,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/catalogo/$vin")({
  head: ({ params }) => ({ meta: [{ title: `Workspace ${params.vin} — PartsLink AI Pro` }] }),
  component: WorkspacePage,
});

// -----------------------------------------------------------------------------
// Estrutura de catálogo (árvore). Sem peças reais — placeholders honestos.
// -----------------------------------------------------------------------------
type CatNode = { id: string; label: string; sistemaId?: string; diagramaId?: string; pecaId?: string | null };

const SECTIONS = [
  { id: "pesquisa", label: "Pesquisa", icon: Search },
  { id: "catalogo", label: "Catálogo", icon: BookOpen },
  { id: "diagramas", label: "Diagramas", icon: LayoutGrid },
  { id: "pecas", label: "Peças", icon: Package },
  { id: "equivalencias", label: "Equivalências", icon: GitCompare },
  { id: "parts-ai", label: "Parts AI", icon: Sparkles },
  { id: "historico", label: "Histórico", icon: History },
  { id: "favoritos", label: "Favoritos", icon: Star },
  { id: "config", label: "Configurações", icon: SettingsIcon },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// -----------------------------------------------------------------------------

function WorkspacePage() {
  const { vin } = Route.useParams();
  const navigate = useNavigate();
  const decode = useServerFn(decodeVin);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vin", vin],
    queryFn: () => decode({ data: { vin } }),
  });

  const [section, setSection] = useState<SectionId>("catalogo");
  const [selectedNode, setSelectedNode] = useState<CatNode | null>(null);
  const [selectedPart, setSelectedPart] = useState<CatNode | null>(null);
  const [aiOpen, setAiOpen] = useState(true);

  const title = vehicle?.fabricante
    ? `${vehicle.fabricante} ${vehicle.modelo ?? ""}`.trim()
    : "Veículo";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* LEFT RAIL — workspace nav */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
            <Layers className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold leading-tight">PartsLink</div>
            <div className="text-[9px] uppercase tracking-widest text-primary">AI Pro</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "group mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent",
                section === s.id && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              )}
            >
              <s.icon className={cn("h-4 w-4", section === s.id ? "text-primary" : "text-muted-foreground")} />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate({ to: "/busca" })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Nova busca
          </Button>
        </div>
      </aside>

      {/* MAIN COLUMN */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top vehicle header */}
        <VehicleHeader vin={vin} vehicle={vehicle} isLoading={isLoading} title={title} />

        {/* Body: contextual section */}
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 overflow-hidden">
            {section === "catalogo" || section === "diagramas" ? (
              <CatalogView
                vehicle={{ marca: vehicle?.fabricante ?? null, modelo: vehicle?.modelo ?? null, ano: Number(vehicle?.ano) || null, motor: vehicle?.motor ?? null }}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                onSelectPart={(p) => setSelectedPart(p)}
              />
            ) : section === "pesquisa" ? (
              <PesquisaView />
            ) : section === "pecas" ? (
              <EmptyPanel
                icon={Package}
                title="Peças deste veículo"
                message="Nenhuma peça vinculada a este chassi na base configurada. Conecte TecDoc/PartsLink24 ou importe o catálogo OEM para listar peças reais."
              />
            ) : section === "equivalencias" ? (
              <EmptyPanel
                icon={GitCompare}
                title="Equivalências"
                message="Sem fonte de equivalências conectada. O sistema não sugere equivalências por dedução — cadastre manualmente ou conecte um catálogo oficial."
              />
            ) : section === "parts-ai" ? (
              <EmptyPanel
                icon={Sparkles}
                title="Parts AI"
                message="O assistente está sempre disponível no painel lateral direito."
              />
            ) : section === "historico" ? (
              <HistoricoLink />
            ) : section === "favoritos" ? (
              <EmptyPanel icon={Star} title="Favoritos" message="Você ainda não marcou peças ou diagramas como favoritos." />
            ) : (
              <EmptyPanel icon={SettingsIcon} title="Configurações" message="Preferências do workspace estarão aqui em breve." />
            )}

            {/* Part detail slide panel */}
            {selectedPart && (
              <PartDetailPanel node={selectedPart} onClose={() => setSelectedPart(null)} />
            )}
          </div>

          {/* Right: Parts AI dock */}
          {aiOpen ? (
            <PartsAIDock
              context={{ vehicle: title, vin, node: selectedNode?.label, part: selectedPart?.label }}
              onClose={() => setAiOpen(false)}
            />
          ) : (
            <button
              onClick={() => setAiOpen(true)}
              className="flex w-10 shrink-0 flex-col items-center justify-center gap-2 border-l border-border bg-sidebar text-muted-foreground transition hover:text-foreground"
              title="Abrir Parts AI"
            >
              <PanelRightOpen className="h-4 w-4" />
              <div className="rotate-180 text-[10px] uppercase tracking-widest [writing-mode:vertical-rl]">Parts AI</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

function VehicleHeader({
  vin, vehicle, isLoading, title,
}: {
  vin: string;
  vehicle: Awaited<ReturnType<typeof decodeVin>> | undefined;
  isLoading: boolean;
  title: string;
}) {
  return (
    <header className="flex shrink-0 items-stretch gap-4 border-b border-border bg-gradient-surface px-6 py-4">
      <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-surface/60">
        <Truck className="h-10 w-10 text-muted-foreground" strokeWidth={1.25} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-primary">Veículo identificado</div>
            <h1 className="mt-0.5 truncate text-xl font-semibold">
              {isLoading ? "Identificando…" : title}
              {vehicle?.ano ? <span className="ml-2 text-muted-foreground font-normal">{vehicle.ano}</span> : null}
            </h1>
          </div>
          {vehicle?.source && (
            <Badge variant="outline" className="shrink-0 text-[10px]">fonte: {vehicle.source}</Badge>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
          <Spec label="VIN" value={vin} mono />
          <Spec label="Motor" value={vehicle?.motor} />
          <Spec label="Transmissão" value={vehicle?.transmissao} />
          <Spec label="Tração" value={vehicle?.tracao} />
        </div>
      </div>
    </header>
  );
}

function Spec({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("truncate", mono && "font-mono")}>{value ?? <span className="italic text-muted-foreground">—</span>}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Catálogo em árvore + área central de diagrama
// -----------------------------------------------------------------------------

type VehicleRef = { marca: string | null; modelo: string | null; ano: number | null; motor: string | null };

function CatalogView({
  vehicle, selectedNode, onSelectNode, onSelectPart,
}: {
  vehicle: VehicleRef;
  selectedNode: CatNode | null;
  onSelectNode: (n: CatNode | null) => void;
  onSelectPart: (p: CatNode) => void;
}) {
  const sistemasFn = useServerFn(listarSistemas);
  const diagramasFn = useServerFn(buscarDiagramasVeiculo);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: sistemas = [], isLoading: loadingSistemas } = useQuery({
    queryKey: ["sistemas"],
    queryFn: () => sistemasFn(),
  });

  const { data: diagramas = [], isLoading: loadingDiagramas } = useQuery({
    queryKey: ["diagramas-veiculo", vehicle.marca, vehicle.modelo, vehicle.ano, vehicle.motor],
    enabled: Boolean(vehicle.marca && vehicle.modelo),
    queryFn: () =>
      diagramasFn({
        data: {
          marca: vehicle.marca as string,
          modelo: vehicle.modelo as string,
          ...(vehicle.ano ? { ano: vehicle.ano } : {}),
        },
      }),
  });

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  return (
    <>
      {/* Tree — sistemas reais do catálogo + diagramas do veículo */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border bg-surface/30">
        <div className="border-b border-border px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Catálogo técnico</div>
          <div className="mt-0.5 text-sm">Sistemas e conjuntos</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loadingSistemas && (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando sistemas…
            </div>
          )}
          {sistemas.map((sistema) => {
            const isOpen = expanded.has(sistema.id);
            const doSistema = diagramas.filter((d) => d.sistema_nome === sistema.nome);
            return (
              <div key={sistema.id} className="mb-0.5">
                <button
                  onClick={() => toggle(sistema.id)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface"
                >
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="flex-1 font-medium">{sistema.nome}</span>
                  {doSistema.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{doSistema.length}</span>
                  )}
                </button>
                {isOpen && (
                  <div className="ml-4 border-l border-border/60 pl-2">
                    {doSistema.length === 0 ? (
                      <div className="px-2 py-1 text-[11px] italic text-muted-foreground">
                        {loadingDiagramas ? "Carregando…" : "Nenhum diagrama cadastrado"}
                      </div>
                    ) : (
                      doSistema.map((d) => (
                        <button
                          key={d.diagrama_id}
                          onClick={() => onSelectNode({ id: d.diagrama_id, label: d.nome_diagrama, sistemaId: sistema.id, diagramaId: d.diagrama_id })}
                          className={cn(
                            "block w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition hover:bg-surface hover:text-foreground",
                            selectedNode?.diagramaId === d.diagrama_id && "bg-primary/10 text-foreground",
                          )}
                        >
                          {d.nome_diagrama}
                          {d.total_itens ? <span className="ml-1 text-[10px]">({d.total_itens} itens)</span> : null}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Diagram area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Diagrama</div>
            <div className="mt-0.5 truncate text-sm font-medium">
              {selectedNode ? selectedNode.label : "Selecione um sistema à esquerda"}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedNode?.diagramaId ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <LayoutGrid className="h-10 w-10 opacity-40" />
              <div className="mt-3 max-w-sm text-sm">
                Abra um sistema no catálogo à esquerda para ver seus diagramas explodidos e a lista de peças numeradas.
              </div>
              {diagramas.length === 0 && !loadingDiagramas && (
                <div className="mt-2 max-w-sm text-xs">
                  Nenhum diagrama cadastrado para {vehicle.marca ?? "este veículo"} {vehicle.modelo ?? ""}. Importe os diagramas para exibir a explosão de peças.
                </div>
              )}
            </div>
          ) : (
            <ExplodedDiagram
              diagramaId={selectedNode.diagramaId}
              nome={selectedNode.label}
              onSelectPart={onSelectPart}
            />
          )}
        </div>
      </div>
    </>
  );
}

function ExplodedDiagram({
  diagramaId, nome, onSelectPart,
}: {
  diagramaId: string;
  nome: string;
  onSelectPart: (p: CatNode) => void;
}) {
  const itensFn = useServerFn(obterItensDiagrama);
  const diagramaFn = useServerFn(obterDiagrama);

  const { data: diagrama } = useQuery({
    queryKey: ["diagrama", diagramaId],
    queryFn: () => diagramaFn({ data: { id: diagramaId } }),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["diagrama-itens", diagramaId],
    queryFn: () => itensFn({ data: { diagramaId } }),
  });

  const abrir = (item: (typeof itens)[number]) =>
    onSelectPart({
      id: `${diagramaId}-${item.numero_referencia}`,
      label: item.descricao_peca ?? item.descricao_diagrama,
      diagramaId,
      pecaId: item.peca_id ?? null,
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-lg border border-border bg-surface/40">
        <div className="relative border-b border-border">
          {diagrama?.imagem_url ? (
            <div className="relative">
              <img src={diagrama.imagem_url} alt={nome} className="max-h-[520px] w-full object-contain" />
              {itens.map((item) => (
                <button
                  key={item.numero_referencia}
                  onClick={() => abrir(item)}
                  style={{ left: `${item.posicao_x}%`, top: `${item.posicao_y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary bg-background/90 px-1.5 text-[11px] font-semibold text-primary shadow-glow transition hover:scale-110"
                  title={item.descricao_diagrama}
                >
                  {item.numero_referencia}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-[420px] flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="max-w-md text-sm text-muted-foreground">
                <div className="font-medium text-warning">Imagem do diagrama não disponível.</div>
                <div className="mt-1">Os itens numerados abaixo vêm do catálogo interno.</div>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 p-4 sm:grid-cols-8">
          {itens.map((item) => (
            <button
              key={item.numero_referencia}
              onClick={() => abrir(item)}
              className="group flex aspect-square items-center justify-center rounded-md border border-border bg-surface/60 text-sm font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-primary"
              title={item.descricao_diagrama}
            >
              {item.numero_referencia}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface/40 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lista numerada</div>
        {isLoading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando itens…
          </div>
        )}
        <div className="mt-3 space-y-1.5">
          {itens.map((item) => (
            <button
              key={item.numero_referencia}
              onClick={() => abrir(item)}
              className="flex w-full items-center gap-3 rounded-md border border-border/60 bg-surface px-3 py-2 text-left text-xs transition hover:border-primary/40"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {item.numero_referencia}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.descricao_peca ?? item.descricao_diagrama}</span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                  {item.codigo_original ?? item.codigo_oem_diagrama ?? "sem código"}
                  {item.quantidade ? ` · qtd ${item.quantidade}` : ""}
                </span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
          {!isLoading && itens.length === 0 && (
            <div className="text-[11px] italic text-muted-foreground">Nenhum item cadastrado neste diagrama.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

function PartDetailPanel({ node, onClose }: { node: CatNode; onClose: () => void }) {
  const relFn = useServerFn(obterRelacionamentosPeca);
  const { data, isLoading } = useQuery({
    queryKey: ["relacionamentos", node.pecaId],
    enabled: Boolean(node.pecaId),
    queryFn: () => relFn({ data: { peca_id: node.pecaId as string } }),
  });

  const peca = data?.peca;
  const fields: Array<[string, string | number | null | undefined]> = peca
    ? [
        ["Código Original", peca.codigo_original],
        ["Código Interno", peca.codigo_interno],
        ["Código Paralelo", peca.codigo_paralelo],
        ["Descrição", peca.descricao],
        ["Marca / Fabricante", [peca.marca, peca.fabricante].filter(Boolean).join(" · ") || null],
        ["Categoria", [peca.categoria, peca.subcategoria].filter(Boolean).join(" · ") || null],
        ["Aplicação", peca.aplicacao],
        ["Motores", peca.motores_compativeis],
        ["Torque", peca.torque],
        ["Estoque", peca.estoque],
        ["Fonte", peca.fonte_nome ?? peca.fonte_url],
      ]
    : [];

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-border bg-surface/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">Peça selecionada</div>
          <div className="mt-0.5 truncate text-sm font-medium">{node.label}</div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-surface hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-surface/60">
          {peca?.imagem_url ? (
            <img src={peca.imagem_url} alt={peca.descricao} className="h-full w-full object-cover" />
          ) : (
            <div className="text-center text-muted-foreground">
              <Package className="mx-auto h-10 w-10" strokeWidth={1.25} />
              <div className="mt-2 text-[11px]">Imagem oficial não disponível</div>
            </div>
          )}
        </div>

        {!node.pecaId ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            Este item do diagrama ainda não está vinculado a uma peça do catálogo.
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando ficha técnica…
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="mt-0.5 text-sm">
                    {value === null || value === undefined || value === ""
                      ? <span className="italic text-muted-foreground">Sem dados na base configurada</span>
                      : value}
                  </div>
                </div>
              ))}
            </div>

            <RelList title="Equivalências" itens={(data?.equivalentes ?? []).map((e) => `${e.codigo_original ?? e.codigo_interno ?? ""} — ${e.descricao}`)} />
            <RelList title="Peças do mesmo sistema" itens={(data?.mesmo_sistema ?? []).map((i) => `${i.numero_referencia}. ${i.descricao_diagrama}`)} />
            <RelList title="Peças irmãs" itens={(data?.irmas ?? []).map((i) => i.descricao)} />
            <RelList title="Veículos compatíveis" itens={(data?.veiculos_compativeis ?? []).map((v) => `${v.marca} ${v.modelo}${v.ano ? ` ${v.ano}` : ""}`)} />
            <RelList title="Diagramas onde aparece" itens={(data?.diagramas ?? []).map((d) => `${d.nome_diagrama} (${d.marca_veiculo} ${d.modelo_veiculo})`)} />
            <RelList title="Orçamentos" itens={(data?.orcamentos ?? []).map((o) => `Orçamento ${o.orcamentos?.numero ?? "—"} · ${o.quantidade} un`)} />
            <RelList title="Histórico de manutenção" itens={(data?.historico_manutencao ?? []).map((h) => `${h.historico_manutencao?.data_servico ?? ""} — ${h.descricao}`)} />

            <Link to="/peca/$id" params={{ id: node.pecaId }}>
              <Button size="sm" variant="outline" className="w-full">Abrir ficha técnica completa →</Button>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}

function RelList({ title, itens }: { title: string; itens: string[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</div>
      {itens.length === 0 ? (
        <div className="mt-1 text-xs italic text-muted-foreground">Nenhum registro relacionado</div>
      ) : (
        <div className="mt-1.5 space-y-1">
          {itens.slice(0, 8).map((t, i) => (
            <div key={i} className="truncate rounded-md border border-border/60 bg-surface px-2 py-1 text-[11px]">{t}</div>
          ))}
        </div>
      )}
    </div>
  );
}


// -----------------------------------------------------------------------------

function PesquisaView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
      <Search className="h-8 w-8 opacity-50" />
      <p className="max-w-md text-sm">
        Você já está em um veículo. Para pesquisar outro chassi, placa ou código, volte à página de busca.
      </p>
      <Link to="/busca">
        <Button variant="outline" size="sm"><Search className="mr-2 h-4 w-4" /> Ir para pesquisa</Button>
      </Link>
    </div>
  );
}

function HistoricoLink() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
      <History className="h-8 w-8 opacity-50" />
      <p className="max-w-md text-sm">Consulte seu histórico completo de buscas.</p>
      <Link to="/historico"><Button variant="outline" size="sm">Abrir histórico</Button></Link>
    </div>
  );
}

function EmptyPanel({ icon: Icon, title, message }: { icon: React.ElementType; title: string; message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground opacity-50" />
      <div className="text-sm font-medium">{title}</div>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Parts AI — dock lateral direito, sempre disponível
// -----------------------------------------------------------------------------

type Msg = { role: "user" | "assistant"; content: string };

function PartsAIDock({
  context, onClose,
}: {
  context: { vehicle: string; vin: string; node?: string; part?: string };
  onClose: () => void;
}) {
  const chat = useServerFn(chatWithPartsAI);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o Parts AI. Respondo apenas com informações da base configurada — nunca invento códigos ou equivalências. Pergunte sobre a peça ou o veículo ao lado.",
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const contextLine = useMemo(() => {
    const parts = [context.vehicle, context.node, context.part].filter(Boolean);
    return parts.join(" · ") || context.vin;
  }, [context]);

  const mut = useMutation({
    mutationFn: async (userText: string) => {
      const enriched = `[Contexto do workspace: ${contextLine} | VIN ${context.vin}]\n\n${userText}`;
      const next: Msg[] = [...messages, { role: "user", content: userText }];
      setMessages(next);
      const res = await chat({ data: { messages: [...messages, { role: "user", content: enriched }] } });
      return res.content;
    },
    onSuccess: (content) => setMessages((m) => [...m, { role: "assistant", content }]),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-border bg-sidebar">
      <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Parts AI</div>
            <div className="text-[10px] text-muted-foreground">Somente dados da base</div>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" title="Recolher">
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-sidebar-border px-4 py-2 text-[10px] text-muted-foreground">
        <span className="uppercase tracking-widest">Contexto:</span> <span className="text-foreground">{contextLine}</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" && "justify-end")}>
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
            <div className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-relaxed",
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface",
            )}>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
            {m.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}
        {mut.isPending && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="rounded-lg bg-surface px-3 py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex shrink-0 gap-2 border-t border-sidebar-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const t = input.trim();
          if (t && !mut.isPending) { mut.mutate(t); setInput(""); }
        }}
      >
        <Input
          placeholder="Pergunte sobre esta peça…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={mut.isPending}
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm" disabled={mut.isPending || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </aside>
  );
}
