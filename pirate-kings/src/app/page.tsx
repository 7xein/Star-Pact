import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-4xl font-bold">Treasure of the Pirate Kings</h1>
      <p className="text-muted-foreground text-center max-w-md">
        A multiplayer team simulation game. Facilitators create a session,
        team captains join on their phones.
      </p>
      <div className="flex gap-4">
        <Link href="/facilitator">
          <Button size="lg">Facilitator</Button>
        </Link>
        <Link href="/join">
          <Button size="lg" variant="outline">Join as Captain</Button>
        </Link>
      </div>
    </div>
  );
}
