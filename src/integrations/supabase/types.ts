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
          total: number
          updated_at: string
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
          total?: number
          updated_at?: string
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
          total?: number
          updated_at?: string
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
