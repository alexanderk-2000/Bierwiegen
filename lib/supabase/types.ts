export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          name: string;
          host_user_id: string;
          status: "setup" | "playing" | "ended" | "archived";
          active_round_id: string | null;
          coin_flip_result: "heaviest" | "lightest" | null;
          penalty_config: Json;
          is_online: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          host_user_id: string;
          status: "setup" | "playing" | "ended" | "archived";
          active_round_id?: string | null;
          coin_flip_result?: "heaviest" | "lightest" | null;
          penalty_config?: Json;
          is_online?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["games"]["Insert"]>;
        Relationships: [];
      };
      game_players: {
        Row: {
          id: string;
          game_id: string;
          user_id: string | null;
          display_name: string;
          is_guest: boolean;
          role: "host" | "player" | "viewer";
          beer_brand: string | null;
          bottle_size_liters: number | null;
          start_weight: number | null;
          current_weight: number | null;
          empty_bottle_weight: number | null;
          penalty_points: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          user_id?: string | null;
          display_name: string;
          is_guest?: boolean;
          role: "host" | "player" | "viewer";
          beer_brand?: string | null;
          bottle_size_liters?: number | null;
          start_weight?: number | null;
          current_weight?: number | null;
          empty_bottle_weight?: number | null;
          penalty_points?: number;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["game_players"]["Insert"]>;
        Relationships: [];
      };
      rounds: {
        Row: {
          id: string;
          game_id: string;
          round_number: number;
          type: "normal" | "empty_finish";
          caller_game_player_id: string | null;
          target_weight: number | null;
          status: "setup" | "input" | "review" | "completed";
          penalty_config: Json | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          game_id: string;
          round_number: number;
          type: "normal" | "empty_finish";
          caller_game_player_id?: string | null;
          target_weight?: number | null;
          status: "setup" | "input" | "review" | "completed";
          penalty_config?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["rounds"]["Insert"]>;
        Relationships: [];
      };
      measurements: {
        Row: {
          id: string;
          round_id: string;
          game_player_id: string;
          previous_weight: number;
          weight: number;
          deviation: number | null;
          exact_hit: boolean;
          is_caller: boolean;
          is_worst: boolean;
          penalty_points_received: number;
          consumed_grams: number | null;
          source: "manual" | "corrected" | "camera";
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          game_player_id: string;
          previous_weight: number;
          weight: number;
          deviation?: number | null;
          exact_hit?: boolean;
          is_caller?: boolean;
          is_worst?: boolean;
          penalty_points_received?: number;
          consumed_grams?: number | null;
          source: "manual" | "corrected" | "camera";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["measurements"]["Insert"]>;
        Relationships: [];
      };
      empty_bottle_measurements: {
        Row: {
          id: string;
          round_id: string;
          game_player_id: string;
          previous_weight: number;
          empty_bottle_weight: number;
          consumed_in_final_round: number;
          coin_flip_loser: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          game_player_id: string;
          previous_weight: number;
          empty_bottle_weight: number;
          consumed_in_final_round?: number;
          coin_flip_loser?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["empty_bottle_measurements"]["Insert"]>;
        Relationships: [];
      };
      penalties: {
        Row: {
          id: string;
          game_id: string;
          round_id: string | null;
          game_player_id: string;
          points: number;
          reason:
            | "worst_deviation"
            | "caller_worst_deviation"
            | "exact_hit_distribution"
            | "empty_bottle_coin_flip"
            | "manual_correction";
          awarded_by_game_player_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          round_id?: string | null;
          game_player_id: string;
          points: number;
          reason:
            | "worst_deviation"
            | "caller_worst_deviation"
            | "exact_hit_distribution"
            | "empty_bottle_coin_flip"
            | "manual_correction";
          awarded_by_game_player_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["penalties"]["Insert"]>;
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          game_id: string;
          invited_user_id: string | null;
          invited_email: string | null;
          invited_by_user_id: string;
          invite_token: string | null;
          status: "pending" | "accepted" | "declined" | "expired";
          created_at: string;
          expires_at: string | null;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          game_id: string;
          invited_user_id?: string | null;
          invited_email?: string | null;
          invited_by_user_id: string;
          invite_token?: string | null;
          status: "pending" | "accepted" | "declined" | "expired";
          created_at?: string;
          expires_at?: string | null;
          responded_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      user_overall_stats: {
        Row: {
          user_id: string | null;
          games_played: number | null;
          games_won: number | null;
          games_lost: number | null;
          total_penalty_points: number | null;
          avg_penalty_points_per_game: number | null;
          average_deviation: number | null;
          exact_hits: number | null;
          worst_rounds: number | null;
          caller_rounds: number | null;
          caller_worst_rounds: number | null;
          exact_hit_rate: number | null;
          max_deviation: number | null;
          biggest_sip_grams: number | null;
          avg_consumed_per_round: number | null;
        };
        Relationships: [];
      };
      user_beer_stats: {
        Row: {
          user_id: string | null;
          brand: string | null;
          games: number | null;
          exact_hits: number | null;
          avg_deviation: number | null;
          total_penalty_points: number | null;
          avg_consumed_per_round: number | null;
          total_measurements: number | null;
        };
        Relationships: [];
      };
      user_bottle_size_stats: {
        Row: {
          user_id: string | null;
          size_liters: number | null;
          games: number | null;
          avg_deviation: number | null;
          total_penalty_points: number | null;
          avg_consumed_per_round: number | null;
          total_measurements: number | null;
        };
        Relationships: [];
      };
      user_game_history: {
        Row: {
          user_id: string | null;
          game_id: string | null;
          game_name: string | null;
          status: string | null;
          created_at: string | null;
          updated_at: string | null;
          penalty_points: number | null;
          beer_brand: string | null;
          bottle_size_liters: number | null;
          player_count: number | null;
          is_host: boolean | null;
          outcome: "won" | "lost" | null;
        };
        Relationships: [];
      };
      game_final_stats: {
        Row: {
          game_id: string | null;
          game_player_id: string | null;
          user_id: string | null;
          display_name: string | null;
          penalty_points: number | null;
          exact_hits: number | null;
          worst_rounds: number | null;
          caller_rounds: number | null;
          avg_deviation: number | null;
          max_deviation: number | null;
          total_consumed_grams: number | null;
          avg_consumed_per_round: number | null;
          biggest_sip_grams: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_game_host: { Args: { game_uuid: string }; Returns: boolean };
      is_game_member: { Args: { game_uuid: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
