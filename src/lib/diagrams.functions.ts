import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CreateDiagramaCatalogoSchema,
  CreateDiagramaItemSchema,
  UpdateDiagramaCatalogoSchema,
  UpdateDiagramaItemSchema,
  BuscarDiagramasVeiculoSchema,
  BulkImportDiagramasSchema,
  MapeamentoOEMSchema,
} from "./diagrams.schemas";
import type {
  CreateDiagramaCatalogoInput,
  CreateDiagramaItemInput,
  DiagramaCatalogo,
  DiagramaItem,
  DiagramasVeiculoResult,
  BulkImportDiagramasResult,
  MapeamentoAutomaticoResult,
} from "./diagrams.types";

/**
 * Buscar diagrama por ID com detalhes completos
 */
export const obterDiagrama = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: diagrama, error } = await context.supabase
      .from("diagrama_catalogo")
      .select("*")
      .eq("id", data.id)
      .single();

    if (error) throw new Error(`Diagrama não encontrado: ${error.message}`);
    return diagrama as DiagramaCatalogo;
  });

/**
 * Buscar diagramas por veículo
 */
export const buscarDiagramasVeiculo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BuscarDiagramasVeiculoSchema.parse(d))
  .handler(async ({ data, context }) => {
    console.log(
      `[Diagrams] buscarDiagramasVeiculo: ${data.marca} ${data.modelo} ano=${data.ano} motor=${data.motor}`,
    );

    const { data: resultados, error } = await context.supabase.rpc(
      "buscar_diagramas_veiculo",
      {
        p_marca: data.marca,
        p_modelo: data.modelo,
        p_ano: data.ano || null,
        p_motor: data.motor || null,
      },
    );

    if (error) {
      console.error(`[Diagrams] erro ao buscar diagramas: ${error.message}`);
      throw new Error(`Erro ao buscar diagramas: ${error.message}`);
    }

    console.log(`[Diagrams] encontrados ${resultados?.length || 0} diagramas`);
    return (resultados || []) as DiagramasVeiculoResult[];
  });

/**
 * Obter itens de um diagrama com peças mapeadas
 */
export const obterItensDiagrama = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ diagramaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    console.log(`[Diagrams] obterItensDiagrama: ${data.diagramaId}`);

    const { data: itens, error } = await context.supabase.rpc(
      "obter_itens_diagrama_com_pecas",
      { p_diagrama_id: data.diagramaId },
    );

    if (error) {
      console.error(`[Diagrams] erro ao obter itens: ${error.message}`);
      throw new Error(`Erro ao obter itens do diagrama: ${error.message}`);
    }

    return itens || [];
  });

/**
 * Criar novo diagrama
 */
export const criarDiagrama = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateDiagramaCatalogoSchema.parse(d))
  .handler(async ({ data, context }) => {
    console.log(
      `[Diagrams] criarDiagrama: ${data.marca_veiculo} ${data.modelo_veiculo} sistema=${data.sistema_id}`,
    );

    // Verificar se já existe
    const { data: existing } = await context.supabase
      .from("diagrama_catalogo")
      .select("id")
      .eq("marca_veiculo", data.marca_veiculo)
      .eq("modelo_veiculo", data.modelo_veiculo)
      .eq("ano_veiculo", data.ano_veiculo || null)
      .eq("sistema_id", data.sistema_id)
      .maybeSingle();

    if (existing) {
      throw new Error("Diagrama já existe para este veículo e sistema");
    }

    const { data: inserted, error } = await context.supabase
      .from("diagrama_catalogo")
      .insert({
        ...data,
        owner_id: context.userId,
      } as never)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar diagrama: ${error.message}`);

    console.log(`[Diagrams] diagrama criado: ${inserted.id}`);

    // Registrar no histórico
    await context.supabase.from("diagrama_historico").insert({
      diagrama_id: inserted.id,
      tipo_alteracao: "criacao",
      descricao: "Diagrama criado",
      dados_novos: inserted as never,
      usuario_id: context.userId,
    });

    return inserted as DiagramaCatalogo;
  });

/**
 * Atualizar diagrama
 */
export const atualizarDiagrama = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        ...UpdateDiagramaCatalogoSchema.shape,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;
    console.log(`[Diagrams] atualizarDiagrama: ${id}`);

    // Verificar permissão (admin)
    const isAdmin = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin.data) {
      throw new Error("Apenas administradores podem atualizar diagramas");
    }

    const { data: atualizado, error } = await context.supabase
      .from("diagrama_catalogo")
      .update(updateData as never)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar diagrama: ${error.message}`);

    console.log(`[Diagrams] diagrama atualizado: ${id}`);

    // Registrar no histórico
    await context.supabase.from("diagrama_historico").insert({
      diagrama_id: id,
      tipo_alteracao: "atualizacao",
      descricao: "Diagrama atualizado",
      dados_novos: atualizado as never,
      usuario_id: context.userId,
    });

    return atualizado as DiagramaCatalogo;
  });

/**
 * Criar item do diagrama
 */
export const criarItemDiagrama = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateDiagramaItemSchema.parse(d))
  .handler(async ({ data, context }) => {
    console.log(`[Diagrams] criarItemDiagrama: diagrama=${data.diagrama_id} numero=${data.numero_referencia}`);

    // Verificar se é admin
    const isAdmin = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin.data) {
      throw new Error("Apenas administradores podem criar itens de diagrama");
    }

    // Verificar se item já existe
    const { data: existing } = await context.supabase
      .from("diagrama_item")
      .select("id")
      .eq("diagrama_id", data.diagrama_id)
      .eq("numero_referencia", data.numero_referencia)
      .maybeSingle();

    if (existing) {
      throw new Error("Item com este número de referência já existe neste diagrama");
    }

    const { data: inserted, error } = await context.supabase
      .from("diagrama_item")
      .insert(data as never)
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar item: ${error.message}`);

    console.log(`[Diagrams] item criado: ${inserted.id}`);

    // Atualizar total de itens no diagrama
    const { data: countResult } = await context.supabase
      .from("diagrama_item")
      .select("id", { count: "exact" })
      .eq("diagrama_id", data.diagrama_id);

    if (countResult) {
      await context.supabase
        .from("diagrama_catalogo")
        .update({ total_itens: countResult.length })
        .eq("id", data.diagrama_id);
    }

    return inserted as DiagramaItem;
  });

/**
 * Atualizar item do diagrama
 */
export const atualizarItemDiagrama = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        diagramaId: z.string().uuid(),
        ...UpdateDiagramaItemSchema.shape,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { itemId, diagramaId, ...updateData } = data;
    console.log(`[Diagrams] atualizarItemDiagrama: ${itemId}`);

    // Verificar permissão
    const isAdmin = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin.data) {
      throw new Error("Apenas administradores podem atualizar itens");
    }

    const { data: atualizado, error } = await context.supabase
      .from("diagrama_item")
      .update(updateData as never)
      .eq("id", itemId)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar item: ${error.message}`);

    console.log(`[Diagrams] item atualizado: ${itemId}`);
    return atualizado as DiagramaItem;
  });

/**
 * Deletar item do diagrama
 */
export const deletarItemDiagrama = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        itemId: z.string().uuid(),
        diagramaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    console.log(`[Diagrams] deletarItemDiagrama: ${data.itemId}`);

    // Verificar permissão
    const isAdmin = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin.data) {
      throw new Error("Apenas administradores podem deletar itens");
    }

    const { error } = await context.supabase
      .from("diagrama_item")
      .delete()
      .eq("id", data.itemId);

    if (error) throw new Error(`Erro ao deletar item: ${error.message}`);

    // Atualizar total de itens
    const { data: countResult } = await context.supabase
      .from("diagrama_item")
      .select("id", { count: "exact" })
      .eq("diagrama_id", data.diagramaId);

    if (countResult) {
      await context.supabase
        .from("diagrama_catalogo")
        .update({ total_itens: countResult.length })
        .eq("id", data.diagramaId);
    }

    console.log(`[Diagrams] item deletado: ${data.itemId}`);
    return { success: true };
  });

/**
 * Buscar OEM em todos os diagramas
 */
export const buscarOEMEmDiagramas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ codigoOEM: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    console.log(`[Diagrams] buscarOEMEmDiagramas: ${data.codigoOEM}`);

    const { data: resultado, error } = await context.supabase.rpc(
      "contar_oem_em_diagramas",
      { p_codigo_oem: data.codigoOEM },
    );

    if (error) {
      console.error(`[Diagrams] erro ao buscar OEM: ${error.message}`);
      throw new Error(`Erro ao buscar OEM: ${error.message}`);
    }

    return resultado[0] || { total_diagramas: 0, total_ocorrencias: 0, lista_marcas: [], lista_modelos: [] };
  });

/**
 * Mapeamento automático de OEM com peças do banco
 */
export const mapeamentoAutomaticoOEM = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        diagramaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    console.log(`[Diagrams] mapeamentoAutomaticoOEM: ${data.diagramaId}`);

    // Verificar permissão
    const isAdmin = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin.data) {
      throw new Error("Apenas administradores podem fazer mapeamento automático");
    }

    // Obter todos os itens do diagrama
    const { data: itens, error: errorItens } = await context.supabase
      .from("diagrama_item")
      .select("id, numero_referencia, codigo_oem_diagrama")
      .eq("diagrama_id", data.diagramaId);

    if (errorItens) throw new Error(`Erro ao obter itens: ${errorItens.message}`);

    const resultado: MapeamentoAutomaticoResult = {
      total_itens: itens?.length || 0,
      mapeados: 0,
      nao_mapeados: 0,
      detalhes: [],
    };

    // Para cada item, tentar mapear com peça do banco
    for (const item of itens || []) {
      if (!item.codigo_oem_diagrama) {
        resultado.nao_mapeados++;
        resultado.detalhes.push({
          item_numero: item.numero_referencia,
          codigo_oem: "",
          peca_encontrada: false,
          confianca: 0,
        });
        continue;
      }

      // Procurar peça por OEM (match exato)
      const { data: pecaExata } = await context.supabase
        .from("pecas")
        .select("id")
        .eq("codigo_original", item.codigo_oem_diagrama)
        .maybeSingle();

      // Se não encontrou, tentar com contains
      let pecaEncontrada = pecaExata;
      let confianca = 1.0;

      if (!pecaEncontrada) {
        const { data: pecaLike } = await context.supabase
          .from("pecas")
          .select("id")
          .ilike("codigo_original", `%${item.codigo_oem_diagrama}%`)
          .limit(1)
          .maybeSingle();

        if (pecaLike) {
          pecaEncontrada = pecaLike;
          confianca = 0.7;
        }
      }

      if (pecaEncontrada) {
        // Atualizar item com peça_id
        await context.supabase
          .from("diagrama_item")
          .update({ peca_id: pecaEncontrada.id })
          .eq("id", item.id);

        // Registrar mapeamento
        await context.supabase.from("diagrama_mapeamento_oem").insert({
          diagrama_id: data.diagramaId,
          item_numero: item.numero_referencia,
          codigo_oem_diagrama: item.codigo_oem_diagrama,
          codigo_oem_banco: item.codigo_oem_diagrama,
          peca_id: pecaEncontrada.id,
          mapeado_automaticamente: true,
          mapeado_por: context.userId,
          confianca,
        } as never);

        resultado.mapeados++;
        resultado.detalhes.push({
          item_numero: item.numero_referencia,
          codigo_oem: item.codigo_oem_diagrama,
          peca_encontrada: true,
          confianca,
        });
      } else {
        resultado.nao_mapeados++;
        resultado.detalhes.push({
          item_numero: item.numero_referencia,
          codigo_oem: item.codigo_oem_diagrama,
          peca_encontrada: false,
          confianca: 0,
        });
      }
    }

    console.log(`[Diagrams] mapeamento concluído: ${resultado.mapeados}/${resultado.total_itens} mapeados`);
    return resultado;
  });

/**
 * Import em massa de diagramas
 */
export const importarDiagramasEmMassa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BulkImportDiagramasSchema.parse(d))
  .handler(async ({ data, context }) => {
    console.log(
      `[Diagrams] importarDiagramasEmMassa: ${data.diagramas.length} diagramas, ${data.itens.length} itens`,
    );

    // Verificar permissão
    const isAdmin = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin.data) {
      throw new Error("Apenas administradores podem importar diagramas");
    }

    const resultado: BulkImportDiagramasResult = {
      total_processados: 0,
      criados: 0,
      atualizados: 0,
      erros: [],
    };

    // Inserir diagramas
    for (const diagrama of data.diagramas) {
      try {
        const { data: existing, error: errorCheck } = await context.supabase
          .from("diagrama_catalogo")
          .select("id")
          .eq("marca_veiculo", diagrama.marca_veiculo)
          .eq("modelo_veiculo", diagrama.modelo_veiculo)
          .eq("sistema_id", diagrama.sistema_id)
          .maybeSingle();

        if (existing) {
          // Atualizar
          const { error: errorUpdate } = await context.supabase
            .from("diagrama_catalogo")
            .update({
              nome_diagrama: diagrama.nome_diagrama,
              descricao: diagrama.descricao,
              imagem_url: diagrama.imagem_url,
              ultima_atualizacao: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (errorUpdate) throw errorUpdate;
          resultado.atualizados++;
        } else {
          // Criar
          const { error: errorInsert } = await context.supabase
            .from("diagrama_catalogo")
            .insert({
              ...diagrama,
              owner_id: context.userId,
            } as never);

          if (errorInsert) throw errorInsert;
          resultado.criados++;
        }

        resultado.total_processados++;
      } catch (error) {
        resultado.erros.push({
          linha: resultado.total_processados,
          erro: error instanceof Error ? error.message : "Erro desconhecido",
          dados: diagrama,
        });
      }
    }

    console.log(
      `[Diagrams] import concluído: ${resultado.criados} criados, ${resultado.atualizados} atualizados`,
    );
    return resultado;
  });

// Adicionar import que estava faltando
import { z } from "zod";
