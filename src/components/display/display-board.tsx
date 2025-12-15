"use client";

import { useMemo } from "react";
import { useNow } from "@/lib/hooks/use-now";
import { getOverrunSeconds, getRemainingSeconds } from "@/lib/timers/helpers";
import type { TimersSnapshot } from "@/lib/timers/types";
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

  const [activeTimer, otherTimers] = useMemo(() => {
    if (snapshot.timers.length === 0) {
      return [null, []] as const;
    }

    const preferredActive = snapshot.timers.find((timer) => timer.id === snapshot.activeTimerId);
    const fallback = preferredActive ?? snapshot.timers[0];

    return [fallback, snapshot.timers.filter((timer) => timer.id !== fallback.id)] as const;
  }, [snapshot.activeTimerId, snapshot.timers]);

  if (!activeTimer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-2xl font-semibold text-muted-foreground">Nenhum cronómetro configurado.</p>
        <p className="mt-2 max-w-md text-muted-foreground/80">
          Adicione cronómetros na página de controlo para começar a projetar os tempos em tempo real.
        </p>
      </div>
    );
  }

  const activeRemaining = getRemainingSeconds(activeTimer, now);
  const activeOverrun = getOverrunSeconds(activeTimer, now);

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
            durationSeconds={activeTimer.duration_seconds}
            overrunSeconds={activeOverrun}
            className="drop-shadow-xl"
          />
          <div className="flex flex-col items-center gap-1 text-center">
            <h2 className="text-3xl font-semibold">{activeTimer.entity.name}</h2>
            {activeTimer.group ? (
              <p className="text-sm uppercase tracking-wide text-muted-foreground">{activeTimer.group.name}</p>
            ) : null}
            {activeTimer.members.length > 0 ? (
              <div className="mt-1 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {activeTimer.members.map((member) => (
                  <span key={member.id} className="rounded-full bg-muted px-3 py-1 font-semibold uppercase tracking-wide">
                    {member.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section
          className={cn(
            "grid gap-6",
            otherTimers.length <= 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"
          )}
        >
          {otherTimers.map((timer) => {
            const remaining = getRemainingSeconds(timer, now);
            const overrun = getOverrunSeconds(timer, now);
            return (
              <article
                key={timer.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur"
              >
                <TimerAvatar name={timer.entity.name} avatarUrl={timer.entity.avatar_url} size={68} />
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-lg font-semibold leading-none">{timer.entity.name}</p>
                      {timer.group ? (
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{timer.group.name}</p>
                      ) : null}
                      {timer.members.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {timer.members.map((member) => (
                            <span key={member.id} className="rounded-full bg-muted px-2 py-1 font-semibold">
                              {member.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
                      {timer.status === "running" ? "Em curso" : timer.status === "finished" ? "Terminado" : "Pausado"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CircularTimer
                      size={160}
                      remainingSeconds={remaining}
                      durationSeconds={timer.duration_seconds}
                      overrunSeconds={overrun}
                    />
                  </div>
                </div>
              </article>
            );
          })}

          {otherTimers.length === 0 ? (
            <p className="col-span-full text-center text-muted-foreground">
              Sem outros cronómetros ativos neste momento.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
