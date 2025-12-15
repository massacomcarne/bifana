import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { TimerWithEntity, TimersSnapshot } from "./types";

function shouldReturnEmpty(error: unknown) {
  if (!error) {
    return false;
  }

  if (error instanceof Error) {
    const message = error.message ?? "";
    if (
      message.includes("Missing Supabase service credentials") ||
      message.includes("Missing NEXT_PUBLIC_SUPABASE_URL") ||
      message.includes("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
      message.includes("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    ) {
      return true;
    }
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "PGRST205") {
      return true;
    }
  }

  return false;
}

function mapTimers(
  timers: Database["public"]["Tables"]["timers"]["Row"][],
  entities: Database["public"]["Tables"]["entities"]["Row"][]
): TimerWithEntity[] {
  const entityMap = new Map(entities.map((entity) => [entity.id, entity]));
  const membersByGroup = new Map<string, Database["public"]["Tables"]["entities"]["Row"][]>();

  for (const entity of entities) {
    if (entity.kind === "user" && entity.group_id) {
      const current = membersByGroup.get(entity.group_id) ?? [];
      current.push(entity);
      membersByGroup.set(entity.group_id, current);
    }
  }

  const enriched: TimerWithEntity[] = [];

  for (const timer of timers) {
    const entity = entityMap.get(timer.entity_id);
    if (!entity) {
      continue;
    }

    const group = entity.group_id ? entityMap.get(entity.group_id) ?? null : null;
    const membersSourceId = entity.kind === "group" ? entity.id : entity.group_id ?? null;
    const members = membersSourceId ? membersByGroup.get(membersSourceId) ?? [] : [];

    enriched.push({
      ...timer,
      entity,
      group,
      members
    });
  }

  return enriched.sort((a, b) => a.order_index - b.order_index || a.created_at.localeCompare(b.created_at));
}

export async function getTimersSnapshot(): Promise<TimersSnapshot> {
  const fallback: TimersSnapshot = { timers: [], activeTimerId: null };

  let supabase;
  try {
    supabase = createServiceSupabaseClient();
  } catch (error) {
    if (shouldReturnEmpty(error)) {
      return fallback;
    }
    throw error;
  }

  const [{ data: timersData, error: timersError }, { data: entitiesData, error: entitiesError }, { data: sessionState, error: sessionError }] =
    await Promise.all([
      supabase.from("timers").select("*").order("order_index", { ascending: true }),
      supabase.from("entities").select("*"),
      supabase.from("session_state").select("*").eq("id", 1).maybeSingle()
    ]);

  if (timersError) {
    if (shouldReturnEmpty(timersError)) {
      return fallback;
    }
    throw timersError;
  }

  if (entitiesError) {
    if (shouldReturnEmpty(entitiesError)) {
      return fallback;
    }
    throw entitiesError;
  }

  if (sessionError) {
    if (shouldReturnEmpty(sessionError)) {
      return fallback;
    }
    throw sessionError;
  }

  if (!timersData || !entitiesData) {
    return fallback;
  }

  const timers = mapTimers(timersData, entitiesData);

  return {
    timers,
    activeTimerId: sessionState?.active_timer_id ?? null
  } satisfies TimersSnapshot;
}
