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
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          image_key: string | null
          image_url: string | null
          layout: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          layout?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          layout?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      dealer_applications: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          note: string | null
          phone: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          note?: string | null
          phone: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          note?: string | null
          phone?: string
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      models: {
        Row: {
          created_at: string
          id: string
          image_key: string | null
          image_url: string | null
          name: string
          series_id: string
          slug: string
          sort: number
          years: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          name: string
          series_id: string
          slug: string
          sort?: number
          years?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          name?: string
          series_id?: string
          slug?: string
          sort?: number
          years?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      nodes: {
        Row: {
          category_id: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          sort: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          sort?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nodes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_dealer_prices: {
        Row: {
          created_at: string
          dealer_price: number | null
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_price?: number | null
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_price?: number | null
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_dealer_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          category_id: string | null
          created_at: string
          description: string | null
          detail_url: string | null
          form_code: string
          id: string
          image_key: string | null
          image_url: string | null
          install_price: number | null
          model_id: string | null
          name: string
          node_id: string | null
          origin: string
          price: number
          price_note: string | null
          sale_price: number | null
          sort: number
          specs: Json
          updated_at: string
          variants: Json
          video_url: string | null
        }
        Insert: {
          brand?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          detail_url?: string | null
          form_code?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          install_price?: number | null
          model_id?: string | null
          name: string
          node_id?: string | null
          origin?: string
          price?: number
          price_note?: string | null
          sale_price?: number | null
          sort?: number
          specs?: Json
          updated_at?: string
          variants?: Json
          video_url?: string | null
        }
        Update: {
          brand?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          detail_url?: string | null
          form_code?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          install_price?: number | null
          model_id?: string | null
          name?: string
          node_id?: string | null
          origin?: string
          price?: number
          price_note?: string | null
          sale_price?: number | null
          sort?: number
          specs?: Json
          updated_at?: string
          variants?: Json
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          category_id: string
          created_at: string
          id: string
          image_key: string | null
          image_url: string | null
          name: string
          slug: string
          sort: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          name: string
          slug: string
          sort?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          image_key?: string | null
          image_url?: string | null
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "series_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string | null
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
      videos: {
        Row: {
          created_at: string
          id: string
          model_id: string
          sort: number
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          sort?: number
          title: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          sort?: number
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
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
      list_admins: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      list_price_viewers: {
        Args: never
        Returns: {
          email: string
        }[]
      }
      set_admin: {
        Args: { _email: string; _enabled: boolean }
        Returns: string
      }
      set_price_viewer: {
        Args: { _email: string; _enabled: boolean }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "price_viewer"
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
      app_role: ["admin", "user", "price_viewer"],
    },
  },
} as const
