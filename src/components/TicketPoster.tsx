import type { ReactNode, Ref } from "react";
import { EVENT } from "../event";
import type { TicketData } from "../lib/reservation-status";
import { Ticket } from "./Ticket";

interface TicketPosterProps {
  ticket: TicketData;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

// The 9:16 composition of the downloadable ticket; /billet shows it full
// screen with the save button slotted in as children.
export function TicketPoster({
  ticket,
  className = "",
  ref,
  children,
}: TicketPosterProps) {
  return (
    <div
      ref={ref}
      className={`bg-fond-inox-billet flex flex-col items-center justify-between gap-8 px-8 pt-9 pb-8 font-text text-text ${className}`}
    >
      <p className="text-center text-xs font-black text-label uppercase">
        {EVENT.dateLabel} - {EVENT.lunchTime}
      </p>
      <div className="flex w-full max-w-[400px] flex-col items-center gap-14">
        <Ticket {...ticket} />
        {children}
      </div>
      <div className="flex flex-col items-center gap-2">
        <img
          src="/img/snack-snack-logo-sm.png"
          alt="Snack Snack"
          width={818}
          height={444}
          className="block h-auto w-[120px]"
        />
        <p className="text-xs font-black text-label uppercase">
          {EVENT.venue.name} - {EVENT.venue.city}
        </p>
      </div>
    </div>
  );
}
