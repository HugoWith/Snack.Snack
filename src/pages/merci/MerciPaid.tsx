import { EVENT } from "../../event";
import { SaveTicket } from "../../components/SaveTicket";
import { Ticket } from "../../components/Ticket";
import { firstName } from "../../lib/format";
import type { TicketData } from "../../lib/reservation-status";

interface MerciPaidProps {
  ticket: TicketData;
}

export function MerciPaid({ ticket }: MerciPaidProps) {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center lg:gap-x-20">
      <div className="flex flex-col">
        <p className="text-center text-[13px] font-black text-label uppercase lg:text-left lg:text-sm">
          C'est réservé - on se voit à table
        </p>
        <h1 className="mt-[120px] font-display text-[30px] leading-none tracking-[-0.035em] text-balance text-mustard uppercase lg:mt-8 lg:text-7xl">
          Merci {firstName(ticket.fullName)}.
          <br />
          Ton couvert est posé.
        </h1>
      </div>
      <div className="flex flex-col">
        <div className="mt-[72px] lg:mt-0">
          <Ticket {...ticket} />
        </div>
        <div className="mt-20 flex flex-col items-center gap-5 lg:mt-16">
          <SaveTicket ticket={ticket} />
          <p className="text-center text-sm leading-[1.45] font-medium text-label">
            On t'envoie un email de confirmation très vite.
            <br />
            L'after commence à {EVENT.afterTime}.
          </p>
        </div>
      </div>
    </div>
  );
}
