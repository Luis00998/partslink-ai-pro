export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      busca_cache: {
        Row: {
          cache_hit: number
          confianca: string | null
          created_at: string
          expires_at: string
          fonte: string | null
          hits: number
          id: string
          payload: Json | null
          resultado: Json
          termo_normalizado: string
          termo_original: string
          tipo: string
          updated_at: string
        }
        Insert: {
          cache_hit?: number
          confianca?: string | null
          created_at?: string
          expires_at?: string
          fonte?: string | null
          hits?: number
          id?: string
          payload?: Json | null
          resultado: Json
          termo_normalizado: string
          termo_original: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          cache_hit?: number
          confianca?: string | null
          created_at?: string
          expires_at?: string
          fonte?: string | null
          hits?: number
          id?: string
          payload?: Json | null
          resultado?: Json
          termo_normalizado?: string
          termo_original?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cidade: string | null
          created_at: string
          documento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          owner_id: string
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          owner_id: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          owner_id?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      diagrama_catalogo: {
        Row: {
          ano_veiculo: number | null
          ativo: boolean | null
          chassis_veiculo: string | null
          created_at: string
          descricao: string | null
          fonte_url: string | null
          hash_imagem: string | null
          id: string
          imagem_bucket: string | null
          imagem_path: string | null
          imagem_tamanho: number | null
          imagem_tipo: string | null
          imagem_url: string
          importado_em: string | null
          marca_veiculo: string
          modelo_veiculo: string
          motor_veiculo: string | null
          nome_diagrama: string
          origem_import: string | null
          owner_id: string
          sistema_id: string
          total_itens: number | null
          total_pecas_unicas: number | null
          ultima_atualizacao: string | null
          updated_at: string
          versao_veiculo: string | null
          vin_veiculo: string | null
        }
        Insert: {
          ano_veiculo?: number | null
          ativo?: boolean | null
          chassis_veiculo?: string | null
          created_at?: string
          descricao?: string | null
          fonte_url?: string | null
          hash_imagem?: string | null
          id?: string
          imagem_bucket?: string | null
          imagem_path?: string | null
          imagem_tamanho?: number | null
          imagem_tipo?: string | null
          imagem_url: string
          importado_em?: string | null
          marca_veiculo: string
          modelo_veiculo: string
          motor_veiculo?: string | null
          nome_diagrama: string
          origem_import?: string | null
          owner_id: string
          sistema_id: string
          total_itens?: number | null
          total_pecas_unicas?: number | null
          ultima_atualizacao?: string | null
          updated_at?: string
          versao_veiculo?: string | null
          vin_veiculo?: string | null
        }
        Update: {
          ano_veiculo?: number | null
          ativo?: boolean | null
          chassis_veiculo?: string | null
          created_at?: string
          descricao?: string | null
          fonte_url?: string | null
          hash_imagem?: string | null
          id?: string
          imagem_bucket?: string | null
          imagem_path?: string | null
          imagem_tamanho?: number | null
          imagem_tipo?: string | null
          imagem_url?: string
          importado_em?: string | null
          marca_veiculo?: string
          modelo_veiculo?: string
          motor_veiculo?: string | null
          nome_diagrama?: string
          origem_import?: string | null
          owner_id?: string
          sistema_id?: string
          total_itens?: number | null
          total_pecas_unicas?: number | null
          ultima_atualizacao?: string | null
          updated_at?: string
          versao_veiculo?: string | null
          vin_veiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagrama_catalogo_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas"
            referencedColumns: ["id"]
          },
        ]
      }
      diagrama_historico: {
        Row: {
          criado_em: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          diagrama_id: string
          id: string
          tipo_alteracao: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          diagrama_id: string
          id?: string
          tipo_alteracao: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          diagrama_id?: string
          id?: string
          tipo_alteracao?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagrama_historico_diagrama_id_fkey"
            columns: ["diagrama_id"]
            isOneToOne: false
            referencedRelation: "diagrama_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      diagrama_item: {
        Row: {
          aplicacoes: string | null
          atualizado_em: string
          chassis_aplicaveis: string | null
          codigo_interno_diagrama: string | null
          codigo_oem_diagrama: string | null
          criado_em: string
          descricao_diagrama: string
          diagrama_id: string
          fabricante_diagrama: string | null
          id: string
          marca_diagrama: string | null
          motores_aplicaveis: string | null
          numero_referencia: number
          observacoes: string | null
          peca_id: string | null
          posicao_montagem: string | null
          posicao_x: number
          posicao_y: number
          quantidade: number
          raio_hotspot: number | null
          unidade: string | null
        }
        Insert: {
          aplicacoes?: string | null
          atualizado_em?: string
          chassis_aplicaveis?: string | null
          codigo_interno_diagrama?: string | null
          codigo_oem_diagrama?: string | null
          criado_em?: string
          descricao_diagrama: string
          diagrama_id: string
          fabricante_diagrama?: string | null
          id?: string
          marca_diagrama?: string | null
          motores_aplicaveis?: string | null
          numero_referencia: number
          observacoes?: string | null
          peca_id?: string | null
          posicao_montagem?: string | null
          posicao_x: number
          posicao_y: number
          quantidade?: number
          raio_hotspot?: number | null
          unidade?: string | null
        }
        Update: {
          aplicacoes?: string | null
          atualizado_em?: string
          chassis_aplicaveis?: string | null
          codigo_interno_diagrama?: string | null
          codigo_oem_diagrama?: string | null
          criado_em?: string
          descricao_diagrama?: string
          diagrama_id?: string
          fabricante_diagrama?: string | null
          id?: string
          marca_diagrama?: string | null
          motores_aplicaveis?: string | null
          numero_referencia?: number
          observacoes?: string | null
          peca_id?: string | null
          posicao_montagem?: string | null
          posicao_x?: number
          posicao_y?: number
          quantidade?: number
          raio_hotspot?: number | null
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagrama_item_diagrama_id_fkey"
            columns: ["diagrama_id"]
            isOneToOne: false
            referencedRelation: "diagrama_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagrama_item_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      diagrama_mapeamento_oem: {
        Row: {
          codigo_oem_banco: string
          codigo_oem_diagrama: string
          confianca: number | null
          created_at: string
          diagrama_id: string
          id: string
          item_numero: number
          mapeado_automaticamente: boolean | null
          mapeado_em: string | null
          mapeado_por: string | null
          peca_id: string | null
        }
        Insert: {
          codigo_oem_banco: string
          codigo_oem_diagrama: string
          confianca?: number | null
          created_at?: string
          diagrama_id: string
          id?: string
          item_numero: number
          mapeado_automaticamente?: boolean | null
          mapeado_em?: string | null
          mapeado_por?: string | null
          peca_id?: string | null
        }
        Update: {
          codigo_oem_banco?: string
          codigo_oem_diagrama?: string
          confianca?: number | null
          created_at?: string
          diagrama_id?: string
          id?: string
          item_numero?: number
          mapeado_automaticamente?: boolean | null
          mapeado_em?: string | null
          mapeado_por?: string | null
          peca_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagrama_mapeamento_oem_diagrama_id_fkey"
            columns: ["diagrama_id"]
            isOneToOne: false
            referencedRelation: "diagrama_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagrama_mapeamento_oem_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      diagramas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string
          modelo_veiculo: string | null
          nome: string
          owner_id: string
          sistema: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url: string
          modelo_veiculo?: string | null
          nome: string
          owner_id: string
          sistema?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string
          modelo_veiculo?: string | null
          nome?: string
          owner_id?: string
          sistema?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      diagramas_itens: {
        Row: {
          codigo_oem_referencia: string | null
          created_at: string
          descricao_referencia: string | null
          diagrama_id: string
          id: string
          numero_referencia: number | null
          peca_id: string | null
          posicao_x: number
          posicao_y: number
          quantidade_referencia: number | null
        }
        Insert: {
          codigo_oem_referencia?: string | null
          created_at?: string
          descricao_referencia?: string | null
          diagrama_id: string
          id?: string
          numero_referencia?: number | null
          peca_id?: string | null
          posicao_x: number
          posicao_y: number
          quantidade_referencia?: number | null
        }
        Update: {
          codigo_oem_referencia?: string | null
          created_at?: string
          descricao_referencia?: string | null
          diagrama_id?: string
          id?: string
          numero_referencia?: number | null
          peca_id?: string | null
          posicao_x?: number
          posicao_y?: number
          quantidade_referencia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diagramas_itens_diagrama_id_fkey"
            columns: ["diagrama_id"]
            isOneToOne: false
            referencedRelation: "diagramas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagramas_itens_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          created_at: string
          id: string
          lista_nome: string | null
          peca_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lista_nome?: string | null
          peca_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lista_nome?: string | null
          peca_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cidade: string | null
          cnpj: string | null
          contato_comercial: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          owner_id: string
          razao_social: string
          site: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          contato_comercial?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          owner_id: string
          razao_social: string
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          contato_comercial?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          owner_id?: string
          razao_social?: string
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      historico_buscas: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          resultado: Json | null
          termo: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          resultado?: Json | null
          termo: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          resultado?: Json | null
          termo?: string
          tipo?: string
        }
        Relationships: []
      }
      historico_manutencao: {
        Row: {
          created_at: string
          data_servico: string
          descricao: string
          id: string
          km: number | null
          observacoes: string | null
          orcamento_id: string | null
          owner_id: string
          servicos_realizados: string | null
          updated_at: string
          valor_total: number
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data_servico?: string
          descricao: string
          id?: string
          km?: number | null
          observacoes?: string | null
          orcamento_id?: string | null
          owner_id: string
          servicos_realizados?: string | null
          updated_at?: string
          valor_total?: number
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data_servico?: string
          descricao?: string
          id?: string
          km?: number | null
          observacoes?: string | null
          orcamento_id?: string | null
          owner_id?: string
          servicos_realizados?: string | null
          updated_at?: string
          valor_total?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_manutencao_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_manutencao_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_manutencao_itens: {
        Row: {
          codigo: string | null
          created_at: string
          descricao: string
          historico_id: string
          id: string
          owner_id: string
          peca_id: string | null
          quantidade: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          descricao: string
          historico_id: string
          id?: string
          owner_id: string
          peca_id?: string | null
          quantidade?: number
        }
        Update: {
          codigo?: string | null
          created_at?: string
          descricao?: string
          historico_id?: string
          id?: string
          owner_id?: string
          peca_id?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_manutencao_itens_historico_id_fkey"
            columns: ["historico_id"]
            isOneToOne: false
            referencedRelation: "historico_manutencao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_manutencao_itens_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          codigo: string | null
          created_at: string
          descricao: string
          id: string
          orcamento_id: string
          owner_id: string
          peca_id: string | null
          preco_unitario: number
          quantidade: number
          subtotal: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          descricao: string
          id?: string
          orcamento_id: string
          owner_id: string
          peca_id?: string | null
          preco_unitario?: number
          quantidade?: number
          subtotal?: number
        }
        Update: {
          codigo?: string | null
          created_at?: string
          descricao?: string
          id?: string
          orcamento_id?: string
          owner_id?: string
          peca_id?: string | null
          preco_unitario?: number
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_itens_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_servicos: {
        Row: {
          created_at: string
          descricao: string
          id: string
          observacoes: string | null
          orcamento_id: string
          owner_id: string
          servico_id: string | null
          subtotal: number
          tempo_horas: number
          valor_hora: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          observacoes?: string | null
          orcamento_id: string
          owner_id: string
          servico_id?: string | null
          subtotal?: number
          tempo_horas?: number
          valor_hora?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          orcamento_id?: string
          owner_id?: string
          servico_id?: string | null
          subtotal?: number
          tempo_horas?: number
          valor_hora?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_servicos_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamento_servicos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          created_at: string
          desconto: number
          frete: number
          id: string
          mao_de_obra: number
          numero: number
          observacoes: string | null
          owner_id: string
          status: string
          tempo_total_horas: number
          total: number
          total_pecas: number
          total_servicos: number
          updated_at: string
          valor_hora: number
          veiculo_id: string | null
          veiculo_info: string | null
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          desconto?: number
          frete?: number
          id?: string
          mao_de_obra?: number
          numero?: number
          observacoes?: string | null
          owner_id: string
          status?: string
          tempo_total_horas?: number
          total?: number
          total_pecas?: number
          total_servicos?: number
          updated_at?: string
          valor_hora?: number
          veiculo_id?: string | null
          veiculo_info?: string | null
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string | null
          created_at?: string
          desconto?: number
          frete?: number
          id?: string
          mao_de_obra?: number
          numero?: number
          observacoes?: string | null
          owner_id?: string
          status?: string
          tempo_total_horas?: number
          total?: number
          total_pecas?: number
          total_servicos?: number
          updated_at?: string
          valor_hora?: number
          veiculo_id?: string | null
          veiculo_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas: {
        Row: {
          ano_final: number | null
          ano_inicial: number | null
          aplicacao: string | null
          categoria: string | null
          chassis_compativeis: string | null
          codigo_barras: string | null
          codigo_interno: string | null
          codigo_original: string | null
          codigo_paralelo: string | null
          created_at: string
          descricao: string
          equivalencias: Json | null
          estoque: number
          estoque_minimo: number
          etiquetas: string[] | null
          fabricante: string | null
          ferramentas_necessarias: string | null
          ficha_tecnica: Json | null
          fonte_confianca: string | null
          fonte_nome: string | null
          fonte_url: string | null
          fornecedor_id: string | null
          id: string
          imagem_url: string | null
          imagens_adicionais: Json | null
          importado_em: string | null
          importado_por: string | null
          liquido_arrefecimento: string | null
          localizacao: string | null
          marca: string | null
          motores_compativeis: string | null
          observacoes: string | null
          owner_id: string
          preco_compra: number | null
          preco_venda: number | null
          procedimentos_tecnicos: string | null
          quantidade_oleo: string | null
          quantidade_por_veiculo: string | null
          subcategoria: string | null
          tempo_estimado: string | null
          tipo_oleo: string | null
          torque: string | null
          total_diagramas: number | null
          ultima_consulta_diagrama: string | null
          updated_at: string
          usado_em_diagramas: boolean | null
        }
        Insert: {
          ano_final?: number | null
          ano_inicial?: number | null
          aplicacao?: string | null
          categoria?: string | null
          chassis_compativeis?: string | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          codigo_original?: string | null
          codigo_paralelo?: string | null
          created_at?: string
          descricao: string
          equivalencias?: Json | null
          estoque?: number
          estoque_minimo?: number
          etiquetas?: string[] | null
          fabricante?: string | null
          ferramentas_necessarias?: string | null
          ficha_tecnica?: Json | null
          fonte_confianca?: string | null
          fonte_nome?: string | null
          fonte_url?: string | null
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          imagens_adicionais?: Json | null
          importado_em?: string | null
          importado_por?: string | null
          liquido_arrefecimento?: string | null
          localizacao?: string | null
          marca?: string | null
          motores_compativeis?: string | null
          observacoes?: string | null
          owner_id: string
          preco_compra?: number | null
          preco_venda?: number | null
          procedimentos_tecnicos?: string | null
          quantidade_oleo?: string | null
          quantidade_por_veiculo?: string | null
          subcategoria?: string | null
          tempo_estimado?: string | null
          tipo_oleo?: string | null
          torque?: string | null
          total_diagramas?: number | null
          ultima_consulta_diagrama?: string | null
          updated_at?: string
          usado_em_diagramas?: boolean | null
        }
        Update: {
          ano_final?: number | null
          ano_inicial?: number | null
          aplicacao?: string | null
          categoria?: string | null
          chassis_compativeis?: string | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          codigo_original?: string | null
          codigo_paralelo?: string | null
          created_at?: string
          descricao?: string
          equivalencias?: Json | null
          estoque?: number
          estoque_minimo?: number
          etiquetas?: string[] | null
          fabricante?: string | null
          ferramentas_necessarias?: string | null
          ficha_tecnica?: Json | null
          fonte_confianca?: string | null
          fonte_nome?: string | null
          fonte_url?: string | null
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          imagens_adicionais?: Json | null
          importado_em?: string | null
          importado_por?: string | null
          liquido_arrefecimento?: string | null
          localizacao?: string | null
          marca?: string | null
          motores_compativeis?: string | null
          observacoes?: string | null
          owner_id?: string
          preco_compra?: number | null
          preco_venda?: number | null
          procedimentos_tecnicos?: string | null
          quantidade_oleo?: string | null
          quantidade_por_veiculo?: string | null
          subcategoria?: string | null
          tempo_estimado?: string | null
          tipo_oleo?: string | null
          torque?: string | null
          total_diagramas?: number | null
          ultima_consulta_diagrama?: string | null
          updated_at?: string
          usado_em_diagramas?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pecas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          empresa: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          empresa?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          empresa?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      servico_pecas_sugeridas: {
        Row: {
          codigo_oem: string | null
          created_at: string
          descricao: string
          id: string
          obrigatorio: boolean
          observacoes: string | null
          peca_id: string | null
          quantidade: number
          servico_id: string
        }
        Insert: {
          codigo_oem?: string | null
          created_at?: string
          descricao: string
          id?: string
          obrigatorio?: boolean
          observacoes?: string | null
          peca_id?: string | null
          quantidade?: number
          servico_id: string
        }
        Update: {
          codigo_oem?: string | null
          created_at?: string
          descricao?: string
          id?: string
          obrigatorio?: boolean
          observacoes?: string | null
          peca_id?: string | null
          quantidade?: number
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servico_pecas_sugeridas_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servico_pecas_sugeridas_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          ferramentas_necessarias: string | null
          id: string
          nome: string
          procedimentos: string | null
          sistema_id: string | null
          tempo_desmontagem: number
          tempo_montagem: number
          tempo_total: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          ferramentas_necessarias?: string | null
          id?: string
          nome: string
          procedimentos?: string | null
          sistema_id?: string | null
          tempo_desmontagem?: number
          tempo_montagem?: number
          tempo_total?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          ferramentas_necessarias?: string | null
          id?: string
          nome?: string
          procedimentos?: string | null
          sistema_id?: string | null
          tempo_desmontagem?: number
          tempo_montagem?: number
          tempo_total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas"
            referencedColumns: ["id"]
          },
        ]
      }
      sistemas: {
        Row: {
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculo_pecas: {
        Row: {
          codigo_interno: string | null
          codigo_original: string | null
          codigo_paralelo: string | null
          confidence: string
          created_at: string
          created_by: string | null
          id: string
          observacoes: string | null
          origem: string
          peca_id: string
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          codigo_interno?: string | null
          codigo_original?: string | null
          codigo_paralelo?: string | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          observacoes?: string | null
          origem?: string
          peca_id: string
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          codigo_interno?: string | null
          codigo_original?: string | null
          codigo_paralelo?: string | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          observacoes?: string | null
          origem?: string
          peca_id?: string
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculo_pecas_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculo_pecas_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number | null
          cabine: string | null
          cambio: string | null
          chassis: string | null
          cilindrada: string | null
          cilindros: string | null
          cliente_id: string | null
          combustivel: string | null
          confianca: string
          created_at: string
          dados_tecnicos: Json
          fabricante: string | null
          fonte: string | null
          id: string
          km_atual: number | null
          marca: string | null
          modelo: string | null
          motor: string | null
          observacoes: string | null
          owner_id: string | null
          pais: string | null
          placa: string | null
          potencia: string | null
          serie: string | null
          tipo_veiculo: string | null
          tracao: string | null
          ultimo_acesso: string
          updated_at: string
          versao: string | null
          vin: string | null
        }
        Insert: {
          ano?: number | null
          cabine?: string | null
          cambio?: string | null
          chassis?: string | null
          cilindrada?: string | null
          cilindros?: string | null
          cliente_id?: string | null
          combustivel?: string | null
          confianca?: string
          created_at?: string
          dados_tecnicos?: Json
          fabricante?: string | null
          fonte?: string | null
          id?: string
          km_atual?: number | null
          marca?: string | null
          modelo?: string | null
          motor?: string | null
          observacoes?: string | null
          owner_id?: string | null
          pais?: string | null
          placa?: string | null
          potencia?: string | null
          serie?: string | null
          tipo_veiculo?: string | null
          tracao?: string | null
          ultimo_acesso?: string
          updated_at?: string
          versao?: string | null
          vin?: string | null
        }
        Update: {
          ano?: number | null
          cabine?: string | null
          cambio?: string | null
          chassis?: string | null
          cilindrada?: string | null
          cilindros?: string | null
          cliente_id?: string | null
          combustivel?: string | null
          confianca?: string
          created_at?: string
          dados_tecnicos?: Json
          fabricante?: string | null
          fonte?: string | null
          id?: string
          km_atual?: number | null
          marca?: string | null
          modelo?: string | null
          motor?: string | null
          observacoes?: string | null
          owner_id?: string | null
          pais?: string | null
          placa?: string | null
          potencia?: string | null
          serie?: string | null
          tipo_veiculo?: string | null
          tracao?: string | null
          ultimo_acesso?: string
          updated_at?: string
          versao?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_stats: {
        Row: {
          buscas_externas: number | null
          buscas_locais: number | null
          cache_hits: number | null
          economia_creditos: number | null
          pecas_com_imagem: number | null
          pecas_enriquecidas_ia: number | null
          taxa_acerto_banco: number | null
          total_buscas: number | null
          total_cache: number | null
          total_diagramas: number | null
          total_historicos: number | null
          total_hotspots: number | null
          total_orcamentos: number | null
          total_pecas: number | null
          total_relacionamentos: number | null
          total_veiculos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      buscar_diagramas_veiculo: {
        Args: {
          p_ano?: number
          p_marca: string
          p_modelo: string
          p_motor?: string
        }
        Returns: {
          ano_veiculo: number
          diagrama_id: string
          imagem_url: string
          marca_veiculo: string
          modelo_veiculo: string
          motor_veiculo: string
          nome_diagrama: string
          sistema_nome: string
          total_itens: number
        }[]
      }
      buscar_pecas_unificado: {
        Args: { p_limite?: number; p_termo: string }
        Returns: {
          aplicacao: string
          categoria: string
          chassis_compativeis: string
          codigo_interno: string
          codigo_original: string
          codigo_paralelo: string
          descricao: string
          equivalencias: Json
          fabricante: string
          id: string
          imagem_url: string
          marca: string
          motores_compativeis: string
          score: number
          subcategoria: string
        }[]
      }
      contar_oem_em_diagramas: {
        Args: { p_codigo_oem: string }
        Returns: {
          lista_marcas: string[]
          lista_modelos: string[]
          total_diagramas: number
          total_ocorrencias: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalizar_texto: { Args: { p_texto: string }; Returns: string }
      obter_diagramas_da_peca: {
        Args: { p_peca_id: string }
        Returns: {
          ano_veiculo: number
          diagrama_id: string
          imagem_url: string
          marca_veiculo: string
          modelo_veiculo: string
          nome_diagrama: string
          numero_referencia: number
          quantidade: number
          sistema_nome: string
        }[]
      }
      obter_itens_diagrama_com_pecas: {
        Args: { p_diagrama_id: string }
        Returns: {
          codigo_interno: string
          codigo_oem_diagrama: string
          codigo_original: string
          descricao_diagrama: string
          descricao_peca: string
          equivalencias: Json
          fabricante_diagrama: string
          marca_diagrama: string
          marca_peca: string
          numero_referencia: number
          peca_id: string
          posicao_x: number
          posicao_y: number
          quantidade: number
          raio_hotspot: number
        }[]
      }
      obter_pecas_do_veiculo: {
        Args: { p_veiculo_id: string }
        Returns: {
          aplicacao: string
          categoria: string
          codigo_interno: string
          codigo_original: string
          codigo_paralelo: string
          confidence: string
          descricao: string
          equivalencias: Json
          fabricante: string
          imagem_url: string
          marca: string
          origem: string
          peca_id: string
          subcategoria: string
          vinculo_id: string
        }[]
      }
      obter_veiculo_por_vin: {
        Args: { p_vin: string }
        Returns: {
          ano: number | null
          cabine: string | null
          cambio: string | null
          chassis: string | null
          cilindrada: string | null
          cilindros: string | null
          cliente_id: string | null
          combustivel: string | null
          confianca: string
          created_at: string
          dados_tecnicos: Json
          fabricante: string | null
          fonte: string | null
          id: string
          km_atual: number | null
          marca: string | null
          modelo: string | null
          motor: string | null
          observacoes: string | null
          owner_id: string | null
          pais: string | null
          placa: string | null
          potencia: string | null
          serie: string | null
          tipo_veiculo: string | null
          tracao: string | null
          ultimo_acesso: string
          updated_at: string
          versao: string | null
          vin: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "veiculos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recalcular_orcamento: {
        Args: { p_orcamento_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente"
        | "vendedor"
        | "mecanico"
        | "estoquista"
        | "financeiro"
        | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "gerente",
        "vendedor",
        "mecanico",
        "estoquista",
        "financeiro",
        "cliente",
      ],
    },
  },
} as const
