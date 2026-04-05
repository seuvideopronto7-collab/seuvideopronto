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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          created_at: string
          id: string
          type: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          type?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          access_token: string | null
          api_key: string | null
          client_id: string | null
          created_at: string
          credentials: string | null
          id: string
          last_test_at: string | null
          platform: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          client_id?: string | null
          created_at?: string
          credentials?: string | null
          id?: string
          last_test_at?: string | null
          platform: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          client_id?: string | null
          created_at?: string
          credentials?: string | null
          id?: string
          last_test_at?: string | null
          platform?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      produtos_gerados: {
        Row: {
          created_at: string
          estrutura: Json
          id: string
          nicho: string
          nome: string
          status: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estrutura?: Json
          id?: string
          nicho?: string
          nome?: string
          status?: string
          tipo?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estrutura?: Json
          id?: string
          nicho?: string
          nome?: string
          status?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          instagram: string
          is_active: boolean
          tiktok: string
          updated_at: string
          whatsapp: string
          youtube_channel: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          instagram?: string
          is_active?: boolean
          tiktok?: string
          updated_at?: string
          whatsapp?: string
          youtube_channel?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          instagram?: string
          is_active?: boolean
          tiktok?: string
          updated_at?: string
          whatsapp?: string
          youtube_channel?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_planos: {
        Row: {
          created_at: string
          id: string
          limite_diario_json: Json
          plano: string
          reset_at: string | null
          user_id: string
          uso_hoje_json: Json
        }
        Insert: {
          created_at?: string
          id?: string
          limite_diario_json?: Json
          plano?: string
          reset_at?: string | null
          user_id: string
          uso_hoje_json?: Json
        }
        Update: {
          created_at?: string
          id?: string
          limite_diario_json?: Json
          plano?: string
          reset_at?: string | null
          user_id?: string
          uso_hoje_json?: Json
        }
        Relationships: []
      }
      video_jobs: {
        Row: {
          audio_url: string | null
          caption_text: string | null
          created_at: string
          error: string | null
          id: string
          image_url: string | null
          progress: number
          prompt: string | null
          status: string
          updated_at: string | null
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          caption_text?: string | null
          created_at?: string
          error?: string | null
          id?: string
          image_url?: string | null
          progress?: number
          prompt?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          caption_text?: string | null
          created_at?: string
          error?: string | null
          id?: string
          image_url?: string | null
          progress?: number
          prompt?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      video_pipeline: {
        Row: {
          created_at: string
          etapa_atual: number
          etapas_concluidas: number[]
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          etapa_atual?: number
          etapas_concluidas?: number[]
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          etapa_atual?: number
          etapas_concluidas?: number[]
          id?: string
          status?: string
          updated_at?: string
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
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
