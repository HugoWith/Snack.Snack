import { ROW_ACTION_CLASSES } from "./admin-classes";
import { useCopyTicketLink } from "./useCopyTicketLink";

interface CopyTicketLinkProps {
  url: string;
  fullName: string;
}

export function CopyTicketLink({ url, fullName }: CopyTicketLinkProps) {
  const { state, copy } = useCopyTicketLink(url);

  if (state === "manual")
    return (
      <input
        readOnly
        autoFocus
        value={url}
        aria-label={`Lien du billet de ${fullName}, à copier`}
        onFocus={(event) => event.currentTarget.select()}
        className="min-h-11 w-80 border border-steel-600 bg-ground px-2 text-xs font-bold text-text outline-none focus:border-mustard"
      />
    );

  return (
    <>
      <button
        type="button"
        aria-label={`Copier le lien du billet de ${fullName}`}
        onClick={() => void copy()}
        className={`${ROW_ACTION_CLASSES} hover:text-mustard`}
      >
        {state === "copied" ? "Lien copié" : "Copier le lien du billet"}
      </button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Lien copié" : ""}
      </span>
    </>
  );
}
