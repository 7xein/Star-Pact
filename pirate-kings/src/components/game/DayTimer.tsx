"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type DayTimerProps = {
  timerEnd: string | null;
  paused: boolean;
};

export function DayTimer({ timerEnd, paused }: DayTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number>(0);

  useEffect(() => {
    if (!timerEnd) {
      setRemainingMs(0);
      return;
    }

    function tick() {
      const end = new Date(timerEnd!).getTime();
      const now = Date.now();
      setRemainingMs(Math.max(0, end - now));
    }

    tick();

    if (paused) return;

    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timerEnd, paused]);

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isLow = totalSeconds > 0 && totalSeconds < 30;

  if (!timerEnd) {
    return (
      <span className="font-mono text-lg text-muted-foreground">--:--</span>
    );
  }

  return (
    <span
      className={cn(
        "font-mono text-lg font-bold",
        isLow && "text-red-500 animate-pulse",
        paused && "text-amber-500"
      )}
    >
      {paused ? `${display} (paused)` : display}
    </span>
  );
}
