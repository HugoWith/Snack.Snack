import { useEffect, useState } from "react";
import { EVENT } from "../../event";
import { getSeatsLeft, type SeatsLeft } from "../../lib/api";

export type SeatsLeftState =
  | { status: "loading" }
  | { status: "ready"; seats: SeatsLeft }
  | { status: "failed" };

export type SeatsView = {
  view: "loading" | "form" | "soldOut";
  counter: SeatsLeft | null;
  seatsLeft: number;
};

export const useSeatsLeft = (): SeatsView & { refresh: () => void } => {
  const [state, setState] = useState<SeatsLeftState>({ status: "loading" });
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    // A refresh follows a refused order: skip the browser's 10 s cache.
    getSeatsLeft(refreshCount === 0 ? "default" : "no-cache")
      .then((seats) => {
        if (isCurrent) setState({ status: "ready", seats });
      })
      .catch((error: unknown) => {
        console.error("Seats left unavailable", error);
        if (isCurrent) setState({ status: "failed" });
      });
    return () => {
      isCurrent = false;
    };
  }, [refreshCount]);

  return {
    ...pickSeatsView(state),
    refresh: () => setRefreshCount((count) => count + 1),
  };
};

// Without a count the form only applies the per-person limit; the server
// still refuses an order that no longer fits.
export const pickSeatsView = (state: SeatsLeftState): SeatsView => {
  if (state.status === "loading")
    return { view: "loading", counter: null, seatsLeft: 0 };
  if (state.status === "failed")
    return { view: "form", counter: null, seatsLeft: EVENT.maxPerEmail };

  const { seats } = state;
  return {
    view: seats.left === 0 ? "soldOut" : "form",
    counter: seats,
    seatsLeft: seats.left,
  };
};
