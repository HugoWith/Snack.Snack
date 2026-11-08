import { EVENT } from "../event";

export function ContactLine() {
  return (
    <p className="text-sm leading-[1.45] font-bold text-label lg:text-base">
      Une question ?{" "}
      <a
        href={`mailto:${EVENT.contactEmail}`}
        className="text-mustard underline underline-offset-[3px] hover:text-mustard-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard"
      >
        {EVENT.contactEmail}
      </a>
    </p>
  );
}
