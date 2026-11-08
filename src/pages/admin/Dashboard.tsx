import { downloadCsv } from "../../lib/download-csv";
import { supabase } from "../../lib/supabase-client";
import { AddReservationForm } from "./AddReservationForm";
import { ADMIN_ERROR_COPY } from "./admin-copy";
import { SECONDARY_BUTTON_CLASSES } from "./admin-classes";
import { AdminShell } from "./AdminShell";
import { CapacityForm } from "./CapacityForm";
import { ReservationsTable } from "./ReservationsTable";
import { Totals } from "./Totals";
import { useAdminData } from "./useAdminData";

interface DashboardProps {
  email: string;
  token: string;
}

export function Dashboard({ email, token }: DashboardProps) {
  const admin = useAdminData(token);
  const { data, error } = admin;

  return (
    <AdminShell aside={<SessionBar email={email} />}>
      {error === "UNAUTHORIZED" && (
        <p role="alert" className="text-lg font-bold text-alert">
          {email
            ? `${email} n'a pas accès à l'admin. Déconnecte-toi et utilise une adresse organisateur.`
            : ADMIN_ERROR_COPY.UNAUTHORIZED}
        </p>
      )}
      {error && error !== "UNAUTHORIZED" && (
        <p role="alert" className="text-base font-bold text-alert">
          {ADMIN_ERROR_COPY[error]}
        </p>
      )}
      {!data && !error && (
        <p role="status" className="text-base font-bold text-label">
          Chargement…
        </p>
      )}
      {data && error !== "UNAUTHORIZED" && (
        <>
          <Totals totals={data.totals} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
            <CapacityForm
              token={token}
              capacity={data.totals.capacity}
              coversPaid={data.totals.coversPaid}
              onSaved={admin.reload}
            />
            <AddReservationForm
              token={token}
              isEmailEnabled={data.emailEnabled}
              onAdded={admin.reload}
            />
          </div>
          <ReservationsTable
            rows={data.rows}
            cancellingId={admin.cancellingId}
            cancelNotice={admin.cancelNotice}
            onCancel={(row) => void admin.cancel(row)}
            onExport={() => downloadCsv(data.rows)}
          />
        </>
      )}
    </AdminShell>
  );
}

interface SessionBarProps {
  email: string;
}

function SessionBar({ email }: SessionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-sm font-bold break-all text-label">{email}</span>
      <button
        type="button"
        onClick={() => void supabase.auth.signOut()}
        className={SECONDARY_BUTTON_CLASSES}
      >
        Se déconnecter
      </button>
    </div>
  );
}
