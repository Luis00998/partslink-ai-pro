import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  IdInput,
  OrcamentoIdInput,
  OrcamentoInput,
  OrcamentoItemInput,
  OrcamentoServicoInput,
  OrcamentoUpdateInput,
  ServicoIdInput,
  ServicoInput,
  VeiculoIdInput,
  VeiculoInput,
  VeiculoUpdateInput,
} from "./orcamentos.schemas";

// ===================== VEÍCULOS =====================

export const listarVeiculos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("veiculos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const criarVeiculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VeiculoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("veiculos")
      .insert({ ...data, owner_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    console.log(`[Veiculos] criado id=${row.id} owner=${context.userId}`);
    return row;
  });

export const atualizarVeiculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VeiculoUpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("veiculos")
      .update(data.patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const excluirVeiculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("veiculos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===================== SERVIÇOS PADRÃO =====================

export const listarServicos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("servicos")
      .select("*")
      .eq("ativo", true)
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const criarServico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ServicoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas administradores podem cadastrar serviços");
    const { data: row, error } = await context.supabase.from("servicos").insert(data).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Checklist inteligente: peças sugeridas para um serviço. */
export const obterChecklistServico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ServicoIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("servico_pecas_sugeridas")
      .select("*, pecas(id, codigo_original, descricao, marca, preco_venda, imagem_url)")
      .eq("servico_id", data.servico_id)
      .order("obrigatorio", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ===================== ORÇAMENTOS =====================

export const listarOrcamentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orcamentos")
      .select("*, veiculos(marca, modelo, ano, placa)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const obterOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const [orcamento, itens, servicos] = await Promise.all([
      context.supabase
        .from("orcamentos")
        .select("*, veiculos(*), clientes(nome, telefone, email)")
        .eq("id", data.id)
        .maybeSingle(),
      context.supabase.from("orcamento_itens").select("*").eq("orcamento_id", data.id).order("created_at"),
      context.supabase.from("orcamento_servicos").select("*").eq("orcamento_id", data.id).order("created_at"),
    ]);

    if (orcamento.error) throw new Error(orcamento.error.message);
    if (!orcamento.data) throw new Error("Orçamento não encontrado");

    return {
      orcamento: orcamento.data,
      itens: itens.data ?? [],
      servicos: servicos.data ?? [],
    };
  });

export const criarOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrcamentoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("orcamentos")
      .insert({ ...data, owner_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    console.log(`[Orcamentos] criado numero=${row.numero} id=${row.id}`);
    return row;
  });

export const atualizarOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrcamentoUpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("orcamentos")
      .update(data.patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    // recalcula totais aplicando desconto/frete/mão de obra atualizados
    const { data: refreshed } = await context.supabase
      .from("orcamentos")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    return refreshed ?? row;
  });

export const excluirOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("orcamentos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- itens de peça (subtotal e total recalculados por trigger) -----

export const adicionarItemOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrcamentoItemInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("orcamento_itens")
      .insert({ ...data, owner_id: context.userId, subtotal: data.quantidade * data.preco_unitario })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removerItemOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("orcamento_itens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- serviços / mão de obra do orçamento -----

export const adicionarServicoOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrcamentoServicoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("orcamento_servicos")
      .insert({ ...data, owner_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removerServicoOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("orcamento_servicos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Dados consolidados para geração de PDF / ordem de serviço. */
export const obterDadosPdfOrcamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrcamentoIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const [orcamento, itens, servicos, perfil] = await Promise.all([
      context.supabase
        .from("orcamentos")
        .select("*, veiculos(*), clientes(*)")
        .eq("id", data.orcamento_id)
        .maybeSingle(),
      context.supabase.from("orcamento_itens").select("*").eq("orcamento_id", data.orcamento_id),
      context.supabase.from("orcamento_servicos").select("*").eq("orcamento_id", data.orcamento_id),
      context.supabase.from("profiles").select("nome, empresa, telefone").eq("id", context.userId).maybeSingle(),
    ]);

    if (orcamento.error) throw new Error(orcamento.error.message);
    if (!orcamento.data) throw new Error("Orçamento não encontrado");

    return {
      emitente: perfil.data ?? null,
      orcamento: orcamento.data,
      itens: itens.data ?? [],
      servicos: servicos.data ?? [],
      gerado_em: new Date().toISOString(),
    };
  });

// ===================== HISTÓRICO DO VEÍCULO (atalho) =====================

export const obterHistoricoVeiculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VeiculoIdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("historico_manutencao")
      .select("*, historico_manutencao_itens(*)")
      .eq("veiculo_id", data.veiculo_id)
      .order("data_servico", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
