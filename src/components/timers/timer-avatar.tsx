import type { CSSProperties } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TimerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  accentColor?: string | null;
}

export function TimerAvatar({ name, avatarUrl, size = 56, accentColor }: TimerAvatarProps) {
  const initials = getInitials(name);
  const dimension = { width: size, height: size } as const;
  const frameStyle: CSSProperties = {
    width: dimension.width,
    height: dimension.height,
    borderColor: accentColor ?? "rgba(0, 0, 0, 0.25)",
    borderWidth: accentColor ? 2 : 1,
    boxShadow: accentColor
      ? `0 0 0 1px ${accentColor}70, 0 0 0 2px rgba(0, 0, 0, 0.9)`
      : "0 0 0 1px rgba(0, 0, 0, 0.85)"
  };

  const sharedClasses = cn(
    "relative flex items-center justify-center rounded-full border",
    accentColor ? "border-transparent" : "border-black/40",
    "bg-black text-white dark:bg-muted dark:text-foreground/80"
  );

  if (avatarUrl) {
    return (
      <div className={sharedClasses} style={frameStyle}>
        <Image
          src={avatarUrl}
          alt={name}
          fill
          sizes={`${size}px`}
          className="rounded-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={sharedClasses} style={frameStyle}>
      <span className="font-medium uppercase">{initials}</span>
    </div>
  );
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/);
  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
