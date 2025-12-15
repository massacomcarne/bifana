"use client";

import { useEffect, useState, useTransition } from "react";
import type { ComponentType } from "react";
import { Check, CheckCircle2, Pause, Pencil, Play, RotateCcw, Trash2, X } from "lucide-react";
import { useNow } from "@/lib/hooks/use-now";
import { getOverrunSeconds, getRemainingSeconds } from "@/lib/timers/helpers";
import type { TimerWithEntity } from "@/lib/timers/types";
import { CircularTimer } from "@/components/timers/circular-timer";
import { TimerAvatar } from "@/components/timers/timer-avatar";
import { cn } from "@/lib/utils";

interface TimerControlCardProps {
  timer: TimerWithEntity;
  displayEntity: TimerWithEntity["entity"];
  label: string | null;
  isActive: boolean;
  accentColor: string | null;
  onResume: (timerId: string) => Promise<void>;
  onPause: (timerId: string) => Promise<void>;
  onReset: (timerId: string) => Promise<void>;
  onDelete: (timerId: string) => Promise<void>;
  onEditDuration: (timerId: string, durationSeconds: number) => Promise<void>;
}

export function TimerControlCard({
  timer,
  displayEntity,
  label,
  isActive,
  accentColor,
  onResume,
  onPause,
  onReset,
  onDelete,
  onEditDuration
}: TimerControlCardProps) {
  const now = useNow();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [minuteInput, setMinuteInput] = useState(() => Math.floor(timer.duration_seconds / 60).toString());
  const [secondInput, setSecondInput] = useState(() => (timer.duration_seconds % 60).toString().padStart(2, "0"));
  const [editError, setEditError] = useState<string | null>(null);

  const remaining = getRemainingSeconds(timer, now);
  const overrun = getOverrunSeconds(timer, now);
  const running = timer.status === "running";
  const statusDescription = running ? "Em curso" : timer.status === "finished" ? "Terminado" : "Pausado";
  const StatusIcon = running ? Play : timer.status === "finished" ? CheckCircle2 : Pause;

  const syncInputsFromTimer = () => {
    const minutes = Math.floor(timer.duration_seconds / 60);
    const seconds = timer.duration_seconds % 60;
    setMinuteInput(minutes.toString());
    setSecondInput(seconds.toString().padStart(2, "0"));
  };

  useEffect(() => {
    if (isEditing) {
      return;
    }
    syncInputsFromTimer();
  }, [timer.duration_seconds, isEditing]);

  const handleResume = () => startTransition(() => void onResume(timer.id));
  const handlePause = () => startTransition(() => void onPause(timer.id));
  const handleReset = () => startTransition(() => void onReset(timer.id));
  const handleDelete = () => startTransition(() => void onDelete(timer.id));
  const handleEditClick = () => {
    syncInputsFromTimer();
    setEditError(null);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditError(null);
    syncInputsFromTimer();
  };

  const handleEditSave = () => {
    const minutesRaw = minuteInput.trim();
    const secondsRaw = secondInput.trim();

    const minutesValue = minutesRaw === "" ? 0 : Number.parseInt(minutesRaw, 10);
    const secondsValue = secondsRaw === "" ? 0 : Number.parseInt(secondsRaw, 10);

    if (!Number.isFinite(minutesValue) || minutesValue < 0) {
      setEditError("Introduza minutos válidos.");
      return;
    }

    if (!Number.isFinite(secondsValue) || secondsValue < 0 || secondsValue > 59) {
      setEditError("Os segundos devem estar entre 0 e 59.");
      return;
    }

    const totalSeconds = minutesValue * 60 + secondsValue;

    if (totalSeconds < 10) {
      setEditError("O tempo mínimo é 10 segundos.");
      return;
    }

    if (totalSeconds === timer.duration_seconds) {
      setIsEditing(false);
      setEditError(null);
      syncInputsFromTimer();
      return;
    }

    setEditError(null);

    const runUpdate = async () => {
      try {
        await onEditDuration(timer.id, totalSeconds);
        setIsEditing(false);
        setMinuteInput(minutesValue.toString());
        setSecondInput(secondsValue.toString().padStart(2, "0"));
      } catch (error) {
        setEditError("Não foi possível atualizar o tempo.");
      }
    };

    startTransition(() => {
      void runUpdate();
    });
  };

  return (
    <article
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border bg-card/80 p-4 text-center shadow-sm backdrop-blur transition",
        isActive ? "border-accent ring-4 ring-accent/50" : "border-border",
        isPending ? "opacity-80" : "opacity-100"
      )}
    >
      <div className="flex w-full items-center gap-3">
        <div className="flex-shrink-0">
          <TimerAvatar name={displayEntity.name} avatarUrl={displayEntity.avatar_url} size={48} accentColor={accentColor ?? undefined} />
        </div>
        <div className="flex min-w-0 flex-col items-start gap-0.5 text-left">
          <h3 className="w-full break-words text-lg font-semibold leading-tight">{displayEntity.name}</h3>
          {label ? (
            <p className="w-full break-words text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          ) : null}
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-4">
        <CircularTimer
          size={140}
          remainingSeconds={remaining}
          durationSeconds={timer.duration_seconds}
          overrunSeconds={overrun}
        />
        <div className="flex w-full max-w-xl flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <ControlButton
              icon={running ? Pause : Play}
              label={running ? "Pausar" : "Iniciar"}
              onClick={running ? handlePause : handleResume}
              disabled={isPending}
              variant={running ? "secondary" : "primary"}
            />
            <ControlButton icon={RotateCcw} label="Repor" onClick={handleReset} disabled={isPending} />
            <ControlButton icon={Pencil} label="Editar duração" onClick={handleEditClick} disabled={isPending || isEditing} />
            <ControlButton icon={Trash2} label="Remover" onClick={handleDelete} disabled={isPending} danger />
          </div>
          {isEditing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-end justify-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor={`minutes-${timer.id}`}>
                    Minutos
                  </label>
                  <input
                    id={`minutes-${timer.id}`}
                    type="number"
                    min={0}
                    step={1}
                    value={minuteInput}
                    onChange={(event) => setMinuteInput(event.target.value)}
                    className="h-10 w-20 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={isPending}
                  />
                </div>
                <span className="pb-2 text-lg font-semibold text-muted-foreground">:</span>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground" htmlFor={`seconds-${timer.id}`}>
                    Segundos
                  </label>
                  <input
                    id={`seconds-${timer.id}`}
                    type="number"
                    min={0}
                    max={59}
                    step={1}
                    value={secondInput}
                    onChange={(event) => setSecondInput(event.target.value)}
                    className="h-10 w-20 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <ControlButton icon={Check} label="Guardar duração" onClick={handleEditSave} disabled={isPending} />
                <ControlButton icon={X} label="Cancelar edição" onClick={handleEditCancel} disabled={isPending} variant="secondary" />
              </div>
              {editError ? <p className="text-xs font-semibold text-destructive">{editError}</p> : null}
            </div>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="sr-only">{statusDescription}</span>
              <StatusIcon className="h-4 w-4 text-accent" aria-hidden />
              Tempo configurado: {Math.floor(timer.duration_seconds / 60)}m {timer.duration_seconds % 60}s
            </p>
          )}
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
      title={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition",
        variant === "primary" && !danger && "bg-accent text-accent-foreground hover:bg-accent/90",
        variant === "secondary" && !danger && "bg-muted text-foreground hover:bg-muted/80",
        danger && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        disabled && "cursor-not-allowed opacity-70"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </button>
  );
}
