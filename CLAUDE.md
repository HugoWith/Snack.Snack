# Snack Snack — billetterie

Avant toute chose, lis `docs/superpowers/specs/2026-11-06-billetterie-design.md` (intention, décisions, stack, admin) puis `HANDOFF.md` (spec détaillée : événement, parcours, données, écrans). En cas de conflit, le document de conception l'emporte.

Stack : Vite + React + TypeScript + Tailwind (front), Hono dans une Netlify Function sous `/api/*` (back), Supabase Postgres + Auth (base, connexion admin), `nodemailer` via Gmail SMTP (email).

## Règles du projet
- Les faits de l'événement (date, lieu, prix, capacité initiale, limite par personne, conditions) vivent dans `src/event.ts`. Ne les écris jamais en dur ailleurs. Seule exception : la capacité courante est en base (modifiable depuis l'admin).
- Toutes les couleurs, polices et espacements viennent de `design/tokens.css`. Pas de nouvelle couleur.
- `design/mockups/*.reference.html` sont des références visuelles : reproduis la mise en page, pas le balisage `<x-dc>`.
- Le logo est un PNG (`public/img/`), jamais du texte, jamais d'ombre ajoutée.
- Le navigateur n'accède jamais directement à la base : tout passe par l'API Hono (`/api/*`). Aucune clé secrète (`SUMUP_API_KEY`, chaîne de connexion Postgres, `service_role`, `SMTP_APP_PASSWORD`) dans le code front ni dans le repo.
- Ne crée ni ne déploie rien sur Supabase ou Netlify tant qu'Hugo n'a pas confirmé le compte à utiliser.
- Avant d'agir sur un webhook SumUp, relis toujours le statut du checkout via l'API SumUp.
- Travaille en sandbox SumUp tant que l'équipe n'a pas validé le passage en production.
- Textes de l'interface en français, tutoiement, ton de la marque (phrases courtes, capitales pour les énoncés).
- Suis l'ordre de travail du plan (`docs/superpowers/plans/`) et montre la page `/` avant de brancher le paiement.
