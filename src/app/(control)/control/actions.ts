"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const entityKinds = ["group", "user"] as const;

const memberSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  avatarUrl: z.string().url().nullable().optional()
});

const createTimerSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  kind: z.enum(entityKinds),
  durationSeconds: z.number().int().min(10, "O tempo mínimo é 10 segundos"),
  avatarUrl: z.string().url().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  members: z.array(memberSchema).max(20).optional()
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

const addGroupMembersSchema = z.object({
  groupId: z.string().uuid(),
  members: z.array(memberSchema).min(1, "Introduza pelo menos um membro").max(50)
});

const AVATAR_BUCKET = "timer-avatars";
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

type ServiceSupabase = ReturnType<typeof createServiceSupabaseClient>;

async function ensureAvatarBucket(supabase: ServiceSupabase) {
  const { error } = await supabase.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_UPLOAD_SIZE}`,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp"
    ]
  });

  if (error && error.message !== "Bucket already exists") {
    // Ignore bucket already exists error, bubble others
    throw error;
  }
}

function inferFileExtension(file: File) {
  const name = file.name?.split?.(".");
  if (name && name.length > 1) {
    return name.pop();
  }

  switch (file.type) {
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

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

  if (input.kind === "group" && input.members && input.members.length > 0) {
    const membersPayload = input.members.map((member) => ({
      name: member.name,
      kind: "user" as const,
      avatar_url: member.avatarUrl ?? null,
      group_id: entity.id
    }));

    const { error: membersError } = await supabase.from("entities").insert(membersPayload);

    if (membersError) {
      throw membersError;
    }
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

export async function addGroupMembersAction(payload: z.infer<typeof addGroupMembersSchema>) {
  const input = addGroupMembersSchema.parse(payload);
  const supabase = createServiceSupabaseClient();

  const { data: group, error: groupFetchError } = await supabase
    .from("entities")
    .select("id, kind")
    .eq("id", input.groupId)
    .maybeSingle();

  if (groupFetchError) {
    throw groupFetchError;
  }

  if (!group || group.kind !== "group") {
    throw new Error("Grupo não encontrado ou inválido.");
  }

  const rows = input.members.map((member) => ({
    name: member.name,
    kind: "user" as const,
    avatar_url: member.avatarUrl ?? null,
    group_id: group.id
  }));

  const { error: insertError } = await supabase.from("entities").insert(rows);

  if (insertError) {
    throw insertError;
  }

  revalidatePath("/control");
  revalidatePath("/display");
}

export async function uploadTimerAvatarAction(formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Ficheiro inválido.");
  }

  if (!file.type?.startsWith("image/")) {
    throw new Error("Apenas imagens são permitidas.");
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error("Ficheiro superior a 5MB.");
  }

  const supabase = createServiceSupabaseClient();

  await ensureAvatarBucket(supabase);

  const extension = inferFileExtension(file);
  const filename = `${randomUUID()}.${extension}`;
  const storagePath = `avatars/${filename}`;

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: false
  });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(storagePath);

  return { url: publicUrl, path: storagePath };
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
