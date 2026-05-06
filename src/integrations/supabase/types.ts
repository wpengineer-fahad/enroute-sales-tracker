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
      business_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      master_products: {
        Row: {
          category: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name: string
          price?: number
          stock?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
        }
        Relationships: []
      }
      master_tasks: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      me_products: {
        Row: {
          created_at: string
          id: string
          master_product_id: string
          me_profile_id: string
          notes: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          master_product_id: string
          me_profile_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          master_product_id?: string
          me_profile_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "me_products_master_product_id_fkey"
            columns: ["master_product_id"]
            isOneToOne: false
            referencedRelation: "master_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_products_me_profile_id_fkey"
            columns: ["me_profile_id"]
            isOneToOne: false
            referencedRelation: "me_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      me_profiles: {
        Row: {
          business_category: string | null
          contact_number: string | null
          created_at: string
          developer_id: string | null
          email: string | null
          enterprise_name: string
          facebook_url: string | null
          id: string
          instagram_url: string | null
          location: string | null
          owner_image_url: string | null
          owner_name: string
          registration_date: string | null
          shop_image_url: string | null
          sub_sector: Database["public"]["Enums"]["sub_sector"] | null
          trade_license_text: string | null
          trade_license_url: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          business_category?: string | null
          contact_number?: string | null
          created_at?: string
          developer_id?: string | null
          email?: string | null
          enterprise_name: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          location?: string | null
          owner_image_url?: string | null
          owner_name: string
          registration_date?: string | null
          shop_image_url?: string | null
          sub_sector?: Database["public"]["Enums"]["sub_sector"] | null
          trade_license_text?: string | null
          trade_license_url?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          business_category?: string | null
          contact_number?: string | null
          created_at?: string
          developer_id?: string | null
          email?: string | null
          enterprise_name?: string
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          location?: string | null
          owner_image_url?: string | null
          owner_name?: string
          registration_date?: string | null
          shop_image_url?: string | null
          sub_sector?: Database["public"]["Enums"]["sub_sector"] | null
          trade_license_text?: string | null
          trade_license_url?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      me_tasks: {
        Row: {
          created_at: string
          id: string
          master_task_id: string
          me_profile_id: string
          notes: string | null
          proof_url: string | null
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          master_task_id: string
          me_profile_id: string
          notes?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          master_task_id?: string
          me_profile_id?: string
          notes?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "me_tasks_master_task_id_fkey"
            columns: ["master_task_id"]
            isOneToOne: false
            referencedRelation: "master_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "me_tasks_me_profile_id_fkey"
            columns: ["me_profile_id"]
            isOneToOne: false
            referencedRelation: "me_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          master_product_id: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          master_product_id: string
          order_id: string
          quantity: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          master_product_id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          developer_id: string | null
          id: string
          me_profile_id: string
          notes: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          developer_id?: string | null
          id?: string
          me_profile_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          developer_id?: string | null
          id?: string
          me_profile_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_reports: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          developer_id: string | null
          id: string
          item_name: string
          me_profile_id: string
          month: string
          note: string | null
          quantity_sold: number
          status: Database["public"]["Enums"]["sales_report_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          developer_id?: string | null
          id?: string
          item_name: string
          me_profile_id: string
          month: string
          note?: string | null
          quantity_sold: number
          status?: Database["public"]["Enums"]["sales_report_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          developer_id?: string | null
          id?: string
          item_name?: string
          me_profile_id?: string
          month?: string
          note?: string | null
          quantity_sold?: number
          status?: Database["public"]["Enums"]["sales_report_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_access_me_profile: {
        Args: { _me_profile_id: string }
        Returns: boolean
      }
      can_modify_me_profile: {
        Args: { _me_profile_id: string }
        Returns: boolean
      }
      get_account_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["account_status"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "developer" | "me"
      order_status: "pending" | "approved" | "rejected"
      sales_report_status:
        | "pending_review"
        | "under_developer_review"
        | "approved"
        | "rejected"
      sub_sector:
        | "Automobile Workshop"
        | "Dairy products"
        | "Dry fish processing and trade"
        | "Eco-friendly tourism"
        | "Full grain rice"
        | "High-value crops"
        | "High-value handicrafts rural area"
        | "Leather products"
        | "Loom"
        | "Machinery & Equipment"
        | "Metal products"
        | "Mini garments"
        | "Poultry"
      task_status: "pending" | "processing" | "completed"
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
      account_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "developer", "me"],
      order_status: ["pending", "approved", "rejected"],
      sales_report_status: [
        "pending_review",
        "under_developer_review",
        "approved",
        "rejected",
      ],
      sub_sector: [
        "Automobile Workshop",
        "Dairy products",
        "Dry fish processing and trade",
        "Eco-friendly tourism",
        "Full grain rice",
        "High-value crops",
        "High-value handicrafts rural area",
        "Leather products",
        "Loom",
        "Machinery & Equipment",
        "Metal products",
        "Mini garments",
        "Poultry",
      ],
      task_status: ["pending", "processing", "completed"],
    },
  },
} as const
