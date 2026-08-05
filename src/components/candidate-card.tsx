import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { savePartFromSmartSearch, type SmartCandidate } from "@/lib/smart-search.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Save, X, Package } from "lucide-react";
import { toast } from "sonner";

export function ConfiancaBadge({ nivel }: { nivel: "alta" | "media" | "baixa" }) {
  const label = nivel === "alta" ? "Confiança alta" : nivel === "media" ? "Confiança média" : "Confiança baixa";
  const variant = nivel === "alta" ? "default" : nivel === "media" ? "secondary" : "outline";
  return <Badge variant={variant as never} className="text-[10px] uppercase tracking-wide">{label}</Badge>;
}

function Linha({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs">{value}</div>
    </div>
  );
}

function equivalenciasTexto(equivalencias: SmartCandidate["equivalencias"]) {
  if (!Array.isArray(equivalencias) || equivalencias.length === 0) return null;
  return equivalencias
    .map((e) => {
      if (typeof e === "string") return e;
      const o = e as Record<string, unknown>;
      return [o.marca, o.codigo ?? o.codigo_original ?? o.oem].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(" · ");
}

/**
 * Card profissional de peça encontrada fora do banco (Pesquisa Inteligente).
 * Compartilhado entre a tela Buscar e o Parts AI — botão único de UPSERT no catálogo.
 */
export function CandidateCard({
  candidate,
  termo,
  onSaved,
}: {
  candidate: SmartCandidate;
  termo?: string;
  onSaved?: (id: string) => void;
}) {
  const saveSmart = useServerFn(savePartFromSmartSearch);
  const [dismissed, setDismissed] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => saveSmart({ data: { candidate: candidate as never, termo_original: termo } }),
    onSuccess: ({ status, id }) => {
      setSavedId(id);
      toast.success(
        status === "updated"
          ? "Peça atualizada com sucesso. Nas próximas pesquisas ela será encontrada diretamente no catálogo sem consumir IA."
          : "Peça adicionada com sucesso. Nas próximas pesquisas ela será encontrada diretamente no catálogo sem consumir IA.",
      );
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (dismissed) return null;

  const eqv = equivalenciasTexto(candidate.equivalencias);
  const ano = [candidate.ano_inicial, candidate.ano_final].filter(Boolean).join(" – ");

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface/60">
          {candidate.imagem_url ? (
            <img src={candidate.imagem_url} alt={candidate.descricao} className="h-full w-full object-cover" />
          ) : (
            <Package className="h-7 w-7 text-muted-foreground" strokeWidth={1.25} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm">{candidate.codigo_original ?? "sem código OEM"}</span>
            <ConfiancaBadge nivel={candidate.fonte_confianca} />
          </div>
          <div className="mt-1 text-sm font-medium">{candidate.descricao}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {candidate.fabricante ?? candidate.marca ?? "fabricante não informado"}
            {candidate.categoria ? ` · ${candidate.categoria}` : ""}
          </div>

          <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Linha label="Código interno" value={candidate.codigo_interno} />
            <Linha label="Código paralelo" value={candidate.codigo_paralelo} />
            <Linha label="Marca" value={candidate.marca} />
            <Linha label="Subcategoria" value={candidate.subcategoria} />
            <Linha label="Aplicações" value={candidate.aplicacao} />
            <Linha label="Motores" value={candidate.motores_compativeis} />
            <Linha label="Chassis" value={candidate.chassis_compativeis} />
            <Linha label="Ano" value={ano || null} />
            <Linha label="Torque" value={candidate.torque} />
            <Linha label="Equivalências" value={eqv} />
            <Linha label="Observações" value={candidate.observacoes} />
            <Linha label="Justificativa" value={candidate.justificativa} />
          </div>

          <a
            href={candidate.fonte_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" /> {candidate.fonte_nome ?? candidate.fonte_url}
          </a>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {savedId ? (
              <>
                <Badge variant="default" className="text-[10px] uppercase tracking-wide">No catálogo</Badge>
                {onSaved && (
                  <Button size="sm" variant="outline" onClick={() => onSaved(savedId)}>
                    Abrir ficha técnica →
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  ✅ Adicionar ao catálogo
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} disabled={save.isPending}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
