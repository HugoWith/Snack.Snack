import { getReservation } from "./api";
import type { ReservationLookup } from "./reservation-status";

export const loadReservation = async (
  search: string,
): Promise<ReservationLookup> => {
  const params = new URLSearchParams(search);

  if (import.meta.env.DEV) {
    const mock = params.get("mock");
    if (mock) {
      const { mockReservation } = await import("./mock-reservation");
      return mockReservation(mock);
    }
  }

  const ref = params.get("ref");
  if (!ref) return "not-found";
  try {
    return (await getReservation(ref)) ?? "not-found";
  } catch (error) {
    console.error("Reservation unavailable", error);
    return "unreachable";
  }
};
