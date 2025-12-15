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
  const formattedDate = now.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formattedTime = now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const themeHeadingTrimmed = snapshot.themeText.trim();
  const themedHeading = themeHeadingTrimmed.length > 0 ? themeHeadingTrimmed : "Gestão de Cronómetros";

  const sortedTimers = useMemo(
    () =>
      [...snapshot.timers].sort((a, b) => a.order_index - b.order_index || a.created_at.localeCompare(b.created_at)),
    [snapshot.timers]
  );

  const cardTimers = useMemo<CardTimer[]>(() => {
    return sortedTimers.flatMap((timer) => {
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

  const otherCards = useMemo(() => {
    if (!activeCard) {
      return [];
    }

    const remainingCards = cardTimers.filter((card) => card.id !== activeCard.id);

    return remainingCards
      .map((card, index) => {
        const remaining = getRemainingSeconds(card.timer, now);
        const overrun = getOverrunSeconds(card.timer, now);
        const statusKey = remaining > 0 ? 0 : 1;
        const sortValue = remaining > 0 ? remaining : overrun;

        return { card, sortKey: statusKey, sortValue, remaining, overrun, index } as const;
      })
      .sort((a, b) => {
        if (a.sortKey !== b.sortKey) {
          return a.sortKey - b.sortKey;
        }

        if (a.sortKey === 0) {
          const diff = b.remaining - a.remaining;
          return diff !== 0 ? diff : a.index - b.index;
        }

        const diff = a.overrun - b.overrun;
        return diff !== 0 ? diff : a.index - b.index;
      })
      .map((entry) => entry.card);
  }, [activeCard, cardTimers, now]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted text-foreground">
      <div className="mx-auto flex w-full max-w-[80vw] flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-semibold tracking-tight text-left md:text-left">{themedHeading}</h1>
              <p className="text-muted-foreground"></p>
            </div>
            <div className="flex flex-col items-start gap-3 text-left md:items-end md:text-right">
              <span className="text-2xl font-semibold uppercase tracking-wide text-black dark:text-slate-200" suppressHydrationWarning>
                {formattedDate} {formattedTime}
              </span>
              <ThemeToggle className="self-start md:self-end" />
            </div>
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
            {activeCard.label ? (
              <p className="max-w-full break-words text-sm uppercase tracking-wide text-muted-foreground" suppressHydrationWarning>
                {activeCard.label}
              </p>
            ) : (
              <h2 className="max-w-full break-words text-3xl font-semibold" suppressHydrationWarning>
                {activeCard.displayEntity.name}
              </h2>
            )}
            {activeCard.timer.members.length > 0 ? (
              <div className="mt-1 flex max-w-full flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {activeCard.timer.members.map((member) => (
                  <span key={member.id} className="rounded-full bg-muted px-3 py-1 font-semibold uppercase tracking-wide">
                    {member.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid w-full gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {otherCards.map((card) => {
            const remaining = getRemainingSeconds(card.timer, now);
            const overrun = getOverrunSeconds(card.timer, now);
            const avatarUrl =
              card.displayEntity.avatar_url ?? card.timer.entity.avatar_url ?? card.timer.group?.avatar_url ?? null;
            return (
              <article
                key={card.id}
                className={cn(
                  "flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/80 p-4 text-center shadow-sm backdrop-blur transition",
                  card.isActive ? "ring-2 ring-emerald-400" : "ring-0"
                )}
              >
                <div className="grid w-full grid-cols-[auto,1fr] items-center gap-3">
                  <div className="flex-shrink-0">
                    <TimerAvatar
                      name={card.displayEntity.name}
                      avatarUrl={avatarUrl}
                      size={56}
                      accentColor={card.accentColor ?? undefined}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-0.5 text-left">
                    <p className="w-full break-words text-base font-semibold leading-none" suppressHydrationWarning>
                      {card.displayEntity.name}
                    </p>
                    {card.label ? (
                      <p className="w-full break-words text-xs uppercase tracking-wide text-muted-foreground" suppressHydrationWarning>
                        {card.label}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex justify-center">
                  <CircularTimer
                    size={180}
                    remainingSeconds={remaining}
                    durationSeconds={card.timer.duration_seconds}
                    overrunSeconds={overrun}
                    valueClassName="text-lg"
                  />
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
  accentColor: string | null;
}
