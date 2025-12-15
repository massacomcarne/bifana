import { differenceInSeconds } from "date-fns";
import type { TimerWithEntity } from "./types";

export function getElapsedSeconds(timer: TimerWithEntity, reference: Date) {
  const baseElapsed = timer.elapsed_seconds;

  if (timer.status === "running" && timer.running_since) {
    const runningSince = new Date(timer.running_since);
    const delta = differenceInSeconds(reference, runningSince);
    return baseElapsed + Math.max(delta, 0);
  }

  return baseElapsed;
}

export function getRemainingSeconds(timer: TimerWithEntity, reference: Date) {
  return timer.duration_seconds - getElapsedSeconds(timer, reference);
}

export function getProgressRatio(timer: TimerWithEntity, reference: Date) {
  const remaining = getRemainingSeconds(timer, reference);
  if (timer.duration_seconds <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, remaining / timer.duration_seconds));
}

export function getOverrunSeconds(timer: TimerWithEntity, reference: Date) {
  const remaining = getRemainingSeconds(timer, reference);
  return remaining < 0 ? Math.abs(remaining) : 0;
}

export function formatDuration(totalSeconds: number) {
  const sign = totalSeconds < 0 ? "-" : "";
  const seconds = Math.abs(totalSeconds);
  const minutesPart = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secondsPart = (seconds % 60).toString().padStart(2, "0");
  return `${sign}${minutesPart}:${secondsPart}`;
}
