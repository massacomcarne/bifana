"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { Database } from "@/lib/supabase/types";
import type { TimersSnapshot } from "./types";

type Supabase = SupabaseClient<Database>;

type RealtimeChannel = ReturnType<Supabase["channel"]> | null;

type TimerWithEntityRow = Database["public"]["Tables"]["timers"]["Row"] & {
  entity: Database["public"]["Tables"]["entities"]["Row"];
};

async function loadSnapshot(client: Supabase): Promise<TimersSnapshot> {
  const [{ data: timersData, error: timersError }, { data: sessionData, error: sessionError }] = await Promise.all([
    client
      .from("timers")
      .select(
        `
        id,
        entity_id,
        duration_seconds,
        elapsed_seconds,
        status,
        running_since,
        order_index,
        created_at,
        updated_at,
        entity:entities!timers_entity_id_fkey (
          id,
          kind,
          name,
          avatar_url,
          accent_color,
          group_id,
          created_at,
          updated_at
        )
      `
      )
      .order("order_index", { ascending: true })
      .returns<TimerWithEntityRow[]>(),
    client.from("session_state").select("*").eq("id", 1).maybeSingle()
  ]);

  if (timersError) {
    throw timersError;
  }

  if (sessionError) {
    throw sessionError;
  }

  const groupsToFetch = new Set<string>();
  const memberGroupsToFetch = new Set<string>();
  timersData?.forEach((timer) => {
    if (timer.entity.group_id) {
      groupsToFetch.add(timer.entity.group_id);
    }

    if (timer.entity.kind === "group") {
      memberGroupsToFetch.add(timer.entity.id);
    } else if (timer.entity.kind === "user" && timer.entity.group_id) {
      memberGroupsToFetch.add(timer.entity.group_id);
    }
  });

  let groups: Record<string, Database["public"]["Tables"]["entities"]["Row"]> = {};
  const membersMap = new Map<string, Database["public"]["Tables"]["entities"]["Row"][]>();

  if (groupsToFetch.size > 0) {
    const { data: groupRows, error: groupsError } = await client
      .from("entities")
      .select("*")
      .in("id", Array.from(groupsToFetch));

    if (groupsError) {
      throw groupsError;
    }

    if (groupRows) {
      groups = Object.fromEntries(groupRows.map((group) => [group.id, group]));
    }
  }

  if (memberGroupsToFetch.size > 0) {
    const { data: memberRows, error: membersError } = await client
      .from("entities")
      .select("*")
      .in("group_id", Array.from(memberGroupsToFetch))
      .eq("kind", "user");

    if (membersError) {
      throw membersError;
    }

    memberRows?.forEach((member) => {
      if (!member.group_id) {
        return;
      }
      const list = membersMap.get(member.group_id) ?? [];
      list.push(member);
      membersMap.set(member.group_id, list);
    });
  }

  return {
    timers:
      timersData?.map((timer) => ({
        ...timer,
        group: timer.entity.group_id ? groups[timer.entity.group_id] ?? null : null,
        members:
          timer.entity.kind === "group"
            ? membersMap.get(timer.entity.id) ?? []
            : timer.entity.group_id
              ? membersMap.get(timer.entity.group_id) ?? []
              : []
      })) ?? [],
    activeTimerId: sessionData?.active_timer_id ?? null,
    themeText: sessionData?.theme_text ?? ""
  } satisfies TimersSnapshot;
}

export function useTimers(initial?: TimersSnapshot) {
  const supabase = useSupabase();
  const [snapshot, setSnapshot] = useState<TimersSnapshot>(initial ?? { timers: [], activeTimerId: null, themeText: "" });
  const channelRef = useRef<RealtimeChannel>(null);
  const loadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    try {
      const fresh = await loadSnapshot(supabase);
      setSnapshot(fresh);
    } finally {
      loadingRef.current = false;
    }
  }, [supabase]);

  useEffect(() => {
    if (!initial) {
      refresh();
    }
  }, [initial, refresh]);

  useEffect(() => {
    const channel = supabase
      .channel("timers-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timers" },
        () => {
          refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entities" },
        () => {
          refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_state", filter: "id=eq.1" },
        () => {
          refresh();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [refresh, supabase]);

  return { snapshot, refresh };
}
