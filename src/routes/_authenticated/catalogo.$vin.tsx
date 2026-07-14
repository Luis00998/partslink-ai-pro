import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { decodeVin } from "@/lib/vehicle-lookup.functions";
import { chatWithPartsAI } from "@/lib/parts-ai.functions";
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
type CatNode = { id: string; label: string; children?: CatNode[] };

const CATALOG: CatNode[] = [
  { id: "motor", label: "Motor", children: [
    { id: "motor-bloco", label: "Bloco" },
    { id: "motor-cabecote", label: "Cabeçote" },
    { id: "motor-pistoes", label: "Pistões" },
    { id: "motor-bielas", label: "Bielas" },
    { id: "motor-virabrequim", label: "Virabrequim" },
    { id: "motor-comando", label: "Comando de válvulas" },
    { id: "motor-juntas", label: "Juntas e retentores" },
  ]},
  { id: "combustivel", label: "Sistema de combustível", children: [
    { id: "comb-bomba", label: "Bomba" },
    { id: "comb-injetores", label: "Injetores" },
    { id: "comb-filtros", label: "Filtros" },
    { id: "comb-tubulacoes", label: "Tubulações" },
  ]},
  { id: "ar", label: "Sistema de ar / admissão", children: [
    { id: "ar-filtro", label: "Filtro de ar" },
    { id: "ar-intercooler", label: "Intercooler" },
    { id: "ar-coletor", label: "Coletor de admissão" },
  ]},
  { id: "arref", label: "Sistema de arrefecimento", children: [
    { id: "arref-radiador", label: "Radiador" },
    { id: "arref-bomba", label: "Bomba d'água" },
    { id: "arref-mangueiras", label: "Mangueiras" },
    { id: "arref-termostato", label: "Termostato" },
  ]},
  { id: "pneu", label: "Sistema pneumático", children: [
    { id: "pneu-compressor", label: "Compressor" },
    { id: "pneu-valvulas", label: "Válvulas" },
    { id: "pneu-reservatorios", label: "Reservatórios" },
  ]},
  { id: "freios", label: "Freios", children: [
    { id: "freios-discos", label: "Discos" },
    { id: "freios-pastilhas", label: "Pastilhas / lonas" },
    { id: "freios-camaras", label: "Câmaras de freio" },
    { id: "freios-abs", label: "ABS / EBS" },
  ]},
  { id: "susp", label: "Suspensão", children: [
    { id: "susp-diant", label: "Dianteira" },
    { id: "susp-tras", label: "Traseira" },
    { id: "susp-amort", label: "Amortecedores" },
    { id: "susp-molas", label: "Molas / feixes" },
  ]},
  { id: "direcao", label: "Direção", children: [
    { id: "dir-caixa", label: "Caixa de direção" },
    { id: "dir-bomba", label: "Bomba hidráulica" },
    { id: "dir-barras", label: "Barras e terminais" },
  ]},
  { id: "trans", label: "Transmissão", children: [
    { id: "trans-embreagem", label: "Embreagem" },
    { id: "trans-cambio", label: "Caixa de câmbio" },
    { id: "trans-cardan", label: "Cardan" },
    { id: "trans-diferencial", label: "Diferencial" },
  ]},
  { id: "cabine", label: "Cabine", children: [
    { id: "cab-interior", label: "Interior" },
    { id: "cab-vidros", label: "Vidros e fechaduras" },
    { id: "cab-suspensao", label: "Suspensão da cabine" },
  ]},
  { id: "chassi", label: "Chassi", children: [
    { id: "chassi-long", label: "Longarinas" },
    { id: "chassi-quinta", label: "Quinta roda" },
    { id: "chassi-suportes", label: "Suportes" },
  ]},
  { id: "eletrica", label: "Elétrica", children: [
    { id: "el-bateria", label: "Baterias" },
    { id: "el-alternador", label: "Alternador" },
    { id: "el-motor-partida", label: "Motor de partida" },
    { id: "el-chicote", label: "Chicote" },
    { id: "el-sensores", label: "Sensores" },
  ]},
  { id: "filtros", label: "Filtros", children: [
    { id: "filt-oleo", label: "Óleo" },
    { id: "filt-comb", label: "Combustível" },
    { id: "filt-ar", label: "Ar" },
    { id: "filt-cabine", label: "Cabine" },
  ]},
];

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

function CatalogView({
  selectedNode, onSelectNode, onSelectPart,
}: {
  selectedNode: CatNode | null;
  onSelectNode: (n: CatNode | null) => void;
  onSelectPart: (p: CatNode) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["motor"]));
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  return (
    <>
      {/* Tree */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border bg-surface/30">
        <div className="border-b border-border px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Catálogo técnico</div>
          <div className="mt-0.5 text-sm">Sistemas e conjuntos</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {CATALOG.map((group) => {
            const isOpen = expanded.has(group.id);
            return (
              <div key={group.id} className="mb-0.5">
                <button
                  onClick={() => toggle(group.id)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface"
                >
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="font-medium">{group.label}</span>
                </button>
                {isOpen && group.children && (
                  <div className="ml-4 border-l border-border/60 pl-2">
                    {group.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => onSelectNode(child)}
                        className={cn(
                          "block w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition hover:bg-surface hover:text-foreground",
                          selectedNode?.id === child.id && "bg-primary/10 text-foreground",
                        )}
                      >
                        {child.label}
                      </button>
                    ))}
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
          {!selectedNode ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <LayoutGrid className="h-10 w-10 opacity-40" />
              <div className="mt-3 max-w-sm text-sm">
                Abra um sistema no catálogo à esquerda para ver seus diagramas e a lista de peças numeradas.
              </div>
            </div>
          ) : (
            <DiagramPlaceholder node={selectedNode} onSelectPart={onSelectPart} />
          )}
        </div>
      </div>
    </>
  );
}

function DiagramPlaceholder({ node, onSelectPart }: { node: CatNode; onSelectPart: (p: CatNode) => void }) {
  // Sem fonte de diagramas oficiais conectada. Mostramos placeholder honesto + lista numerada vazia.
  const numbered = Array.from({ length: 8 }).map((_, i) => ({ id: `${node.id}-${i + 1}`, n: i + 1 }));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-lg border border-border bg-surface/40">
        <div className="flex h-[420px] flex-col items-center justify-center gap-3 border-b border-border p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="max-w-md text-sm text-muted-foreground">
            <div className="font-medium text-warning">Diagrama oficial de <span className="text-foreground">{node.label}</span> não disponível.</div>
            <div className="mt-1">
              Nenhuma fonte de diagramas técnicos foi conectada. Conecte TecDoc, PartsLink24 ou o catálogo eletrônico
              da montadora para exibir a explosão de peças numerada.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 p-4 sm:grid-cols-8">
          {numbered.map((it) => (
            <button
              key={it.id}
              onClick={() => onSelectPart({ id: it.id, label: `${node.label} — item ${it.n}` })}
              className="group flex aspect-square items-center justify-center rounded-md border border-dashed border-border bg-surface/60 text-sm font-semibold text-muted-foreground transition hover:border-primary/60 hover:text-primary"
              title={`Item ${it.n}`}
            >
              {it.n}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface/40 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Lista numerada</div>
        <div className="mt-3 space-y-1.5">
          {numbered.map((it) => (
            <button
              key={it.id}
              onClick={() => onSelectPart({ id: it.id, label: `${node.label} — item ${it.n}` })}
              className="flex w-full items-center gap-3 rounded-md border border-border/60 bg-surface px-3 py-2 text-left text-xs transition hover:border-primary/40"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {it.n}
              </span>
              <span className="flex-1 truncate text-muted-foreground">Item {it.n} — sem dados</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Os itens exibem apenas a numeração de referência. Códigos, descrições, aplicações e equivalências só aparecem
          quando um catálogo oficial estiver conectado.
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

function PartDetailPanel({ node, onClose }: { node: CatNode; onClose: () => void }) {
  const fields: Array<[string, string | null]> = [
    ["Código Original", null],
    ["Código Antigo", null],
    ["Código Atual", null],
    ["Descrição", null],
    ["Aplicação", null],
    ["Quantidade", null],
    ["Observações", null],
    ["Preço", null],
    ["Disponibilidade", null],
  ];
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
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border bg-surface/60">
          <div className="text-center text-muted-foreground">
            <Package className="mx-auto h-10 w-10" strokeWidth={1.25} />
            <div className="mt-2 text-[11px]">Imagem oficial não disponível</div>
          </div>
        </div>

        <div className="space-y-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="mt-0.5 text-sm italic text-muted-foreground">Sem dados na base configurada</div>
            </div>
          ))}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Equivalências</div>
          <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            Nenhuma equivalência cadastrada. O sistema não deduz equivalências entre marcas.
          </div>
        </div>
      </div>
    </aside>
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
