export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          attempt_number: number
          created_at: string
          files_touched_count: number
          id: string
          log: Json
          owner_id: string
          ticket_id: string
          token_cost: number
        }
        Insert: {
          attempt_number: number
          created_at?: string
          files_touched_count?: number
          id?: string
          log?: Json
          owner_id: string
          ticket_id: string
          token_cost?: number
        }
        Update: {
          attempt_number?: number
          created_at?: string
          files_touched_count?: number
          id?: string
          log?: Json
          owner_id?: string
          ticket_id?: string
          token_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          email: string
          id: string
          name: string | null
          owner_id: string
        }
        Insert: {
          client_id: string
          email: string
          id?: string
          name?: string | null
          owner_id: string
        }
        Update: {
          client_id?: string
          email?: string
          id?: string
          name?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          confidence_tier: string
          created_at: string
          hires_count: number
          id: string
          jobs_lost: number
          jobs_won: number
          last_analyzed_at: string | null
          last_analyzed_data_hash: string | null
          name: string
          owner_id: string
          payment_verified: boolean
          price_band_low_confidence: boolean
          price_band_max: string | null
          price_band_min: string | null
          reviews_visible: boolean
          spend_visible: boolean
          upwork_url: string | null
          verdict: string | null
        }
        Insert: {
          confidence_tier?: string
          created_at?: string
          hires_count?: number
          id?: string
          jobs_lost?: number
          jobs_won?: number
          last_analyzed_at?: string | null
          last_analyzed_data_hash?: string | null
          name: string
          owner_id: string
          payment_verified?: boolean
          price_band_low_confidence?: boolean
          price_band_max?: string | null
          price_band_min?: string | null
          reviews_visible?: boolean
          spend_visible?: boolean
          upwork_url?: string | null
          verdict?: string | null
        }
        Update: {
          confidence_tier?: string
          created_at?: string
          hires_count?: number
          id?: string
          jobs_lost?: number
          jobs_won?: number
          last_analyzed_at?: string | null
          last_analyzed_data_hash?: string | null
          name?: string
          owner_id?: string
          payment_verified?: boolean
          price_band_low_confidence?: boolean
          price_band_max?: string | null
          price_band_min?: string | null
          reviews_visible?: boolean
          spend_visible?: boolean
          upwork_url?: string | null
          verdict?: string | null
        }
        Relationships: []
      }
      extension_tokens: {
        Row: {
          created_at: string
          owner_id: string
          token: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          token: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          token?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          access_token: string | null
          account_label: string | null
          category: string
          connected_at: string | null
          id: string
          owner_id: string
          provider: string
          status: string
        }
        Insert: {
          access_token?: string | null
          account_label?: string | null
          category: string
          connected_at?: string | null
          id?: string
          owner_id: string
          provider: string
          status?: string
        }
        Update: {
          access_token?: string | null
          account_label?: string | null
          category?: string
          connected_at?: string | null
          id?: string
          owner_id?: string
          provider?: string
          status?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          client_id: string | null
          draft_tickets: Json
          guest_email: string | null
          id: string
          known_client: boolean
          owner_id: string
          skribby_bot_id: string | null
          source: string
          starts_at: string
          status: string
          title: string
          transcript_source: string | null
          transcript_text: string | null
        }
        Insert: {
          client_id?: string | null
          draft_tickets?: Json
          guest_email?: string | null
          id?: string
          known_client?: boolean
          owner_id: string
          skribby_bot_id?: string | null
          source: string
          starts_at: string
          status?: string
          title: string
          transcript_source?: string | null
          transcript_text?: string | null
        }
        Update: {
          client_id?: string | null
          draft_tickets?: Json
          guest_email?: string | null
          id?: string
          known_client?: boolean
          owner_id?: string
          skribby_bot_id?: string | null
          source?: string
          starts_at?: string
          status?: string
          title?: string
          transcript_source?: string | null
          transcript_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          owner_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          owner_id: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          owner_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          embedding: string | null
          id: string
          in_voice: boolean
          outcome_notes: string | null
          outcome_reason: string | null
          owner_id: string
          resolved_at: string | null
          sent_at: string | null
          state: string
          title: string
        }
        Insert: {
          body?: string
          client_id?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          in_voice?: boolean
          outcome_notes?: string | null
          outcome_reason?: string | null
          owner_id: string
          resolved_at?: string | null
          sent_at?: string | null
          state?: string
          title: string
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string
          embedding?: string | null
          id?: string
          in_voice?: boolean
          outcome_notes?: string | null
          outcome_reason?: string | null
          owner_id?: string
          resolved_at?: string | null
          sent_at?: string | null
          state?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      repos: {
        Row: {
          full_name: string
          id: string
          integration_id: string
          is_default: boolean
          owner_id: string
          provider: string
        }
        Insert: {
          full_name: string
          id?: string
          integration_id: string
          is_default?: boolean
          owner_id: string
          provider: string
        }
        Update: {
          full_name?: string
          id?: string
          integration_id?: string
          is_default?: boolean
          owner_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "repos_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          attempt_count: number
          client_id: string | null
          created_at: string
          id: string
          owner_id: string
          plan_summary: string | null
          pr_url: string | null
          repo_id: string | null
          state: string
          title: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          client_id?: string | null
          created_at?: string
          id?: string
          owner_id: string
          plan_summary?: string | null
          pr_url?: string | null
          repo_id?: string | null
          state?: string
          title: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          client_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          plan_summary?: string | null
          pr_url?: string | null
          repo_id?: string | null
          state?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "repos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_proposals: {
        Args: {
          match_count?: number
          match_owner_id: string
          query_embedding: string
        }
        Returns: {
          body: string
          id: string
          similarity: number
          title: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

