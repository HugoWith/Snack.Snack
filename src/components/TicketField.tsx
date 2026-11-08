import { ReceiptLeader } from "./receipt/ReceiptLeader";
import {
  RECEIPT_LABEL_CLASSES,
  RECEIPT_VALUE_CLASSES,
} from "./receipt/receipt-classes";

interface TicketFieldProps {
  label: string;
  value: string;
  detail?: string;
}

export function TicketField({ label, value, detail }: TicketFieldProps) {
  return (
    <div className="flex items-baseline gap-3">
      <dt
        className={`flex flex-1 items-baseline gap-3 ${RECEIPT_LABEL_CLASSES}`}
      >
        {label}
        <ReceiptLeader />
      </dt>
      <dd className="text-right">
        <span className={`block ${RECEIPT_VALUE_CLASSES}`}>{value}</span>
        {detail && (
          <span className={`mt-1.5 block ${RECEIPT_LABEL_CLASSES}`}>
            {detail}
          </span>
        )}
      </dd>
    </div>
  );
}
