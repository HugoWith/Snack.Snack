import { formatSeatsLeft } from "../../lib/format";

interface SeatCounterProps {
  left: number;
  capacity: number;
}

export function SeatCounter({ left, capacity }: SeatCounterProps) {
  const taken = capacity - left;

  return (
    <div className="mb-8 flex flex-col items-center gap-2.5">
      <div aria-hidden="true" className="flex flex-wrap justify-center gap-1">
        {Array.from({ length: capacity }, (_, index) => (
          <i
            key={index}
            className={`block size-[9px] ${index < taken ? "bg-seat-taken" : "bg-mustard"}`}
          />
        ))}
      </div>
      {left > 0 && (
        <p className="text-xs font-black text-label uppercase">
          Encore <span className="text-mustard">{formatSeatsLeft(left)}</span>{" "}
          {left > 1 ? "places" : "place"} sur {capacity}
        </p>
      )}
    </div>
  );
}
