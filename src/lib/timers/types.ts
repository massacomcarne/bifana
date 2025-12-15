import type { Database, TimerStatus } from "@/lib/supabase/types";

type TimerRow = Database["public"]["Tables"]["timers"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];

export interface TimerWithEntity extends TimerRow {
  entity: EntityRow;
  group?: EntityRow | null;
}

export interface TimersSnapshot {
  timers: TimerWithEntity[];
  activeTimerId: string | null;
}

export type { TimerStatus };
