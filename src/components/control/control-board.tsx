"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TimerWithEntity, TimersSnapshot } from "@/lib/timers/types";
import { useTimers } from "@/lib/timers/use-timers";
import { TimerControlCard } from "@/components/control/timer-control-card";
import { NewTimerDialog } from "@/components/control/new-timer-form";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  addGroupMembersAction,
  createEntityTimer,
  deleteTimer,
  pauseTimerAction,
  resetTimerAction,
  resumeTimerAction,
  updateThemeTextAction,
  updateTimerDurationAction
} from "@/app/(control)/control/actions";
import { useNow } from "@/lib/hooks/use-now";
import { getOverrunSeconds, getRemainingSeconds } from "@/lib/timers/helpers";

interface ControlBoardProps {
  initialSnapshot: TimersSnapshot;
}

export function ControlBoard({ initialSnapshot }: ControlBoardProps) {
  const { snapshot, refresh } = useTimers(initialSnapshot);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [themeText, setThemeText] = useState(initialSnapshot.themeText ?? "");
  const [updatingTheme, setUpdatingTheme] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  const sortedTimers = [...snapshot.timers].sort(
    (a, b) => a.order_index - b.order_index || a.created_at.localeCompare(b.created_at)
  );

  const cardTimers: CardTimer[] = sortedTimers.flatMap((timer) => {
    const isActive = snapshot.activeTimerId ? snapshot.activeTimerId === timer.id : timer.status === "running";
    const timerAccent = timer.entity.kind === "group"
      ? timer.entity.accent_color
      : timer.group?.accent_color ?? timer.entity.accent_color ?? null;

    if (timer.members.length > 0) {
      return timer.members.map<CardTimer>((member) => ({
        id: `${timer.id}-${member.id}`,
        timer,
        displayEntity: member,
        label: timer.entity.kind === "group" ? timer.entity.name : timer.group?.name ?? null,
        isActive,
        accentColor: timer.entity.kind === "group" ? timer.entity.accent_color ?? null : timerAccent
      }));
    }

    return [
      {
        id: timer.id,
        timer,
        displayEntity: timer.entity,
        label: timer.group?.name ?? null,
        isActive,
        accentColor: timerAccent
      }
    ];
  });

  const handleResume = async (timerId: string) => {
    await resumeTimerAction({ timerId });
  };

  const handlePause = async (timerId: string) => {
    await pauseTimerAction({ timerId });
  };

  const handleReset = async (timerId: string) => {
    await resetTimerAction({ timerId });
  };

  const handleDelete = async (timerId: string) => {
    await deleteTimer({ timerId });
  };

  const handleUpdateDuration = async (timerId: string, durationSeconds: number) => {
    await updateTimerDurationAction({ timerId, durationSeconds });
  };

  const handleCreateGroup = async (payload: {
    name: string;
    durationSeconds: number;
    avatarUrl?: string | null;
    accentColor?: string | null;
    members?: Array<{ name: string; avatarUrl?: string | null }>;
  }) => {
    await createEntityTimer({
      name: payload.name,
      kind: "group",
      durationSeconds: payload.durationSeconds,
      avatarUrl: payload.avatarUrl ?? undefined,
      accentColor: payload.accentColor ?? undefined,
      members: payload.members
    });
  };

  const handleAddMembers = async (payload: Parameters<typeof addGroupMembersAction>[0]) => {
    await addGroupMembersAction(payload);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TimerBuzzer timers={snapshot.timers} activeTimerId={snapshot.activeTimerId} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Painel de Controlo</h1>
              <p className="text-muted-foreground">
                
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <NewTimerDialog existingTimers={sortedTimers} onCreateGroup={handleCreateGroup} onAddMembers={handleAddMembers} />
          <button
            type="button"
            onClick={() => {
              setThemeError(null);
              setThemeText(snapshot.themeText ?? "");
              setThemeDialogOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent"
          >
            Editar tema
          </button>
          <span className="text-sm text-muted-foreground">
            {snapshot.themeText?.trim()
              ? `Tema atual: ${snapshot.themeText.trim()}`
              : "Sem tema definido"}
          </span>
        </div>

        {themeDialogOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-12">
            <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
              <h2 className="text-lg font-semibold">Editar tema do display</h2>
              <p className="mt-1 text-sm text-muted-foreground">O texto introdutório no ecrã de projeção será atualizado imediatamente.</p>
              <form
                className="mt-4 flex flex-col gap-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setUpdatingTheme(true);
                  setThemeError(null);
                  try {
                    const result = await updateThemeTextAction({ themeText });
                    setThemeText(result.themeText);
                    await refresh();
                    setThemeDialogOpen(false);
                  } catch (error) {
                    console.error(error);
                    setThemeError(error instanceof Error ? error.message : "Não foi possível atualizar o tema.");
                  } finally {
                    setUpdatingTheme(false);
                  }
                }}
              >
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Texto do cabeçalho
                  <input
                    type="text"
                    value={themeText}
                    onChange={(event) => setThemeText(event.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Ex: Batalha de Apresentações"
                    maxLength={200}
                  />
                </label>
                {themeError ? <p className="text-sm text-destructive">{themeError}</p> : null}
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setThemeDialogOpen(false)}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updatingTheme}
                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 disabled:opacity-60"
                  >
                    OK
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {cardTimers.map(({ id, timer, displayEntity, label, isActive, accentColor }) => (
            <TimerControlCard
              key={id}
              timer={timer}
              displayEntity={displayEntity}
              label={label}
              isActive={isActive}
              accentColor={accentColor}
              onResume={handleResume}
              onPause={handlePause}
              onReset={handleReset}
              onDelete={handleDelete}
              onEditDuration={handleUpdateDuration}
            />
          ))}
        </section>

        {cardTimers.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Ainda não existem cronómetros. Utilize o formulário acima para começar.
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface CardTimer {
  id: string;
  timer: TimerWithEntity;
  displayEntity: TimerWithEntity["entity"];
  label: string | null;
  isActive: boolean;
  accentColor: string | null;
}

function TimerBuzzer({ timers, activeTimerId }: { timers: TimerWithEntity[]; activeTimerId: string | null }) {
  const now = useNow();
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerStateRef = useRef(new Map<string, { zeroTriggered: boolean; lastMinuteIndex: number }>());

  const playBeep = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    let context = audioContextRef.current;
    if (!context) {
      context = new AudioContextClass();
      audioContextRef.current = context;
    }

    if (context.state === "suspended") {
      void context.resume().catch(() => {});
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  }, []);

  useEffect(() => {
    const stateMap = timerStateRef.current;
    const activeTimers = activeTimerId
      ? timers.filter((timer) => timer.id === activeTimerId)
      : timers.filter((timer) => timer.status === "running");
    const activeIds = new Set<string>();

    if (activeTimers.length === 0) {
      stateMap.clear();
      return;
    }

    for (const timer of activeTimers) {
      activeIds.add(timer.id);

      if (timer.status !== "running") {
        stateMap.set(timer.id, { zeroTriggered: false, lastMinuteIndex: -1 });
        continue;
      }

      const remaining = getRemainingSeconds(timer, now);
      const overrun = getOverrunSeconds(timer, now);

      const state = stateMap.get(timer.id) ?? { zeroTriggered: false, lastMinuteIndex: -1 };

      if (remaining > 0) {
        state.zeroTriggered = false;
        state.lastMinuteIndex = -1;
        stateMap.set(timer.id, state);
        continue;
      }

      if (!state.zeroTriggered) {
        playBeep();
        state.zeroTriggered = true;
        state.lastMinuteIndex = 0;
        stateMap.set(timer.id, state);
        continue;
      }

      const minuteIndex = Math.floor(overrun / 60);
      if (minuteIndex > state.lastMinuteIndex) {
        playBeep();
        state.lastMinuteIndex = minuteIndex;
      }

      stateMap.set(timer.id, state);
    }

    for (const key of Array.from(stateMap.keys())) {
      if (!activeIds.has(key)) {
        stateMap.delete(key);
      }
    }
  }, [timers, activeTimerId, now, playBeep]);

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      if (context) {
        void context.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  return null;
}
