import Image from "next/image";
import { cn } from "@/lib/utils";

interface TimerAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

export function TimerAvatar({ name, avatarUrl, size = 56 }: TimerAvatarProps) {
  const initials = getInitials(name);
  const dimension = { width: size, height: size } as const;

  const sharedClasses = cn(
    "relative flex items-center justify-center rounded-full border border-border",
    "bg-muted text-foreground/80"
  );

  if (avatarUrl) {
    return (
      <div className={sharedClasses} style={{ width: size, height: size }}>
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
    <div className={sharedClasses} style={{ width: dimension.width, height: dimension.height }}>
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
