import { useEffect, useState } from "react";
import {
  cancelReservation,
  getAdminData,
  type AdminData,
  type AdminError,
  type AdminRow,
} from "../../lib/admin-api";
import {
  REFUND_REMINDER,
  cancelConfirmMessage,
  needsRefundReminder,
} from "../../lib/admin-rows";
import { formatTicketNo } from "../../lib/format";
import { ADMIN_ERROR_COPY } from "./admin-copy";

export type CancelNotice = { message: string; isAlert: boolean };

export const useAdminData = (token: string) => {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [cancelNotice, setCancelNotice] = useState<CancelNotice | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // The last rows stay on screen while a reload runs.
  useEffect(() => {
    let isCurrent = true;
    void getAdminData(token).then((result) => {
      if (!isCurrent) return;
      setError(result.ok ? null : result.error);
      if (result.ok) setData(result.value);
    });
    return () => {
      isCurrent = false;
    };
  }, [token, reloadCount]);

  const reload = (): void => setReloadCount((count) => count + 1);

  const cancel = async (row: AdminRow): Promise<void> => {
    if (!window.confirm(cancelConfirmMessage(row))) return;

    setCancellingId(row.id);
    const result = await cancelReservation(token, row.id, row.status);
    setCancellingId(null);
    setCancelNotice(
      result.ok
        ? cancelledNotice(row)
        : { message: ADMIN_ERROR_COPY[result.error], isAlert: true },
    );
    reload();
  };

  return { data, error, reload, cancel, cancelNotice, cancellingId };
};

const cancelledNotice = (row: AdminRow): CancelNotice => {
  const who =
    row.ticketNo === null
      ? row.fullName
      : `${formatTicketNo(row.ticketNo)} (${row.fullName})`;
  return needsRefundReminder(row)
    ? { message: `${who} annulé. ${REFUND_REMINDER}`, isAlert: true }
    : { message: `${who} annulé.`, isAlert: false };
};
