import { NOTICE_CLASSES } from "./admin-classes";
import type { AddNotice } from "./useAddReservationForm";

interface AddedNoticeProps {
  notice: AddNotice | null;
}

export function AddedNotice({ notice }: AddedNoticeProps) {
  return (
    <p
      role="status"
      className={`${NOTICE_CLASSES} ${notice?.isAlert ? "text-alert" : "text-text"}`}
    >
      {notice?.message}
      {notice?.ticketUrl && (
        <>
          {" "}
          <a
            href={notice.ticketUrl}
            target="_blank"
            rel="noreferrer"
            className="text-mustard underline underline-offset-[3px] hover:text-mustard-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mustard"
          >
            Ouvrir le billet
          </a>
        </>
      )}
    </p>
  );
}
