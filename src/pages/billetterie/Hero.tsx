import { EVENT } from "../../event";
import { formatEuros } from "../../lib/format";
import { MaskedLine } from "./MaskedLine";
import { useHeroReady } from "./useHeroReady";

export function Hero() {
  const isReady = useHeroReady();

  return (
    <header className="bg-hero-photo flex h-svh min-h-[600px] flex-col justify-between px-6 pt-10 pb-16 lg:px-0 lg:pt-12 lg:pb-20">
      <h1 className="sr-only">{EVENT.name}</h1>
      <p className="text-center text-[13px] font-black text-label uppercase lg:text-sm">
        Déjeuner et after-déjeuner
      </p>
      <div className="flex flex-col gap-3 lg:mx-auto lg:w-full lg:max-w-[1100px] lg:gap-5 lg:px-12">
        <p className="flex flex-col font-display text-[clamp(26px,7.2vw,34px)] leading-none tracking-[-0.035em] text-mustard uppercase lg:text-7xl">
          <MaskedLine index={0} isReady={isReady}>
            {EVENT.dateLabel}.
          </MaskedLine>
          <MaskedLine index={1} isReady={isReady}>
            {EVENT.lunchTime}. {formatEuros(EVENT.priceCents)} le couvert.
          </MaskedLine>
        </p>
        <p className="text-[13px] font-black text-label uppercase lg:text-lg">
          <MaskedLine index={2} isReady={isReady}>
            Chez {EVENT.venue.name}, {EVENT.venue.city}
          </MaskedLine>
        </p>
      </div>
    </header>
  );
}
