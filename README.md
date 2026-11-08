# Snack Snack — billetterie

Mini-site de réservation pour le déjeuner Snack Snack #1 (dimanche 22 novembre 2026, chez Silk, Marseille) : 20 couverts, 2 maximum par email, paiement SumUp Hosted Checkout, billet en image, email de confirmation et page admin pour les organisateurs.

Avant de toucher au code : `CLAUDE.md` (règles), `docs/superpowers/specs/2026-11-06-billetterie-design.md` (conception), `HANDOFF.md` (spec détaillée). Les faits de l'événement vivent dans `src/event.ts`, les styles dans `design/tokens.css`.

## Stack

- Front : Vite + React + TypeScript + Tailwind. Pages `/`, `/merci`, `/billet`, `/admin`.
- API : Hono dans une seule Netlify Function, sous `/api/*` (`netlify/functions/api.ts`, `server/`).
- Base et connexion admin : Supabase (Postgres + Auth). La logique des places est en SQL (`supabase/migrations/`).
- Paiement : SumUp (sandbox en local). Email : `nodemailer` via Gmail SMTP.

## En local

```
npm install
npx supabase start            # stack locale sur les ports 5542x (API 55421, Postgres 55422, Studio 55423, Mailpit 55424)
cp .env.example .env          # puis remplis les valeurs (voir docs/launch.md §1)
npm run dev                   # netlify dev : front + API sur http://localhost:8888
```

Les ports 5542x évitent une autre stack Supabase qui tourne sur 5432x. Arrête la nôtre avec `npx supabase stop` depuis ce dossier (jamais `--all`).

Le pooler Supavisor local est activé sur 55429, en mode transaction (`[db.pooler]` dans `supabase/config.toml`), comme celui de la prod (port 6543). Il sert à `tests/db/pooler.test.ts` : ce pooler se bloque quand une même connexion envoie plusieurs requêtes à la suite sans attendre les réponses, ce qui mettait l'admin en 502. `createDb` fait donc passer les appels l'un après l'autre. L'app en local continue de parler en direct à 55422. `config.toml` ne règle que le local : ne lance jamais `supabase config push`.

Les emails sont optionnels : sans aucune des trois variables `SMTP_USER`, `SMTP_APP_PASSWORD` et `MAIL_FROM`, l'API démarre et n'envoie rien. C'est le réglage normal en local. N'en mets qu'une ou deux et l'API refuse de démarrer. Ne les écris jamais dans `.env`.

## Tests

```
npx vitest run       # tout : tests unitaires + tests SQL sur la base locale
npm test             # unitaires seulement
npm run test:db      # SQL seulement
npm run typecheck
npm run build
```

Les tests SQL **vident la base locale**. Ils tournent avec `DATABASE_URL` sur `127.0.0.1:55422` et ont besoin du pooler local démarré. Le garde-fou refuse toute autre adresse, sauf le pooler local (`127.0.0.1:55429`), utilisé par `tests/db/pooler.test.ts`.

## Mise en ligne

Tout est dans [`docs/launch.md`](docs/launch.md) : variables d'environnement, Supabase, Netlify, SumUp, checklist avant ouverture et purge après l'événement.
