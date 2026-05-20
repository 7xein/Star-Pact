"use client";

type StrandedOverlayProps = {
  status: string;
};

const OVERLAY_CONTENT: Record<string, { title: string; message: string }> = {
  STRANDED: {
    title: "Stranded at Sea!",
    message:
      "Your crew ran out of supplies and cannot continue the voyage.",
  },
  SHIPWRECKED: {
    title: "Shipwrecked!",
    message:
      "A terrible fate has befallen your vessel. Your ship has been lost to the deep.",
  },
};

export function StrandedOverlay({ status }: StrandedOverlayProps) {
  const content = OVERLAY_CONTENT[status];
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
      <span className="text-6xl mb-4">{"💀"}</span>
      <h2 className="text-2xl font-bold text-white mb-2">{content.title}</h2>
      <p className="text-lg text-white/80 max-w-md mb-6">{content.message}</p>
      <p className="text-sm text-white/50">
        You can still watch the rest of the voyage unfold.
      </p>
    </div>
  );
}
