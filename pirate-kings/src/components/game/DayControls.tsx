"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DayControlsProps = {
  sessionId: string;
  currentDay: number;
  timerRunning: boolean;
  onDayAdvanced: (day: number) => void;
  onDayEnded: () => void;
  onTimerUpdate: (paused: boolean) => void;
};

export function DayControls({
  sessionId,
  currentDay,
  timerRunning,
  onDayAdvanced,
  onDayEnded,
  onTimerUpdate,
}: DayControlsProps) {
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);

  async function post(url: string) {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      return res;
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvanceDay() {
    const res = await post("/api/game/advance-day");
    if (res?.ok) {
      const data = await res.json();
      onDayAdvanced(data.day ?? currentDay + 1);
      setPaused(false);
    }
  }

  async function handleEndDay() {
    const res = await post("/api/game/end-day");
    if (res?.ok) {
      onDayEnded();
      setPaused(false);
    }
  }

  async function handlePause() {
    const res = await post("/api/game/timer/pause");
    if (res?.ok) {
      setPaused(true);
      onTimerUpdate(true);
    }
  }

  async function handleResume() {
    const res = await post("/api/game/timer/resume");
    if (res?.ok) {
      setPaused(false);
      onTimerUpdate(false);
    }
  }

  async function handleExtend() {
    await post("/api/game/timer/extend");
  }

  if (!timerRunning) {
    return (
      <Card>
        <CardContent className="py-3 xl:py-5 flex items-center justify-center gap-2 xl:gap-4">
          <Button onClick={handleAdvanceDay} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
            {currentDay === 0
              ? "Start Day 1"
              : `Next Day (${currentDay + 1})`}
          </Button>
          {paused && currentDay > 0 && (
            <Button variant="outline" onClick={handleResume} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
              Resume
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3 xl:py-5 flex items-center justify-center gap-2 xl:gap-4 flex-wrap">
        {paused ? (
          <Button variant="outline" onClick={handleResume} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
            Resume
          </Button>
        ) : (
          <Button variant="outline" onClick={handlePause} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
            Pause
          </Button>
        )}
        <Button variant="outline" onClick={handleExtend} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
          +1 Min
        </Button>
        <Button variant="destructive" onClick={handleEndDay} disabled={loading} className="xl:text-lg xl:px-6 xl:py-3">
          End Day
        </Button>
      </CardContent>
    </Card>
  );
}
