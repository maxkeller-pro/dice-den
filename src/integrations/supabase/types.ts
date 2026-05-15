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
      bids: {
        Row: {
          action: string
          created_at: string
          face: number | null
          id: string
          player_id: string
          quantity: number | null
          round_id: string
        }
        Insert: {
          action: string
          created_at?: string
          face?: number | null
          id?: string
          player_id: string
          quantity?: number | null
          round_id: string
        }
        Update: {
          action?: string
          created_at?: string
          face?: number | null
          id?: string
          player_id?: string
          quantity?: number | null
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      game_events: {
        Row: {
          created_at: string
          data: Json
          game_id: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json
          game_id: string
          id?: string
          type: string
        }
        Update: {
          created_at?: string
          data?: Json
          game_id?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          dice_count: number
          game_id: string
          id: string
          is_connected: boolean
          is_eliminated: boolean
          joined_at: string
          seat: number
          user_id: string
        }
        Insert: {
          dice_count?: number
          game_id: string
          id?: string
          is_connected?: boolean
          is_eliminated?: boolean
          joined_at?: string
          seat: number
          user_id: string
        }
        Update: {
          dice_count?: number
          game_id?: string
          id?: string
          is_connected?: boolean
          is_eliminated?: boolean
          joined_at?: string
          seat?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          code: string
          created_at: string
          current_round_id: string | null
          current_turn_player_id: string | null
          ended_at: string | null
          host_id: string
          id: string
          max_players: number
          started_at: string | null
          starting_dice: number
          status: Database["public"]["Enums"]["game_status"]
          winner_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_round_id?: string | null
          current_turn_player_id?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          max_players?: number
          started_at?: string | null
          starting_dice?: number
          status?: Database["public"]["Enums"]["game_status"]
          winner_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_round_id?: string | null
          current_turn_player_id?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          max_players?: number
          started_at?: string | null
          starting_dice?: number
          status?: Database["public"]["Enums"]["game_status"]
          winner_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          elo: number
          games_played: number
          is_guest: boolean
          losses: number
          user_id: string
          username: string
          wins: number
        }
        Insert: {
          created_at?: string
          elo?: number
          games_played?: number
          is_guest?: boolean
          losses?: number
          user_id: string
          username: string
          wins?: number
        }
        Update: {
          created_at?: string
          elo?: number
          games_played?: number
          is_guest?: boolean
          losses?: number
          user_id?: string
          username?: string
          wins?: number
        }
        Relationships: []
      }
      round_dice: {
        Row: {
          dice: number[]
          round_id: string
          user_id: string
        }
        Insert: {
          dice: number[]
          round_id: string
          user_id: string
        }
        Update: {
          dice?: number[]
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_dice_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          actual_count: number | null
          call_type: string | null
          caller_id: string | null
          current_player_id: string
          dice_snapshot: Json | null
          game_id: string
          id: string
          is_palifico: boolean
          last_bid_face: number | null
          last_bid_quantity: number | null
          last_bidder_id: string | null
          loser_id: string | null
          revealed_at: string | null
          round_number: number
          started_at: string
          starter_player_id: string
          status: string
        }
        Insert: {
          actual_count?: number | null
          call_type?: string | null
          caller_id?: string | null
          current_player_id: string
          dice_snapshot?: Json | null
          game_id: string
          id?: string
          is_palifico?: boolean
          last_bid_face?: number | null
          last_bid_quantity?: number | null
          last_bidder_id?: string | null
          loser_id?: string | null
          revealed_at?: string | null
          round_number: number
          started_at?: string
          starter_player_id: string
          status?: string
        }
        Update: {
          actual_count?: number | null
          call_type?: string | null
          caller_id?: string | null
          current_player_id?: string
          dice_snapshot?: Json | null
          game_id?: string
          id?: string
          is_palifico?: boolean
          last_bid_face?: number | null
          last_bid_quantity?: number | null
          last_bidder_id?: string | null
          loser_id?: string | null
          revealed_at?: string | null
          round_number?: number
          started_at?: string
          starter_player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
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
      yams_events: {
        Row: {
          created_at: string
          data: Json
          game_id: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json
          game_id: string
          id?: string
          type: string
        }
        Update: {
          created_at?: string
          data?: Json
          game_id?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "yams_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "yams_games"
            referencedColumns: ["id"]
          },
        ]
      }
      yams_games: {
        Row: {
          code: string
          created_at: string
          current_dice: number[]
          current_player_id: string | null
          ended_at: string | null
          held: boolean[]
          host_id: string
          id: string
          max_players: number
          rolls_used: number
          started_at: string | null
          status: Database["public"]["Enums"]["game_status"]
          winner_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_dice?: number[]
          current_player_id?: string | null
          ended_at?: string | null
          held?: boolean[]
          host_id: string
          id?: string
          max_players?: number
          rolls_used?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          winner_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_dice?: number[]
          current_player_id?: string | null
          ended_at?: string | null
          held?: boolean[]
          host_id?: string
          id?: string
          max_players?: number
          rolls_used?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["game_status"]
          winner_id?: string | null
        }
        Relationships: []
      }
      yams_players: {
        Row: {
          game_id: string
          id: string
          is_connected: boolean
          joined_at: string
          scorecard: Json
          seat: number
          total: number
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          is_connected?: boolean
          joined_at?: string
          scorecard?: Json
          seat: number
          total?: number
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          is_connected?: boolean
          joined_at?: string
          scorecard?: Json
          seat?: number
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "yams_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "yams_games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _apply_elo: {
        Args: { p_game_id: string; p_winner: string }
        Returns: undefined
      }
      _next_player: {
        Args: { p_current: string; p_game_id: string }
        Returns: string
      }
      _resolve_round: {
        Args: { p_call_type: string; p_caller: string; p_game_id: string }
        Returns: undefined
      }
      _start_round: {
        Args: { p_game_id: string; p_starter: string }
        Returns: string
      }
      _yams_calc_score: {
        Args: { p_cat: string; p_dice: number[] }
        Returns: number
      }
      _yams_next_player: {
        Args: { p_current: string; p_game_id: string }
        Returns: string
      }
      gen_game_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rpc_call_calza: { Args: { p_game_id: string }; Returns: undefined }
      rpc_call_dudo: { Args: { p_game_id: string }; Returns: undefined }
      rpc_create_game: {
        Args: never
        Returns: {
          code: string
          game_id: string
        }[]
      }
      rpc_join_game: { Args: { p_code: string }; Returns: string }
      rpc_next_round: { Args: { p_game_id: string }; Returns: undefined }
      rpc_place_bid: {
        Args: { p_face: number; p_game_id: string; p_quantity: number }
        Returns: undefined
      }
      rpc_set_username: { Args: { p_username: string }; Returns: undefined }
      rpc_start_game: { Args: { p_game_id: string }; Returns: undefined }
      yams_create_game: {
        Args: never
        Returns: {
          code: string
          game_id: string
        }[]
      }
      yams_join_game: { Args: { p_code: string }; Returns: string }
      yams_roll: {
        Args: { p_game_id: string; p_held: boolean[] }
        Returns: undefined
      }
      yams_score: {
        Args: { p_category: string; p_game_id: string }
        Returns: undefined
      }
      yams_set_held: {
        Args: { p_game_id: string; p_held: boolean[] }
        Returns: undefined
      }
      yams_start_game: { Args: { p_game_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      game_status: "lobby" | "playing" | "ended"
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
      game_status: ["lobby", "playing", "ended"],
    },
  },
} as const
