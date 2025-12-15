"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { PlusCircle } from "lucide-react";
import type { TimerWithEntity } from "@/lib/timers/types";
import { cn } from "@/lib/utils";

interface NewTimerFormProps {
  existingTimers: TimerWithEntity[];
  onCreate: (payload: {
    name: string;
    kind: "group" | "user";
    durationSeconds: number;
    avatarUrl?: string | null;
    groupId?: string | null;
  }) => Promise<void>;
}

export function NewTimerForm({ existingTimers, onCreate }: NewTimerFormProps) {
  const [kind, setKind] = useState<"group" | "user">("group");
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(
    () => existingTimers.filter((timer) => timer.entity.kind === "group"),
    [existingTimers]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const totalSeconds = minutes * 60 + seconds;
    if (totalSeconds <= 0) {
      setError("Defina um tempo superior a zero.");
      return;
    }

    startTransition(async () => {
      try {
        await onCreate({
          name,
          kind,
          durationSeconds: totalSeconds,
          avatarUrl: avatarUrl.trim() || undefined,
          groupId: kind === "user" ? groupId ?? undefined : undefined
        });

        setName("");
        setMinutes(1);
        setSeconds(0);
        setAvatarUrl("");
        setGroupId(null);
        setError(null);
      } catch (actionError: unknown) {
        setError(actionError instanceof Error ? actionError.message : "Não foi possível criar o cronómetro.");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-card/70 p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Adicionar cronómetro</h2>
          <p className="text-sm text-muted-foreground">
            Configure o tempo, selecione o tipo e associe a um grupo se necessário.
          </p>
        </div>
        <div className="flex gap-2 rounded-full bg-muted p-1">
          <ToggleButton active={kind === "group"} onClick={() => setKind("group")}>Grupo</ToggleButton>
          <ToggleButton active={kind === "user"} onClick={() => setKind("user")}>
            Utilizador
          </ToggleButton>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Nome</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={1}
            className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder={kind === "group" ? "Equipa A" : "Orador 1"}
            disabled={isPending}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Fotografia (URL opcional)</span>
          <input
            type="url"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="https://..."
            disabled={isPending}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Minutos</span>
          <input
            type="number"
            min={0}
            value={minutes}
            onChange={(event) => setMinutes(Math.max(0, Number(event.target.value)))}
            className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={isPending}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Segundos</span>
          <input
            type="number"
            min={0}
            max={59}
            value={seconds}
            onChange={(event) =>
              setSeconds(Math.min(59, Math.max(0, Number(event.target.value))))
            }
            className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            disabled={isPending}
          />
        </label>
        {kind === "user" ? (
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Grupo associado</span>
            <select
              value={groupId ?? ""}
              onChange={(event) => setGroupId(event.target.value ? event.target.value : null)}
              className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={isPending || groups.length === 0}
            >
              <option value="">Individual</option>
              {groups.map((groupTimer) => (
                <option key={groupTimer.id} value={groupTimer.entity.id}>
                  {groupTimer.entity.name}
                </option>
              ))}
            </select>
            {groups.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Ainda não existem grupos. Crie um grupo primeiro.
              </span>
            ) : null}
          </label>
        ) : (
          <div className="flex flex-col justify-end gap-2">
            <p className="text-sm text-muted-foreground">
              O grupo pode receber utilizadores adicionais mais tarde.
            </p>
          </div>
        )}
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 self-end rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <PlusCircle className="h-4 w-4" /> Adicionar cronómetro
      </button>
    </form>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1 text-sm font-semibold transition",
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
