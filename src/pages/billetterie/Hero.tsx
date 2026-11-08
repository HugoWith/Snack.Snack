import { EVENT } from "../../event";
import { formatEuros } from "../../lib/format";

export function Hero() {
  return (
    <header className="bg-hero-photo flex h-svh min-h-[600px] flex-col justify-between px-6 pt-10 pb-16 lg:px-0 lg:pt-12 lg:pb-20">
      <h1 className="sr-only">{EVENT.name}</h1>
      <p className="text-center text-[13px] font-black text-label uppercase lg:text-sm">
        Déjeuner et after-déjeuner
      </p>
      <div className="flex flex-col gap-3 lg:mx-auto lg:w-full lg:max-w-[1100px] lg:gap-5 lg:px-12">
        <p className="font-display text-[clamp(26px,7.2vw,34px)] leading-none tracking-[-0.035em] text-mustard uppercase lg:text-7xl">
          {EVENT.dateLabel}.
          <br />
          {EVENT.lunchTime}. {formatEuros(EVENT.priceCents)} le couvert.
        </p>
        <p className="text-[13px] font-black text-label uppercase lg:text-lg">
          Chez {EVENT.venue.name}, {EVENT.venue.city}
        </p>
      </div>
    </header>
  );
}
