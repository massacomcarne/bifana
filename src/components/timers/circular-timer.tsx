import { formatDuration } from "@/lib/timers/helpers";
import { cn } from "@/lib/utils";

interface CircularTimerProps {
  size?: number;
  remainingSeconds: number;
  durationSeconds: number;
  overrunSeconds: number;
  label?: string;
  className?: string;
  availableStrokeClassName?: string;
  overrunStrokeClassName?: string;
  valueClassName?: string;
}

export function CircularTimer({
  size = 240,
  remainingSeconds,
  durationSeconds,
  overrunSeconds,
  label,
  className,
  availableStrokeClassName,
  overrunStrokeClassName,
  valueClassName
}: CircularTimerProps) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const clampedDuration = Math.max(durationSeconds, 1);
  const positive = remainingSeconds >= 0;
  const progress = positive ? remainingSeconds / clampedDuration : 0;
  const clippedProgress = Math.max(0, Math.min(1, progress));
  const minuteProgress = overrunSeconds % 60 / 60;
  const dashOffset = circumference * (1 - clippedProgress);
  const overrunOffset = circumference * (1 - minuteProgress);
  const displayColor = positive ? "text-white" : "text-red-500";
  const availableStroke = availableStrokeClassName ?? "stroke-emerald-400";
  const overrunStroke = overrunStrokeClassName ?? "stroke-red-500";

  const formatted = formatDuration(Math.round(remainingSeconds));

  return (
    <div className={cn("relative flex flex-col items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fill-black stroke-transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-white/20"
          strokeWidth={8}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={cn(availableStroke, positive ? "opacity-100" : "opacity-0")}
          strokeWidth={8}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={cn(overrunStroke, positive ? "opacity-0" : "opacity-100")}
          strokeWidth={8}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={overrunOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          suppressHydrationWarning
          className={cn("font-semibold tabular-nums", valueClassName ?? "text-[1.5rem]", displayColor)}
        >
          {formatted}
        </span>
        {label ? <span className="mt-2 text-sm text-white/70">{label}</span> : null}
      </div>
    </div>
  );
}

