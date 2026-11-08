import { AdminShell } from "./AdminShell";
import { Dashboard } from "./Dashboard";
import { Login } from "./Login";
import { useAdminSession } from "./useAdminSession";

export function AdminPage() {
  const session = useAdminSession();

  if (session.status === "signedOut") return <Login />;
  if (session.status === "signedIn")
    return <Dashboard email={session.email} token={session.token} />;
  return (
    <AdminShell>
      <p role="status" className="text-base font-bold text-label">
        Chargement…
      </p>
    </AdminShell>
  );
}
