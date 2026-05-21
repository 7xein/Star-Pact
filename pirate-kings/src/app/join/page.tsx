"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sessionStorage.setItem("joinCode", code.toUpperCase().trim());
      sessionStorage.setItem("teamId", data.team.id);
      router.push(`/play/${data.team.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold">Join Your Crew</h1>
            <p className="text-sm text-muted-foreground">
              Enter the code shown on screen
            </p>
          </div>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KRAKEN-A1"
            className="text-center text-lg md:text-2xl font-mono tracking-wider"
            maxLength={12}
          />
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={handleJoin}
            disabled={loading || !code.trim()}
          >
            {loading ? "Joining..." : "Board Ship →"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
