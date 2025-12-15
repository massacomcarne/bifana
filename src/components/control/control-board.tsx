"use client";

import { useMemo } from "react";
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
  updateTimerDurationAction
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

  const cardTimers = useMemo<CardTimer[]>(() => {
    return sortedTimers.flatMap((timer) => {
      const isActive = snapshot.activeTimerId ? snapshot.activeTimerId === timer.id : timer.is_default;

      if (timer.members.length > 0) {
        return timer.members.map<CardTimer>((member) => ({
          id: `${timer.id}-${member.id}`,
          timer,
          displayEntity: member,
          label: timer.entity.kind === "group" ? timer.entity.name : timer.group?.name ?? null,
          isActive
        }));
      }

      return [
        {
          id: timer.id,
          timer,
          displayEntity: timer.entity,
          label: timer.group?.name ?? null,
          isActive
        }
      ];
    });
  }, [sortedTimers, snapshot.activeTimerId]);

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
    members?: Array<{ name: string; avatarUrl?: string | null }>;
  }) => {
    await createEntityTimer({
      name: payload.name,
      kind: "group",
      durationSeconds: payload.durationSeconds,
      avatarUrl: payload.avatarUrl ?? undefined,
      members: payload.members
    });
  };

  const handleAddMembers = async (payload: Parameters<typeof addGroupMembersAction>[0]) => {
    await addGroupMembersAction(payload);
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

        <NewTimerDialog existingTimers={sortedTimers} onCreateGroup={handleCreateGroup} onAddMembers={handleAddMembers} />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {cardTimers.map(({ id, timer, displayEntity, label, isActive }) => (
            <TimerControlCard
              key={id}
              timer={timer}
              displayEntity={displayEntity}
              label={label}
              isActive={isActive}
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
}
