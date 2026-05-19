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
      device_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_label: string
          id: string
          ip_address: string | null
          is_blocked: boolean
          last_active_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_label?: string
          id?: string
          ip_address?: string | null
          is_blocked?: boolean
          last_active_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_label?: string
          id?: string
          ip_address?: string | null
          is_blocked?: boolean
          last_active_at?: string
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
      job_assets: {
        Row: {
          created_at: string
          id: string
          job_id: string
          meta_json: Json
          provider: string
          scene_index: number | null
          type: Database["public"]["Enums"]["asset_type"]
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          meta_json?: Json
          provider?: string
          scene_index?: number | null
          type: Database["public"]["Enums"]["asset_type"]
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          meta_json?: Json
          provider?: string
          scene_index?: number | null
          type?: Database["public"]["Enums"]["asset_type"]
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_assets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "pipeline_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_logs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          level: Database["public"]["Enums"]["log_level"]
          message: string
          payload_json: Json
          stage: Database["public"]["Enums"]["job_stage"]
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          payload_json?: Json
          stage: Database["public"]["Enums"]["job_stage"]
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          payload_json?: Json
          stage?: Database["public"]["Enums"]["job_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "pipeline_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_steps: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          fallback_used: boolean
          finished_at: string | null
          id: string
          job_id: string
          meta_json: Json
          provider: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_step_status"]
          step: Database["public"]["Enums"]["job_step_name"]
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          fallback_used?: boolean
          finished_at?: string | null
          id?: string
          job_id: string
          meta_json?: Json
          provider?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_step_status"]
          step: Database["public"]["Enums"]["job_step_name"]
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          fallback_used?: boolean
          finished_at?: string | null
          id?: string
          job_id?: string
          meta_json?: Json
          provider?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_step_status"]
          step?: Database["public"]["Enums"]["job_step_name"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_steps_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "pipeline_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_jobs: {
        Row: {
          aspect_ratio: string
          audience: string
          copy_base: string
          created_at: string
          cta: string
          current_stage: Database["public"]["Enums"]["job_stage"]
          duration: string
          error_message: string | null
          id: string
          input_type: Database["public"]["Enums"]["job_input_type"]
          max_retries: number
          niche: string
          objective: Database["public"]["Enums"]["job_objective"]
          platform: Database["public"]["Enums"]["job_platform"]
          progress: number
          reference_image_url: string | null
          retry_count: number
          script_mode: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          user_id: string
          visual_style: string
          voice: string
        }
        Insert: {
          aspect_ratio?: string
          audience?: string
          copy_base?: string
          created_at?: string
          cta?: string
          current_stage?: Database["public"]["Enums"]["job_stage"]
          duration?: string
          error_message?: string | null
          id?: string
          input_type?: Database["public"]["Enums"]["job_input_type"]
          max_retries?: number
          niche?: string
          objective?: Database["public"]["Enums"]["job_objective"]
          platform?: Database["public"]["Enums"]["job_platform"]
          progress?: number
          reference_image_url?: string | null
          retry_count?: number
          script_mode?: string
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          user_id: string
          visual_style?: string
          voice?: string
        }
        Update: {
          aspect_ratio?: string
          audience?: string
          copy_base?: string
          created_at?: string
          cta?: string
          current_stage?: Database["public"]["Enums"]["job_stage"]
          duration?: string
          error_message?: string | null
          id?: string
          input_type?: Database["public"]["Enums"]["job_input_type"]
          max_retries?: number
          niche?: string
          objective?: Database["public"]["Enums"]["job_objective"]
          platform?: Database["public"]["Enums"]["job_platform"]
          progress?: number
          reference_image_url?: string | null
          retry_count?: number
          script_mode?: string
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          user_id?: string
          visual_style?: string
          voice?: string
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
          avatar_url: string | null
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
          avatar_url?: string | null
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
          avatar_url?: string | null
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
      subscriptions: {
        Row: {
          created_at: string
          id: string
          plan: string
          reset_date: string | null
          status: string
          user_id: string
          videos_limit: number | null
          videos_used: number
        }
        Insert: {
          created_at?: string
          id?: string
          plan?: string
          reset_date?: string | null
          status?: string
          user_id: string
          videos_limit?: number | null
          videos_used?: number
        }
        Update: {
          created_at?: string
          id?: string
          plan?: string
          reset_date?: string | null
          status?: string
          user_id?: string
          videos_limit?: number | null
          videos_used?: number
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          ativo: boolean | null
          chave: string
          created_at: string | null
          id: string
          updated_at: string | null
          valor: Json
        }
        Insert: {
          ativo?: boolean | null
          chave: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          valor?: Json
        }
        Update: {
          ativo?: boolean | null
          chave?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          valor?: Json
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
          error_code: string | null
          id: string
          image_url: string | null
          images: Json
          last_heartbeat: string
          metadata: Json | null
          progress: number
          prompt: string | null
          provider: string | null
          render_mode: string | null
          scenes: Json
          status: string
          updated_at: string | null
          user_id: string | null
          video_url: string | null
          watermark_text: string | null
        }
        Insert: {
          audio_url?: string | null
          caption_text?: string | null
          created_at?: string
          error?: string | null
          error_code?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          last_heartbeat?: string
          metadata?: Json | null
          progress?: number
          prompt?: string | null
          provider?: string | null
          render_mode?: string | null
          scenes?: Json
          status?: string
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
          watermark_text?: string | null
        }
        Update: {
          audio_url?: string | null
          caption_text?: string | null
          created_at?: string
          error?: string | null
          error_code?: string | null
          id?: string
          image_url?: string | null
          images?: Json
          last_heartbeat?: string
          metadata?: Json | null
          progress?: number
          prompt?: string | null
          provider?: string | null
          render_mode?: string | null
          scenes?: Json
          status?: string
          updated_at?: string | null
          user_id?: string | null
          video_url?: string | null
          watermark_text?: string | null
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
      video_render_logs: {
        Row: {
          created_at: string | null
          erro: string | null
          id: string
          job_id: string | null
          metadata: Json | null
          provider: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          erro?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          provider?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          erro?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          provider?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vw_video_render_status: {
        Row: {
          chave: string | null
          motivo: string | null
          provider: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          chave?: string | null
          motivo?: never
          provider?: never
          status?: never
          updated_at?: string | null
        }
        Update: {
          chave?: string | null
          motivo?: never
          provider?: never
          status?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_device_limit: {
        Args: { _fingerprint: string; _user_id: string }
        Returns: Json
      }
      claim_video_job: {
        Args: { _job_id: string; _lock_ttl_seconds?: number }
        Returns: Json
      }
      fn_resolver_video_provider: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_videos_used: { Args: { _user_id: string }; Returns: undefined }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
      update_video_job_heartbeat: {
        Args: { _job_id: string }
        Returns: undefined
      }
      video_jobs_watchdog: {
        Args: { _stale_minutes?: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
      asset_type:
        | "script"
        | "audio"
        | "image"
        | "video"
        | "subtitle"
        | "thumbnail"
      job_input_type:
        | "ideia"
        | "imagem"
        | "produto"
        | "autoridade"
        | "viral"
        | "dark"
      job_objective: "vendas" | "autoridade" | "engajamento"
      job_platform:
        | "tiktok"
        | "reels"
        | "shorts"
        | "feed"
        | "stories"
        | "youtube"
      job_stage:
        | "a_fazer"
        | "roteiro"
        | "narracao"
        | "imagens"
        | "video"
        | "concluido"
      job_status:
        | "aguardando"
        | "processando"
        | "concluido"
        | "erro"
        | "cancelado"
      job_step_name:
        | "script"
        | "voice"
        | "scenes"
        | "motion"
        | "sound"
        | "render"
        | "delivery"
      job_step_status: "pending" | "running" | "done" | "error" | "skipped"
      log_level: "info" | "warning" | "error"
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
      asset_type: [
        "script",
        "audio",
        "image",
        "video",
        "subtitle",
        "thumbnail",
      ],
      job_input_type: [
        "ideia",
        "imagem",
        "produto",
        "autoridade",
        "viral",
        "dark",
      ],
      job_objective: ["vendas", "autoridade", "engajamento"],
      job_platform: ["tiktok", "reels", "shorts", "feed", "stories", "youtube"],
      job_stage: [
        "a_fazer",
        "roteiro",
        "narracao",
        "imagens",
        "video",
        "concluido",
      ],
      job_status: [
        "aguardando",
        "processando",
        "concluido",
        "erro",
        "cancelado",
      ],
      job_step_name: [
        "script",
        "voice",
        "scenes",
        "motion",
        "sound",
        "render",
        "delivery",
      ],
      job_step_status: ["pending", "running", "done", "error", "skipped"],
      log_level: ["info", "warning", "error"],
    },
  },
} as const
