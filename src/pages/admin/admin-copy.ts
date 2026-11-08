import type { AdminError } from "../../lib/admin-api";

export const ADMIN_ERROR_COPY: Record<AdminError, string> = {
  UNAUTHORIZED: "Ta session a expiré. Reconnecte-toi.",
  INVALID: "Vérifie les champs.",
  SOLD_OUT: "Plus assez de places. Augmente la capacité d'abord.",
  CAPACITY_BELOW_TAKEN:
    "Impossible : c'est moins que les couverts déjà pris (payés ou en cours de paiement).",
  NOT_FOUND: "Cette réservation n'existe plus. Recharge la page.",
  CHANGED: "La résa a changé, regarde à nouveau.",
  UNAVAILABLE: "L'API ne répond pas. Réessaie dans une minute.",
};
