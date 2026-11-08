# Snack Snack #1 — Billetterie : document de conception

Date : 6 novembre 2026 · Mise en ligne : **mardi 10 novembre 2026** · Événement : dimanche 22 novembre 2026

Ce document complète `HANDOFF.md` (spec technique et design) et `CLAUDE.md` (règles du projet). Il dit **pourquoi**, **pour qui**, ce qui change par rapport au handoff, et ce qui est décidé. En cas de conflit, ce document l'emporte sur le handoff.

## 1. Intention

L'association (PTT) organise un déjeuner Snack Snack chez Silk, à Marseille. Plutôt que de passer par HelloAsso, on encaisse **directement avec le compte SumUp de l'asso** (déjà utilisé avec des TPE) via son API, sur un **mini-site entièrement à l'image de Snack Snack** (maquettes faites dans Claude Design).

Le QR code de l'affiche / du post Instagram mène au site. La personne réserve, paie sur la page SumUp hébergée, revient sur un écran de remerciement avec son billet en image. Les organisateurs voient qui a payé dans une page admin et exportent la liste en CSV.

## 2. Pour qui

- **La personne qui réserve** : arrive depuis le QR code, sur mobile presque toujours. Doit réserver et payer en moins d'une minute, et repartir avec un billet qu'elle garde sur son téléphone.
- **Les organisateurs** : veulent savoir à tout moment combien de places sont vendues, qui vient, combien de couverts VG prévoir, et exporter la liste pour le jour J.

## 3. Objectifs

1. Vendre exactement 20 couverts à 45 € (hors boissons), **jamais plus**, même avec plusieurs paiements simultanés.
2. **2 couverts maximum par personne** (par email), contrôlé côté serveur : impossible d'en prendre 3, ni en une fois ni en deux réservations.
3. **Option VG** : on demande combien de couverts sont végétariens (0 à nb de couverts).
4. Paiement via **SumUp Hosted Checkout** ; le statut payé est toujours confirmé auprès de l'API SumUp.
5. **Écran merci** + **billet en image** (PNG 1080×1920) téléchargeable.
6. **Email de confirmation personnalisé** (design de `email.reference.html`).
7. **Page admin** cachée derrière une connexion : tableau propre des réservations, export CSV, changement du nombre de places, ajout et suppression de réservations à la main.
8. Rendu fidèle aux maquettes, mobile d'abord.

## 4. Priorités

Tout est visé pour mardi 10 novembre. Si le temps manque, l'ordre de sacrifice est :

| Priorité | Élément |
|---|---|
| Indispensable | Page `/`, compteur, contrôles 20 places / 2 par email / VG, paiement SumUp, webhook, page `/merci`, billet PNG |
| Indispensable | Page admin (tableau + CSV) — sans elle, les organisateurs n'ont pas de liste fiable |
| Important | Email de confirmation |
| Important | Page `/billet?ref=…` (lien de l'email) |

Le site peut ouvrir mardi sans l'email si besoin ; l'email peut être branché ensuite et renvoyé aux réservations déjà payées (`email_sent_at` nul).

## 5. Non-objectifs

- Pas de remboursement ni d'annulation en ligne (« pas de remboursement, billet cessible »).
- Pas de billet pour l'after-déjeuner (gratuit, ouvert à toustes).
- Pas de check-in le jour J dans l'admin. Pas de remboursement SumUp déclenché depuis l'admin (ça se fait à la main dans SumUp).
- Pas de multi-événements : un seul événement codé en config. (La config est isolée dans `src/event.ts` pour faciliter une édition #2, mais on ne construit rien pour ça.)
- Pas de nom de domaine personnalisé pour l'instant.
- Pas de pièce jointe dans l'email (lien vers `/billet` à la place).

## 6. Anti-objectifs (échecs même si « ça marche »)

- **Survente** : 21 couverts payés pour 20 places.
- **Quelqu'un paie sans être enregistré**, ou est enregistré comme payé sans avoir payé.
- **Un QR code imprimé qui ne mène plus nulle part** après un changement d'adresse.
- Une page qui ressemble à un formulaire générique et pas à Snack Snack.
- Une clé secrète (SumUp, Supabase `service_role`, mot de passe Gmail) présente dans le code front ou dans le repo.
- Des données personnelles exposées publiquement (liste des inscrits, emails).

## 7. Décisions

### Stack (décidée avec Hugo, remplace HANDOFF §3)
- **Front : Vite + React + TypeScript**, Tailwind (thème construit à partir de `design/tokens.css`, aucune nouvelle couleur). Pages : `/`, `/merci`, `/billet`, `/admin`.
- **API : Hono**, dans **une seule Netlify Function** (Node), servie sous `/api/*` sur le même site que le front (pas de CORS, un seul déploiement, secrets au même endroit). Routes : `GET /api/seats-left`, `POST /api/checkout`, `POST /api/webhook/sumup`, `GET /api/reservation?ref=`, `/api/admin/*` (protégées par un middleware : jeton Supabase Auth + liste blanche). Rôles identiques aux Edge Functions de HANDOFF §5, qui ne sont **pas** utilisées.
- **Base et Auth admin : Supabase** (Postgres + Auth). L'API se connecte à Postgres côté serveur. Le navigateur n'accède jamais directement à la table ; il n'utilise Supabase que pour le lien magique de connexion admin (clé publique `anon`).
- **Email : `nodemailer`** vers Gmail SMTP.
- Dépendances prévues, à valider dans le plan : `react`, `react-dom`, `tailwindcss`, `hono`, un client Postgres, `nodemailer`, `@supabase/supabase-js` (Auth admin), une lib d'export PNG du billet.
- Local : `netlify dev` (front + API). Le webhook SumUp n'est pas joignable en local ; `/api/reservation` relit le statut chez SumUp, donc le parcours complet fonctionne sans webhook en local.
- **Logique des places dans Postgres** : toutes les opérations qui touchent au compteur sont des fonctions SQL sous le même verrou (`hold_seats`, `confirm_payment`, `admin_add`, `admin_cancel`, `set_capacity`). L'API reste fine : valider, authentifier, parler à SumUp et Gmail, appeler ces fonctions.

### Reprises du handoff (inchangées)
- **Supabase** : table `reservations`, fonction atomique `hold_seats` (verrou, capacité, max par email), réservation de 30 min, statuts `held / paid / failed / expired` (+ `cancelled` pour l'admin), Nº de billet attribué au paiement. Voir HANDOFF §4, ajusté par §8 et §8 bis.
- **SumUp Hosted Checkout**, **sandbox** tant que l'équipe n'a pas validé le passage en production.
- Billet PNG généré **dans le navigateur** sur `/merci`.
- Tous les faits de l'événement dans `src/event.ts`, tous les styles depuis `design/tokens.css`.
- Écrans, textes, états d'erreur et état « complet » : HANDOFF §6 et maquettes.

### Changements par rapport au handoff
1. **Hébergement : Netlify**, sur une adresse `*.netlify.app` pour l'instant. Le QR code de l'affiche pointe vers cette adresse. **On garde le même site Netlify pour toujours** : si un domaine est ajouté plus tard, l'adresse `netlify.app` continue de fonctionner et le QR code imprimé reste valable.
2. **Email : envoi via Gmail (SMTP) au lieu de Resend**, depuis `snack.snack.kitchen@gmail.com`, nom d'expéditeur « Snack Snack », avec un mot de passe d'application Google. Raison : sans domaine vérifié, Resend ne peut pas écrire à n'importe qui. Le contenu reste le HTML personnalisé de `email.reference.html` (avec la correction « Ton billet t'attend en un clic, garde-le sur ton téléphone. »).
   - Secrets : `SMTP_USER`, `SMTP_APP_PASSWORD` (remplacent `RESEND_API_KEY`). `MAIL_FROM` = `Snack Snack <snack.snack.kitchen@gmail.com>`.
   - `reply-to` = `snack.snack.kitchen@gmail.com`.
3. **Nouvelle page `/admin`** (voir §8).
4. **Pied de page RGPD** : « Tes données servent uniquement à organiser ce déjeuner et seront supprimées après. Contact : snack.snack.kitchen@gmail.com ».

## 8. Page admin

- URL `/admin`, aucun lien depuis le reste du site, `noindex`.
- **Connexion par lien magique** (Supabase Auth, email). Accès limité à une **liste blanche d'emails organisateurs**, vérifiée **côté serveur**. Liste initiale : `snack.snack.kitchen@gmail.com`.
- Données lues via les routes **`/api/admin/*`** de l'API Hono, qui vérifient le jeton de session Supabase et la liste blanche, puis lisent la table côté serveur. Toujours aucun accès direct du navigateur à la table.
- **Contenu** :
  - en haut, totaux : couverts payés / 20, couverts VG, montant encaissé, nombre de réservations ;
  - tableau des réservations : Nº de billet, nom, email, couverts, dont VG, statut, date de paiement. Par défaut, afficher les `paid` ; les autres statuts sont visibles via un filtre simple ;
  - bouton **Exporter en CSV** (UTF-8 avec BOM pour qu'Excel affiche bien les accents, séparateur `;`).
- **Actions** (toutes via `/api/admin/*`, qui revérifie la session et la liste blanche) :
  1. **Changer le nombre total de places en vente** (ex. 20 → 18 pour bloquer 2 couverts, ou 20 → 22). La capacité vit donc **en base** (table `settings`, une ligne), initialisée avec la valeur de `src/event.ts`. `hold_seats`, `seats-left` et l'état « complet » lisent la capacité en base. Impossible de descendre sous le nombre de couverts déjà pris (message clair).
  2. **Ajouter une réservation à la main** (payé en liquide, au TPE, ou offert) : nom, email (facultatif), couverts, dont VG, moyen de paiement (`liquide` / `tpe` / `offert`). Elle passe directement en `paid` avec un Nº de billet, compte dans les places prises, et ignore la limite de 2 par email. Colonne `source` : `online` ou `manual`. Une case « Envoyer l'email de confirmation » apparaît si un email est saisi, décochée par défaut.
  3. **Supprimer une réservation** : on ne l'efface pas, elle passe en statut `cancelled` (après confirmation). La place est libérée, le Nº de billet n'est pas réattribué, aucun remboursement automatique. Si elle avait été payée en ligne, l'admin rappelle de rembourser dans SumUp.
- Exception assumée à la règle « faits de l'événement uniquement dans `src/event.ts` » : la **capacité** est modifiable depuis l'admin, donc stockée en base. `src/event.ts` ne garde que la valeur initiale.
- Style : mêmes tokens que le site (fond sombre, moutarde), mais sobre et lisible avant tout. Pas de maquette : c'est au constructeur de faire propre.

## 8 bis. Cas limites tranchés (choix de Claude, à relire)

- **Paiement arrivé après expiration de la réservation, et plus de place** : rare (la réservation et la session SumUp durent toutes deux 30 min) mais possible. On passe la réservation en `paid` avec une colonne `needs_refund boolean default false` à `true`. Ces lignes **ne comptent pas** dans les places prises ni dans les totaux de l'admin, et apparaissent surlignées dans le tableau et dans le CSV (colonne « À rembourser »). Un email d'alerte part vers `snack.snack.kitchen@gmail.com`. Le remboursement se fait à la main depuis SumUp.
- **Places bloquées par de faux emails** : risque accepté pour 20 places, sans CAPTCHA ni nouvelle dépendance. Les réservations non payées se libèrent seules après 30 min.
- **Suppression des données après l'événement** : un script SQL documenté (`supabase/purge.sql`), lancé à la main par les organisateurs après l'export final.
- **Une seule base Supabase** (pas de projet dev séparé) : les réservations de test sont supprimées avant l'ouverture (HANDOFF §8, étape 8), et la séquence des Nº de billet repart de 1.
- **Lien magique de l'admin** : l'envoi d'emails intégré à Supabase Auth est trop limité. On configure l'envoi SMTP de Supabase Auth avec le même compte Gmail et le même mot de passe d'application. C'est une étape manuelle dans le tableau de bord Supabase, que le plan guidera.

## 9. Contraintes

- **Délai** : site en ligne, paiement réel testé, **avant mardi 10 novembre**.
- Compte SumUp de l'asso : SIRET OK, clé API créée. **Non vérifié** : activation du Hosted Checkout sur ce compte et moyens de paiement proposés (Apple Pay / Google Pay). À confirmer dès le premier test sandbox ; c'est le premier risque du projet.
- Nouvelles dépendances : à lister dans le plan et faire valider avant installation.
- Licence Nohemi : validée par Hugo.
- **SumUp, tests** : on cherche d'abord une sandbox SumUp (compte marchand de test, à vérifier dans la doc et le tableau de bord). S'il n'y en a pas, on teste en réel avec un paiement de 1 €, remboursé ensuite depuis SumUp. Pour ça, le prix doit pouvoir être surchargé pour le test sans toucher à `src/event.ts` en production (variable d'environnement côté serveur, par exemple).
- **Comptes Supabase et Netlify** : les accès connectés à cette session sont peut-être ceux du compte pro d'Hugo (Algolia). **Ne rien créer ni déployer sur Supabase ou Netlify** tant qu'Hugo n'a pas confirmé quel compte utiliser. D'ici là, on travaille en local ; le front (étapes 1–2) n'a besoin d'aucun compte. La base Postgres hébergée devient nécessaire à partir de l'étape Supabase.
- Repo GitHub : `HugoWith/Snack.Snack`. Les commits sont faits par Hugo.

## 10. Laissé au constructeur

- Structure interne du front (fichiers, modules), choix entre multi-page Vite ou routes simples.
- Détails du polling de `/merci`, de la tâche d'expiration des `held`, du cache de `seats-left`.
- Mise en page de l'admin.
- Choix précis des bibliothèques (sous réserve de validation).
- Format exact du CSV au-delà de ce qui est dit en §8.

## 11. Encore ouvert

- Nom de domaine (plus tard, sans impact sur le QR code si on garde le même site Netlify).
- **Nom du site Netlify** : à choisir par Hugo **avant l'impression du QR code**. On développe en local d'ici là.
- Compte Supabase / Netlify à utiliser (perso ou asso, pas le compte pro).
- Autres emails organisateurs à ajouter à la liste blanche de l'admin.
