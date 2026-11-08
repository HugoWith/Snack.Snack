import { useEffect, useState } from "react";

export type CopyState = "idle" | "copied" | "manual";

// The clipboard is refused outside a secure context or by the browser's
// permissions: the link is then shown, selected, for a manual copy.
export const useCopyTicketLink = (url: string) => {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state !== "copied") return;
    const timer = window.setTimeout(() => setState("idle"), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("manual");
    }
  };

  return { state, copy };
};

const COPIED_MS = 2000;
