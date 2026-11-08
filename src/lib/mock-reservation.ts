import type { ReservationView } from "./api";
import type { ReservationLookup } from "./reservation-status";

// Dev-only stand-in for /api/reservation, driven by ?mock= (and ?vg=, ?name=).
export const mockReservation = (mock: string): ReservationLookup => {
  const params = new URLSearchParams(window.location.search);
  const base: ReservationView = {
    ...PAID,
    fullName: params.get("name") ?? PAID.fullName,
    vg: Number(params.get("vg") ?? PAID.vg),
  };

  if (mock === "paid") return base;
  if (mock === "refund")
    return { ...base, status: "cancelled", needsRefund: true };
  if (mock === "held" || mock === "failed")
    return { ...base, status: mock, ticketNo: null };
  return "not-found";
};

const PAID: ReservationView = {
  status: "paid",
  ticketNo: 7,
  fullName: "Camille Durand",
  covers: 2,
  vg: 1,
  needsRefund: false,
  hasCheckout: true,
};
