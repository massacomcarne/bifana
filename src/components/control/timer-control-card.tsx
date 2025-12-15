"use client";

import type { ComponentType } from "react";
import { useTransition } from "react";
import { Pause, Play, RotateCcw, Trash2 } from "lucide-react";
import { useNow } from "@/lib/hooks/use-now";
import { getOverrunSeconds, getRemainingSeconds } from "@/lib/timers/helpers";
import type { TimerWithEntity } from "@/lib/timers/types";
import { CircularTimer } from "@/components/timers/circular-timer";
import { TimerAvatar } from "@/components/timers/timer-avatar";
import { cn } from "@/lib/utils";

interface TimerControlCardProps {
  timer: TimerWithEntity;
  isActive: boolean;
  onResume: (timerId: string) => Promise<void>;
  onPause: (timerId: string) => Promise<void>;
  onReset: (timerId: string) => Promise<void>;
  onDelete: (timerId: string) => Promise<void>;
}

export function TimerControlCard({ timer, isActive, onResume, onPause, onReset, onDelete }: TimerControlCardProps) {
  const now = useNow();
  const [isPending, startTransition] = useTransition();

  const remaining = getRemainingSeconds(timer, now);
  const overrun = getOverrunSeconds(timer, now);
  const running = timer.status === "running";

  const handleResume = () => startTransition(() => void onResume(timer.id));
  const handlePause = () => startTransition(() => void onPause(timer.id));
  const handleReset = () => startTransition(() => void onReset(timer.id));
  const handleDelete = () => startTransition(() => void onDelete(timer.id));

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur transition",
        isActive ? "border-accent ring-2 ring-accent/40" : "border-border",
        isPending ? "opacity-80" : "opacity-100"
      )}
    >
      <div className="flex items-center gap-4">
        <TimerAvatar name={timer.entity.name} avatarUrl={timer.entity.avatar_url} size={64} />
        <div className="flex flex-col">
          <h3 className="text-xl font-semibold leading-tight">{timer.entity.name}</h3>
          {timer.group ? (
            <p className="text-sm uppercase tracking-wide text-muted-foreground">{timer.group.name}</p>
          ) : null}
          <span className="mt-2 inline-flex w-fit items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {running ? "Em curso" : timer.status === "finished" ? "Terminado" : "Pausado"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <CircularTimer
          size={220}
          remainingSeconds={remaining}
          durationSeconds={timer.duration_seconds}
          overrunSeconds={overrun}
        />
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
            <ControlButton
              icon={running ? Pause : Play}
              label={running ? "Pausar" : "Iniciar"}
              onClick={running ? handlePause : handleResume}
              disabled={isPending}
              variant={running ? "secondary" : "primary"}
            />
            <ControlButton icon={RotateCcw} label="Repor" onClick={handleReset} disabled={isPending} />
            <ControlButton icon={Trash2} label="Remover" onClick={handleDelete} disabled={isPending} danger />
          </div>
          <p className="text-sm text-muted-foreground">
            Tempo configurado: {Math.floor(timer.duration_seconds / 60)}m {timer.duration_seconds % 60}s
          </p>
        </div>
      </div>
    </article>
  );
}

interface ControlButtonProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  danger?: boolean;
}

function ControlButton({ icon: Icon, label, onClick, disabled, variant = "primary", danger }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
        variant === "primary" && !danger && "bg-accent text-accent-foreground hover:bg-accent/90",
        variant === "secondary" && !danger && "bg-muted text-foreground hover:bg-muted/80",
        danger && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        disabled && "cursor-not-allowed opacity-70"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
