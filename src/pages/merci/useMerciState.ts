import { useEffect, useState } from "react";
import { loadReservation } from "../../lib/load-reservation";
import {
  POLL_INTERVAL_MS,
  nextMerciState,
  type MerciState,
} from "../../lib/reservation-status";

export const useMerciState = (): MerciState => {
  const [view, setView] = useState<MerciState>({ state: "poll" });

  useEffect(() => {
    let isCurrent = true;
    let timer: number | undefined;
    let attempts = 0;

    const poll = async (): Promise<void> => {
      const lookup = await loadReservation(window.location.search);
      if (!isCurrent) return;
      attempts += 1;
      const next = nextMerciState({ attempts }, lookup);
      setView(next);
      if (next.state === "poll")
        timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    void poll();
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, []);

  return view;
};
