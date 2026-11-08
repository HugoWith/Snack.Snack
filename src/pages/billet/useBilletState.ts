import { useEffect, useState } from "react";
import { loadReservation } from "../../lib/load-reservation";
import {
  pickBilletState,
  type BilletState,
} from "../../lib/reservation-status";

export const useBilletState = (): BilletState | null => {
  const [view, setView] = useState<BilletState | null>(null);

  useEffect(() => {
    let isCurrent = true;
    void loadReservation(window.location.search).then((lookup) => {
      if (isCurrent) setView(pickBilletState(lookup));
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  return view;
};
