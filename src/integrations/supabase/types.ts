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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      approvals: {
        Row: {
          action: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          org_id: string
          payload: Json | null
          requested_by: string | null
          status: Database["public"]["Enums"]["approval_status"]
        }
        Insert: {
          action: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          org_id: string
          payload?: Json | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Update: {
          action?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          org_id?: string
          payload?: Json | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
        }
        Relationships: [
          {
            foreignKeyName: "approvals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          org_id: string | null
          soc2_tags: Database["public"]["Enums"]["soc2_tag"][] | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          org_id?: string | null
          soc2_tags?: Database["public"]["Enums"]["soc2_tag"][] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          org_id?: string | null
          soc2_tags?: Database["public"]["Enums"]["soc2_tag"][] | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          budget_type: string
          consumed_amount: number | null
          created_at: string
          id: string
          is_frozen: boolean | null
          limit_amount: number
          name: string
          org_id: string
          period: string | null
          reset_at: string | null
          updated_at: string
        }
        Insert: {
          budget_type: string
          consumed_amount?: number | null
          created_at?: string
          id?: string
          is_frozen?: boolean | null
          limit_amount: number
          name: string
          org_id: string
          period?: string | null
          reset_at?: string | null
          updated_at?: string
        }
        Update: {
          budget_type?: string
          consumed_amount?: number | null
          created_at?: string
          id?: string
          is_frozen?: boolean | null
          limit_amount?: number
          name?: string
          org_id?: string
          period?: string | null
          reset_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          job_type: string
          max_attempts: number | null
          org_id: string
          payload: Json | null
          priority: number | null
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          attempts?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          job_type: string
          max_attempts?: number | null
          org_id: string
          payload?: Json | null
          priority?: number | null
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          attempts?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          job_type?: string
          max_attempts?: number | null
          org_id?: string
          payload?: Json | null
          priority?: number | null
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          metadata: Json | null
          product_id: string
          published_at: string | null
          status: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          product_id: string
          published_at?: string | null
          status?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          product_id?: string
          published_at?: string | null
          status?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          content_type: string | null
          created_at: string
          filename: string | null
          id: string
          metadata: Json | null
          org_id: string
          product_id: string | null
          size_bytes: number | null
          url: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          product_id?: string | null
          size_bytes?: number | null
          url: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          product_id?: string | null
          size_bytes?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      plugin_contracts: {
        Row: {
          capability: string
          constraints: Json | null
          created_at: string
          description: string | null
          id: string
          level: Database["public"]["Enums"]["capability_level"]
          plugin_id: string
        }
        Insert: {
          capability: string
          constraints?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          level: Database["public"]["Enums"]["capability_level"]
          plugin_id: string
        }
        Update: {
          capability?: string
          constraints?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          level?: Database["public"]["Enums"]["capability_level"]
          plugin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_contracts_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      plugin_instances: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean | null
          org_id: string
          plugin_id: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          org_id: string
          plugin_id: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          org_id?: string
          plugin_id?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_instances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_instances_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_instances_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      plugins: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          version?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          org_id: string
          sku: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          sku?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          sku?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings_definitions: {
        Row: {
          created_at: string
          default_value: Json | null
          description: string | null
          id: string
          key: string
          schema: Json
          scope: Database["public"]["Enums"]["settings_scope"]
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          description?: string | null
          id?: string
          key: string
          schema: Json
          scope: Database["public"]["Enums"]["settings_scope"]
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          description?: string | null
          id?: string
          key?: string
          schema?: Json
          scope?: Database["public"]["Enums"]["settings_scope"]
        }
        Relationships: []
      }
      settings_values: {
        Row: {
          created_at: string
          created_by: string | null
          definition_id: string
          id: string
          scope: Database["public"]["Enums"]["settings_scope"]
          scope_id: string | null
          value: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definition_id: string
          id?: string
          scope: Database["public"]["Enums"]["settings_scope"]
          scope_id?: string | null
          value: Json
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definition_id?: string
          id?: string
          scope?: Database["public"]["Enums"]["settings_scope"]
          scope_id?: string | null
          value?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "settings_values_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "settings_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          credentials: Json | null
          external_id: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          org_id: string
          platform: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          org_id: string
          platform: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          org_id?: string
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          attributes: Json | null
          created_at: string
          id: string
          inventory_quantity: number | null
          price: number | null
          product_id: string
          sku: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string
          id?: string
          inventory_quantity?: number | null
          price?: number | null
          product_id: string
          sku?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string
          id?: string
          inventory_quantity?: number | null
          price?: number | null
          product_id?: string
          sku?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          is_processed: boolean | null
          is_verified: boolean | null
          org_id: string | null
          payload: Json
          plugin_id: string | null
          processed_at: string | null
          received_at: string
          signature: string | null
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          is_processed?: boolean | null
          is_verified?: boolean | null
          org_id?: string | null
          payload: Json
          plugin_id?: string | null
          processed_at?: string | null
          received_at?: string
          signature?: string | null
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          is_processed?: boolean | null
          is_verified?: boolean | null
          org_id?: string | null
          payload?: Json
          plugin_id?: string | null
          processed_at?: string | null
          received_at?: string
          signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_due_jobs: {
        Args: { claim_limit?: number; org_id_param: string }
        Returns: {
          attempts: number | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          job_type: string
          max_attempts: number | null
          org_id: string
          payload: Json | null
          priority: number | null
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_org_role: {
        Args: { org_id_param: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      has_org_access: {
        Args: {
          org_id_param: string
          required_role?: Database["public"]["Enums"]["org_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      capability_level: "native" | "workaround" | "unsupported"
      job_status:
        | "pending"
        | "claimed"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      org_role: "owner" | "operator" | "viewer"
      settings_scope:
        | "global"
        | "org"
        | "store"
        | "plugin_instance"
        | "workflow"
      soc2_tag:
        | "access"
        | "change"
        | "availability"
        | "confidentiality"
        | "processing_integrity"
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
      approval_status: ["pending", "approved", "rejected"],
      capability_level: ["native", "workaround", "unsupported"],
      job_status: [
        "pending",
        "claimed",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      org_role: ["owner", "operator", "viewer"],
      settings_scope: ["global", "org", "store", "plugin_instance", "workflow"],
      soc2_tag: [
        "access",
        "change",
        "availability",
        "confidentiality",
        "processing_integrity",
      ],
    },
  },
} as const
