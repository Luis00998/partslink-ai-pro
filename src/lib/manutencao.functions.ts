import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { IdInput, ManutencaoInput, VeiculoIdInput } from "./orcamentos.schemas";

/** Registra um atendimento no histórico de manutenção do veículo (com peças substituídas). */
export const registrarManutencao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ManutencaoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { itens, ...cabecalho } = data;

    const { data: row, error } = await context.supabase
      .from("historico_manutencao")
      .insert({ ...cabecalho, owner_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (itens.length > 0) {
      const { error: itensError } = await context.supabase
        .from("historico_manutencao_itens")
        .insert(
          itens.map((item) => ({
            historico_id: row.id,
            owner_id: context.userId,
            peca_id: item.peca_id ?? null,
            codigo: item.codigo ?? null,
            descricao: item.descricao,
            quantidade: item.quantidade,
          })),
        );
      if (itensError) throw new Error(itensError.message);
    }

    // mantém a quilometragem do veículo atualizada
    if (typeof cabecalho.km === "number") {
      await context.supabase
        .from("veiculos")
        .update({ km_atual: cabecalho.km })
        .eq("id", cabecalho.veiculo_id)
        .lt("km_atual", cabecalho.km);
    }

    console.log(
      `[Manutencao] registrado id=${row.id} veiculo=${cabecalho.veiculo_id} itens=${itens.length}`,
    );
    return { id: row.id, itens: itens.length };
  });

/** Histórico completo (serviços, peças, datas, km) de um veículo. */
export const listarManutencoesVeiculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VeiculoIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const [historico, orcamentos] = await Promise.all([
      context.supabase
        .from("historico_manutencao")
        .select("*, historico_manutencao_itens(*)")
        .eq("veiculo_id", data.veiculo_id)
        .order("data_servico", { ascending: false }),
      context.supabase
        .from("orcamentos")
        .select("id, numero, status, total, created_at")
        .eq("veiculo_id", data.veiculo_id)
        .order("created_at", { ascending: false }),
    ]);

    if (historico.error) throw new Error(historico.error.message);

    return {
      manutencoes: historico.data ?? [],
      orcamentos_anteriores: orcamentos.data ?? [],
    };
  });

export const excluirManutencao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("historico_manutencao")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
