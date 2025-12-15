"use client";

import { useMemo } from "react";
import { useNow } from "@/lib/hooks/use-now";
import { getOverrunSeconds, getRemainingSeconds } from "@/lib/timers/helpers";
import type { TimerWithEntity, TimersSnapshot } from "@/lib/timers/types";
import { useTimers } from "@/lib/timers/use-timers";
import { CircularTimer } from "@/components/timers/circular-timer";
import { TimerAvatar } from "@/components/timers/timer-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface DisplayBoardProps {
  initialSnapshot: TimersSnapshot;
}

export function DisplayBoard({ initialSnapshot }: DisplayBoardProps) {
  const { snapshot } = useTimers(initialSnapshot);
  const now = useNow();

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

  const activeCard = useMemo(() => {
    if (cardTimers.length === 0) {
      return null;
    }

    if (snapshot.activeTimerId) {
      const match = cardTimers.find((card) => card.timer.id === snapshot.activeTimerId);
      if (match) {
        return match;
      }
    }

    const defaultCard = cardTimers.find((card) => card.isActive);
    return defaultCard ?? cardTimers[0];
  }, [cardTimers, snapshot.activeTimerId]);

  if (!activeCard) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-2xl font-semibold text-muted-foreground">Nenhum cronómetro configurado.</p>
        <p className="mt-2 max-w-md text-muted-foreground/80">
          Adicione cronómetros na página de controlo para começar a projetar os tempos em tempo real.
        </p>
      </div>
    );
  }

  const activeRemaining = getRemainingSeconds(activeCard.timer, now);
  const activeOverrun = getOverrunSeconds(activeCard.timer, now);
  const otherCards = cardTimers.filter((card) => card.id !== activeCard.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col items-center gap-4 text-center">
          <div className="flex w-full flex-col items-center gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">Gestão de Cronómetros</h1>
              <p className="text-muted-foreground">Atualização em tempo real sincronizada com o painel de controlo.</p>
            </div>
            <ThemeToggle className="self-end" />
          </div>
        </header>

        <section className="flex flex-col items-center gap-6">
          <CircularTimer
            size={360}
            remainingSeconds={activeRemaining}
            durationSeconds={activeCard.timer.duration_seconds}
            overrunSeconds={activeOverrun}
            className="drop-shadow-xl"
          />
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-3xl font-semibold">{activeCard.displayEntity.name}</h2>
            {activeCard.label ? (
              <p className="text-sm uppercase tracking-wide text-muted-foreground">{activeCard.label}</p>
            ) : null}
            {activeCard.timer.members.length > 0 ? (
              <div className="mt-1 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {activeCard.timer.members.map((member) => (
                  <span key={member.id} className="rounded-full bg-muted px-3 py-1 font-semibold uppercase tracking-wide">
                    {member.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className={cn("grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6")}>
          {otherCards.map((card) => {
            const remaining = getRemainingSeconds(card.timer, now);
            const overrun = getOverrunSeconds(card.timer, now);
            return (
              <article
                key={card.id}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur transition",
                  card.isActive ? "ring-2 ring-emerald-400" : "ring-0"
                )}
              >
                <TimerAvatar name={card.displayEntity.name} avatarUrl={card.displayEntity.avatar_url} size={68} />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-base font-semibold leading-none">{card.displayEntity.name}</p>
                      {card.label ? (
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
                      {card.timer.status === "running"
                        ? "Em curso"
                        : card.timer.status === "finished"
                          ? "Terminado"
                          : "Pausado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CircularTimer
                      size={160}
                      remainingSeconds={remaining}
                      durationSeconds={card.timer.duration_seconds}
                      overrunSeconds={overrun}
                      valueClassName="text-lg"
                    />
                  </div>
                </div>
              </article>
            );
          })}

          {otherCards.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground">
              Sem outros cronómetros ativos neste momento.
            </p>
          ) : null}
        </section>
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
