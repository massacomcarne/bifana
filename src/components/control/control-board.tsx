"use client";

import { useMemo } from "react";
import { useTimers } from "@/lib/timers/use-timers";
import type { TimersSnapshot } from "@/lib/timers/types";
import { TimerControlCard } from "@/components/control/timer-control-card";
import { NewTimerForm } from "@/components/control/new-timer-form";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  createEntityTimer,
  deleteTimer,
  pauseTimerAction,
  resetTimerAction,
  resumeTimerAction
} from "@/app/(control)/control/actions";

interface ControlBoardProps {
  initialSnapshot: TimersSnapshot;
}

export function ControlBoard({ initialSnapshot }: ControlBoardProps) {
  const { snapshot } = useTimers(initialSnapshot);

  const sortedTimers = useMemo(
    () =>
      [...snapshot.timers].sort((a, b) => a.order_index - b.order_index || a.created_at.localeCompare(b.created_at)),
    [snapshot.timers]
  );

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

  const handleCreate = async (payload: Parameters<typeof createEntityTimer>[0]) => {
    await createEntityTimer(payload);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Painel de Controlo</h1>
              <p className="text-muted-foreground">
                Inicie, pause ou reorganize cronómetros. As alterações são refletidas automaticamente na projeção.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <NewTimerForm existingTimers={sortedTimers} onCreate={handleCreate} />

        <section className="grid gap-6 xl:grid-cols-2">
          {sortedTimers.map((timer) => (
            <TimerControlCard
              key={timer.id}
              timer={timer}
              isActive={timer.id === snapshot.activeTimerId}
              onResume={handleResume}
              onPause={handlePause}
              onReset={handleReset}
              onDelete={handleDelete}
            />
          ))}
        </section>

        {sortedTimers.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Ainda não existem cronómetros. Utilize o formulário acima para começar.
          </p>
        ) : null}
      </div>
    </div>
  );
}
