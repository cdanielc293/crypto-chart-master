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
      feedback_tickets: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string
          status: string
          type: string
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          type?: string
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          type?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      klines: {
        Row: {
          close: number
          high: number
          interval: string
          low: number
          open: number
          symbol: string
          time: number
          volume: number
        }
        Insert: {
          close: number
          high: number
          interval: string
          low: number
          open: number
          symbol: string
          time: number
          volume: number
        }
        Update: {
          close?: number
          high?: number
          interval?: string
          low?: number
          open?: number
          symbol?: string
          time?: number
          volume?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          facebook_profile: string | null
          full_name: string | null
          id: string
          instagram_profile: string | null
          plan: string
          referral_balance: number
          referral_code: string | null
          referrals_free: number
          referrals_paid: number
          signature: string | null
          updated_at: string
          username: string | null
          website: string | null
          x_profile: string | null
          youtube_channel: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          facebook_profile?: string | null
          full_name?: string | null
          id: string
          instagram_profile?: string | null
          plan?: string
          referral_balance?: number
          referral_code?: string | null
          referrals_free?: number
          referrals_paid?: number
          signature?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
          x_profile?: string | null
          youtube_channel?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          facebook_profile?: string | null
          full_name?: string | null
          id?: string
          instagram_profile?: string | null
          plan?: string
          referral_balance?: number
          referral_code?: string | null
          referrals_free?: number
          referrals_paid?: number
          signature?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
          x_profile?: string | null
          youtube_channel?: string | null
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string
          details: Json | null
          id: string
          resolved: boolean
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          details?: Json | null
          id?: string
          resolved?: boolean
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          resolved?: boolean
          user_id?: string
        }
        Relationships: []
      }
      session_devices: {
        Row: {
          created_at: string
          id: string
          real_ip: string | null
          real_user_agent: string | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          real_ip?: string | null
          real_user_agent?: string | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          real_ip?: string | null
          real_user_agent?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_active_tab: {
        Row: {
          ip_address: string | null
          tab_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          ip_address?: string | null
          tab_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          ip_address?: string | null
          tab_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_chart_state: {
        Row: {
          chart_type: string
          drawings: Json
          hidden_indicators: Json
          id: string
          indicator_configs: Json
          indicators: Json
          interval: string
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chart_type?: string
          drawings?: Json
          hidden_indicators?: Json
          id?: string
          indicator_configs?: Json
          indicators?: Json
          interval?: string
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chart_type?: string
          drawings?: Json
          hidden_indicators?: Json
          id?: string
          indicator_configs?: Json
          indicators?: Json
          interval?: string
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_exchange_keys: {
        Row: {
          api_key: string
          api_secret: string
          created_at: string
          exchange_id: string
          id: string
          is_testnet: boolean
          label: string
          passphrase: string | null
          permissions: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          created_at?: string
          exchange_id: string
          id?: string
          is_testnet?: boolean
          label?: string
          passphrase?: string | null
          permissions?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          created_at?: string
          exchange_id?: string
          id?: string
          is_testnet?: boolean
          label?: string
          passphrase?: string | null
          permissions?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_layouts: {
        Row: {
          chart_settings: Json
          created_at: string
          grid_layout_id: string
          id: string
          is_active: boolean
          name: string
          panels: Json
          sort_order: number
          sync_options: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          chart_settings?: Json
          created_at?: string
          grid_layout_id?: string
          id?: string
          is_active?: boolean
          name?: string
          panels?: Json
          sort_order?: number
          sync_options?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          chart_settings?: Json
          created_at?: string
          grid_layout_id?: string
          id?: string
          is_active?: boolean
          name?: string
          panels?: Json
          sort_order?: number
          sync_options?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_login_log: {
        Row: {
          id: string
          logged_in_at: string
          user_id: string
        }
        Insert: {
          id?: string
          logged_in_at?: string
          user_id: string
        }
        Update: {
          id?: string
          logged_in_at?: string
          user_id?: string
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
      user_widget_layouts: {
        Row: {
          created_at: string
          favorites: Json
          id: string
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          favorites?: Json
          id?: string
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          favorites?: Json
          id?: string
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_activity_stats: { Args: never; Returns: Json }
      admin_get_all_profiles: { Args: never; Returns: Json }
      admin_get_stats: { Args: never; Returns: Json }
      admin_toggle_block: {
        Args: { p_blocked: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_update_plan: {
        Args: { p_plan: string; p_user_id: string }
        Returns: undefined
      }
      cleanup_klines_retention: {
        Args: { max_rows?: number }
        Returns: {
          deleted_interval: string
          deleted_symbol: string
          rows_deleted: number
        }[]
      }
      get_user_sessions: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          ip: unknown
          real_ip: string
          real_user_agent: string
          refreshed_at: string
          session_id: string
          updated_at: string
          user_agent: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      revoke_user_session: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
