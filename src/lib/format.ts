export const padTwo = (n: number): string => String(n).padStart(2, "0");

export const formatEuros = (cents: number): string => `${cents / 100}\u00a0€`;

export const formatTicketNo = (n: number): string => `Nº${padTwo(n)}`;

export const ticketFileName = (ticketNo: number): string =>
  `snack-snack-billet-${padTwo(ticketNo)}.png`;

export const formatSeatsLeft = (n: number): string => padTwo(n);

export type SeatsLeftCopy = { lead: string; count: string; tail: string };

export const seatsLeftCopy = (
  left: number,
  capacity: number,
): SeatsLeftCopy => {
  const places = left > 1 ? "places" : "place";
  if (left >= capacity)
    return {
      lead: "Encore",
      count: formatSeatsLeft(left),
      tail: `${places} sur ${capacity}`,
    };
  return { lead: "Plus que", count: formatSeatsLeft(left), tail: places };
};

export const formatCovers = (covers: number, vg: number): string =>
  vg > 0 ? `${covers} (${vg} VG)` : String(covers);

// Reads the wall-clock part of the ISO string so the ticket shows the event's
// local time whatever the visitor's time zone.
export const formatTicketDate = (iso: string): string => {
  const [, month, day, hour] =
    iso.match(/^\d{4}-(\d{2})-(\d{2})T(\d{2})/) ?? [];
  return `${day}.${month} · ${Number(hour)}H`;
};

export const firstName = (fullName: string): string =>
  fullName.trim().split(/\s+/)[0];
