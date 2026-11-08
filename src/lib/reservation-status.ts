import type { ReservationStatus, ReservationView } from "./api";

export type PollState = "show" | "poll" | "timeout" | "failed";

export type TicketData = Pick<ReservationView, "fullName" | "covers" | "vg"> & {
  ticketNo: number;
};

export type ReservationLookup = ReservationView | "not-found" | "unreachable";

export type MerciState =
  | { state: "show"; ticket: TicketData }
  | { state: "poll" | "timeout" | "failed" | "refund" };

export type BilletState =
  | { state: "show"; ticket: TicketData }
  | { state: "failed" | "refund" | "unreachable" };

export const POLL_INTERVAL_MS = 2000;
export const MAX_POLL_ATTEMPTS = 30;

export const nextPollState = (
  state: { attempts: number },
  status: ReservationStatus,
): PollState => {
  if (status === "paid") return "show";
  if (status !== "held") return "failed";
  return waitingState(state.attempts);
};

// A reservation flagged for refund was paid without a seat (late payment on
// a full room, or paid after an admin cancel): never show a ticket for it.
export const nextMerciState = (
  state: { attempts: number },
  lookup: ReservationLookup,
): MerciState => {
  if (lookup === "not-found") return { state: "failed" };
  if (lookup === "unreachable") return { state: waitingState(state.attempts) };
  if (lookup.needsRefund) return { state: "refund" };
  if (canStillBePaid(lookup))
    return {
      state: state.attempts < MAX_POLL_ATTEMPTS ? "poll" : "failed",
    };

  const next = nextPollState(state, lookup.status);
  if (next !== "show") return { state: next };
  if (lookup.ticketNo === null) return { state: "refund" };
  return { state: "show", ticket: toTicket(lookup, lookup.ticketNo) };
};

export const pickBilletState = (lookup: ReservationLookup): BilletState => {
  if (lookup === "unreachable") return { state: "unreachable" };
  const next = nextMerciState({ attempts: MAX_POLL_ATTEMPTS }, lookup);
  if (next.state === "show") return next;
  return { state: next.state === "refund" ? "refund" : "failed" };
};

// A declined card can be retried on the same SumUp page, and a hold released
// by a retry (expired) or cancelled by an organiser before payment can still
// be paid on its own page. The read that set the status may have missed the
// payment: wait out the budget first. A cancelled row with a ticket was paid.
const canStillBePaid = (view: ReservationView): boolean => {
  if (!view.hasCheckout) return false;
  if (view.status === "cancelled") return view.ticketNo === null;
  return view.status === "failed" || view.status === "expired";
};

const waitingState = (attempts: number): "poll" | "timeout" =>
  attempts < MAX_POLL_ATTEMPTS ? "poll" : "timeout";

const toTicket = (view: ReservationView, ticketNo: number): TicketData => ({
  ticketNo,
  fullName: view.fullName,
  covers: view.covers,
  vg: view.vg,
});
