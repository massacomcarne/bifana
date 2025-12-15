export type TimerStatus = "paused" | "running" | "finished";

export type Database = {
  public: {
    Tables: {
      entities: {
        Row: {
          id: string;
          kind: "group" | "user";
          name: string;
          avatar_url: string | null;
          accent_color: string | null;
          group_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: "group" | "user";
          name: string;
          avatar_url?: string | null;
          accent_color?: string | null;
          group_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kind?: "group" | "user";
          name?: string;
          avatar_url?: string | null;
          accent_color?: string | null;
          group_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entities_group_id_fkey";
            columns: ["group_id"];
            referencedRelation: "entities";
            referencedColumns: ["id"];
          }
        ];
      };
      session_state: {
        Row: {
          id: number;
          active_timer_id: string | null;
          theme_text: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          active_timer_id?: string | null;
          theme_text?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          active_timer_id?: string | null;
          theme_text?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_state_active_timer_id_fkey";
            columns: ["active_timer_id"];
            referencedRelation: "timers";
            referencedColumns: ["id"];
          }
        ];
      };
      timers: {
        Row: {
          id: string;
          entity_id: string;
          duration_seconds: number;
          elapsed_seconds: number;
          status: TimerStatus;
          running_since: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_id: string;
          duration_seconds: number;
          elapsed_seconds?: number;
          status?: TimerStatus;
          running_since?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_id?: string;
          duration_seconds?: number;
          elapsed_seconds?: number;
          status?: TimerStatus;
          running_since?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timers_entity_id_fkey";
            columns: ["entity_id"];
            referencedRelation: "entities";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      pause_timer: {
        Args: {
          target_timer: string;
        };
        Returns: Database["public"]["Tables"]["timers"]["Row"];
      };
      reset_timer: {
        Args: {
          target_timer: string;
          new_duration?: number | null;
        };
        Returns: Database["public"]["Tables"]["timers"]["Row"];
      };
      resume_timer: {
        Args: {
          target_timer: string;
        };
        Returns: Database["public"]["Tables"]["timers"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
