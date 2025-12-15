"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const entityKinds = ["group", "user"] as const;

const createTimerSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  kind: z.enum(entityKinds),
  durationSeconds: z.number().int().min(10, "O tempo mínimo é 10 segundos"),
  avatarUrl: z.string().url().nullable().optional(),
  groupId: z.string().uuid().nullable().optional()
});

const updateTimerSchema = z.object({
  timerId: z.string().uuid(),
  durationSeconds: z.number().int().min(10),
  name: z.string().min(1),
  avatarUrl: z.string().url().nullable().optional(),
  groupId: z.string().uuid().nullable().optional()
});

const identifierSchema = z.object({
  timerId: z.string().uuid()
});

export async function createEntityTimer(payload: z.infer<typeof createTimerSchema>) {
  const input = createTimerSchema.parse(payload);
  const supabase = createServiceSupabaseClient();

  const { data: lastTimer } = await supabase
    .from("timers")
    .select("order_index")
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const orderIndex = (lastTimer?.order_index ?? -1) + 1;

  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .insert({
      name: input.name,
      kind: input.kind,
      avatar_url: input.avatarUrl ?? null,
      group_id: input.kind === "user" ? input.groupId ?? null : null
    })
    .select()
    .single();

  if (entityError) {
    throw entityError;
  }

  const { error: timerError } = await supabase.from("timers").insert({
    entity_id: entity.id,
    duration_seconds: input.durationSeconds,
    order_index: orderIndex
  });

  if (timerError) {
    throw timerError;
  }

  revalidatePath("/control");
  revalidatePath("/display");
}

export async function updateEntityTimer(payload: z.infer<typeof updateTimerSchema>) {
  const input = updateTimerSchema.parse(payload);
  const supabase = createServiceSupabaseClient();

  const { data: timer, error: timerFetchError } = await supabase
    .from("timers")
    .select("entity_id")
    .eq("id", input.timerId)
    .single();

  if (timerFetchError) {
    throw timerFetchError;
  }

  const { data: entity, error: entityFetchError } = await supabase
    .from("entities")
    .select("kind")
    .eq("id", timer.entity_id)
    .single();

  if (entityFetchError) {
    throw entityFetchError;
  }

  const updates = [
    supabase
      .from("entities")
      .update({
        name: input.name,
        avatar_url: input.avatarUrl ?? null,
        group_id: entity.kind === "user" ? input.groupId ?? null : null
      })
      .eq("id", timer.entity_id),
    supabase.from("timers").update({ duration_seconds: input.durationSeconds }).eq("id", input.timerId)
  ];

  const [{ error: entityError }, { error: timerError }] = await Promise.all(updates);

  if (entityError) {
    throw entityError;
  }

  if (timerError) {
    throw timerError;
  }

  revalidatePath("/control");
  revalidatePath("/display");
}

export async function deleteTimer(payload: z.infer<typeof identifierSchema>) {
  const input = identifierSchema.parse(payload);
  const supabase = createServiceSupabaseClient();

  const { data: timer, error: timerError } = await supabase
    .from("timers")
    .select("entity_id")
    .eq("id", input.timerId)
    .single();

  if (timerError) {
    throw timerError;
  }

  const [{ error: deleteTimerError }, { error: deleteEntityError }] = await Promise.all([
    supabase.from("timers").delete().eq("id", input.timerId),
    supabase.from("entities").delete().eq("id", timer.entity_id)
  ]);

  if (deleteTimerError) {
    throw deleteTimerError;
  }

  if (deleteEntityError) {
    throw deleteEntityError;
  }

  revalidatePath("/control");
  revalidatePath("/display");
}

export async function resumeTimerAction(payload: z.infer<typeof identifierSchema>) {
  const input = identifierSchema.parse(payload);
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.rpc("resume_timer", { target_timer: input.timerId });

  if (error) {
    throw error;
  }

  revalidatePath("/control");
  revalidatePath("/display");
}

export async function pauseTimerAction(payload: z.infer<typeof identifierSchema>) {
  const input = identifierSchema.parse(payload);
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.rpc("pause_timer", { target_timer: input.timerId });

  if (error) {
    throw error;
  }

  revalidatePath("/control");
  revalidatePath("/display");
}

export async function resetTimerAction(payload: z.infer<typeof identifierSchema> & { newDurationSeconds?: number }) {
  const { timerId, newDurationSeconds } = identifierSchema.extend({
    newDurationSeconds: z.number().int().min(10).optional()
  }).parse(payload);
  const supabase = createServiceSupabaseClient();

  const { error } = await supabase.rpc("reset_timer", {
    target_timer: timerId,
    new_duration: newDurationSeconds ?? null
  });

  if (error) {
    throw error;
  }

  revalidatePath("/control");
  revalidatePath("/display");
}
