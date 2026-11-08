# Snack Snack #1 — Billetterie : handoff design → code

Petit site de réservation et de paiement pour le déjeuner Snack Snack chez Silk, à Marseille. Le design est validé : maquettes dans `design/mockups/`, tokens dans `design/tokens.css`, assets dans `public/`. Ce document dit **quoi construire, dans quel ordre, et ce qui reste à vérifier**.

## 1. L'événement (faits à afficher, source de vérité)

| | |
|---|---|
| Nom | Snack Snack — Édition #1 |
| Lieu | Silk, 54 Rue Vacon, 13001 Marseille |
| Date | Dimanche 22 novembre 2026 |
| Déjeuner | 12h00, une table, menu unique |
| After-déjeuner | dès 15h30, gratuit et ouvert à toustes (pas de billet) |
| Prix | 45 € le couvert, hors boissons |
| Capacité | 20 couverts au total |
| Limite | 2 couverts maximum par personne (par email) |
| Végétarien | option VG sur demande : on demande **combien** de couverts VG (0 à nb de couverts) |
| Conditions | « Pas de remboursement, billet cessible. » (case obligatoire) |

Mets ces valeurs dans **un seul fichier de config** (`src/event.ts` ou équivalent) : elles ne doivent être écrites nulle part ailleurs en dur.

## 2. Parcours

```
Page billetterie ──► create-checkout (Supabase) ──► page de paiement SumUp (hébergée)
       ▲                    │ réserve les places 30 min           │
       │                    ▼                                     ▼
  seats-left          table reservations ◄── sumup-webhook ◄── SumUp (CHECKOUT_STATUS_CHANGED)
                            │                     │
                            ▼                     ▼
                     page Merci + billet     email de confirmation (Resend)
```

1. **Billetterie** (`/`) : la personne saisit prénom et nom, email, couverts (1–2), dont VG (0–couverts), coche les conditions, voit le total, clique « PAYER ».
2. Le front appelle `create-checkout`. Le serveur valide, **réserve les places de façon atomique**, crée un checkout SumUp en Hosted Checkout et renvoie `hosted_checkout_url`. Le front redirige.
3. La personne paie sur la page SumUp (Apple Pay, Google Pay, carte selon ce que le compte SumUp propose).
4. SumUp appelle `sumup-webhook`. Le serveur **revérifie le statut auprès de l'API SumUp** (le webhook ne contient pas le statut), passe la réservation en `paid`, attribue le numéro de billet et envoie l'email.
5. SumUp renvoie la personne sur `/merci?ref=<id>` via `redirect_url`. La page interroge `reservation` jusqu'à `paid` (le webhook peut arriver après), puis affiche le billet et le bouton « ENREGISTRER MON BILLET » (PNG).

## 3. Stack recommandée

- **Front** : site statique (Vite + TypeScript, sans framework, ou Astro). Trois pages : `/`, `/merci`, `/billet` (optionnel, lien de l'email). Mobile d'abord, colonne de 390 px qui s'élargit jusqu'à ~480 px centrée sur desktop.
- **Back** : Supabase (Postgres + Edge Functions Deno). Pas d'accès direct du navigateur à la table : tout passe par les fonctions (clé `service_role` côté serveur uniquement).
- **Paiement** : SumUp Online Payments, **Hosted Checkout**.
- **Email** : Resend (ou autre fournisseur SMTP/API ; à choisir).
- **Billet image** : v1 générée **côté navigateur** sur `/merci` (rendu du composant billet en canvas, ex. `html-to-image`) en 1080×1920. Pas de pièce jointe dans l'email en v1 : l'email contient un récap et un lien vers `/billet?ref=…`.
- **Hébergement front** : n'importe quel hébergeur statique (Netlify, Vercel, Cloudflare Pages…). Le domaine final sert de `SITE_URL`.

## 4. Données (Supabase)

```sql
create table public.reservations (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null check (char_length(full_name) between 2 and 120),
  email            text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  covers           int  not null check (covers between 1 and 2),
  vg               int  not null default 0 check (vg >= 0 and vg <= covers),
  amount_cents     int  not null,
  status           text not null default 'held' check (status in ('held','paid','failed','expired')),
  hold_expires_at  timestamptz not null,
  sumup_checkout_id text unique,
  ticket_no        int unique,          -- Nº du billet, attribué au paiement (1, 2, 3…)
  email_sent_at    timestamptz,
  created_at       timestamptz not null default now(),
  paid_at          timestamptz
);
alter table public.reservations enable row level security;  -- aucune policy : accès via service_role seulement
create index on public.reservations (lower(email));
create index on public.reservations (status, hold_expires_at);
```

**Places prises** = somme des `covers` où `status = 'paid'` OU (`status = 'held'` ET `hold_expires_at > now()`).

Fonction de réservation atomique (appelée par `create-checkout`) :

```sql
create or replace function public.hold_seats(p_name text, p_email text, p_covers int, p_vg int, p_price_cents int, p_capacity int, p_max_per_email int)
returns uuid language plpgsql security definer set search_path = public as $$
declare taken int; mine int; new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('snack-snack-seats'));
  select coalesce(sum(covers),0) into taken from reservations
    where status = 'paid' or (status = 'held' and hold_expires_at > now());
  if taken + p_covers > p_capacity then raise exception 'SOLD_OUT'; end if;
  select coalesce(sum(covers),0) into mine from reservations
    where lower(email) = lower(p_email) and (status = 'paid' or (status = 'held' and hold_expires_at > now()));
  if mine + p_covers > p_max_per_email then raise exception 'MAX_PER_EMAIL'; end if;
  insert into reservations (full_name, email, covers, vg, amount_cents, hold_expires_at)
    values (p_name, lower(p_email), p_covers, p_vg, p_covers * p_price_cents, now() + interval '30 minutes')
    returning id into new_id;
  return new_id;
end $$;
revoke all on function public.hold_seats from public, anon, authenticated;
```

Le numéro de billet s'attribue au passage en `paid`, sous le même verrou : `ticket_no = (select coalesce(max(ticket_no),0)+1 from reservations)`.

## 5. Edge Functions

Secrets : `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `RESEND_API_KEY`, `MAIL_FROM`, `SITE_URL`.

| Fonction | Méthode | Rôle |
|---|---|---|
| `seats-left` | GET | `{ left: number, capacity: 20 }`. Utilisé par le compteur à carrés. Cache court (≤ 10 s). |
| `create-checkout` | POST | Corps `{ fullName, email, covers, vg, acceptTerms }`. Valide (mêmes règles que la table, `acceptTerms === true`), appelle `hold_seats`, crée le checkout SumUp, enregistre `sumup_checkout_id`, renvoie `{ url }`. Erreurs lisibles : `SOLD_OUT`, `MAX_PER_EMAIL`, `INVALID`. Si l'appel SumUp échoue, passer la réservation en `failed` pour libérer les places. |
| `sumup-webhook` | POST | Reçoit `{ "event_type": "CHECKOUT_STATUS_CHANGED", "id": "<checkout id>" }`. Répond **tout de suite** en 2xx, puis : relit le checkout auprès de SumUp, et si payé → `paid` + `ticket_no` + email (idempotent : ne rien refaire si déjà `paid` / `email_sent_at` non nul). Ignorer les autres `event_type`. |
| `reservation` | GET `?ref=` | Pour `/merci` et `/billet` : `{ status, ticketNo, fullName, covers, vg }`. Si encore `held`, relit le checkout SumUp (filet de sécurité si le webhook tarde). Ne renvoie jamais l'email. |

### Création du checkout SumUp (Hosted Checkout)

`POST https://api.sumup.com/v0.1/checkouts`, en-tête `Authorization: Bearer $SUMUP_API_KEY` :

```json
{
  "amount": 90.00,
  "currency": "EUR",
  "checkout_reference": "<reservations.id>",
  "merchant_code": "<SUMUP_MERCHANT_CODE>",
  "description": "Snack Snack #1 — 2 couverts",
  "redirect_url": "<SITE_URL>/merci?ref=<reservations.id>",
  "return_url": "<SUPABASE_FUNCTIONS_URL>/sumup-webhook",
  "hosted_checkout": { "enabled": true }
}
```

La réponse contient `id` (à stocker) et `hosted_checkout_url` (où rediriger). La session hébergée vit 30 minutes, d'où la réservation de 30 minutes.

**À vérifier dans la doc de référence SumUp avant d'implémenter** (https://developer.sumup.com/api) :
- l'endpoint exact pour relire un checkout (probablement `GET /v0.1/checkouts/{id}`) et la liste des statuts (payé / échec / expiré) ;
- l'activation d'Apple Pay / Google Pay sur la page hébergée pour ce compte marchand ;
- le webhook n'est pas signé : c'est pour ça qu'on **relit toujours** le statut via l'API avant d'agir.

### Cas limites
- Paiement confirmé alors que la réservation a expiré : si la capacité le permet encore, accepter ; sinon passer en `paid`, marquer pour remboursement manuel et alerter les organisateurs (log + email à `MAIL_FROM`).
- Double clic sur PAYER : désactiver le bouton (« PAIEMENT… ») pendant l'appel.
- Une tâche planifiée (ou la lecture elle-même) passe les `held` expirés en `expired`, pour garder une table propre.

## 6. Écrans (voir `design/mockups/`, ouvrir dans un navigateur)

Les fichiers `*.reference.html` sont des **maquettes de référence** exportées de l'outil de design : la mise en page et les valeurs sont justes, mais le balisage (`<x-dc>`, `support.js`) n'est pas à réutiliser tel quel. Reconstruire proprement avec `design/tokens.css`.

### `/` — billetterie (`affiche.reference.html`)
1. **Premier écran plein cadre** (hauteur 100svh) : photo `tablier-chaise.jpg` en cover, vignettage noir. Kicker centré en haut : `DÉJEUNER ET AFTER-DÉJEUNER`. En bas : énoncé moutarde `DIMANCHE 22 NOVEMBRE. / 12H00. 45€ LE COUVERT.` puis logo (150 px) centré.
2. **Section formulaire** sur `fond-inox.jpg` assombri :
   - compteur discret : 20 petits carrés de 9 px (pris = `#3b3c3f`, libres = moutarde), et en dessous `ENCORE 07 PLACES SUR 20` (chiffre en moutarde) ;
   - **le bon de commande** (papier `--paper`, légèrement tourné de -1°, ombre `--shadow-paper`) : `PRÉNOM ET NOM:` (valeur en Nohemi capitales), `EMAIL:`, `COVERS:` −/+ (1–2), `DONT VG:` −/+ (0–covers).
3. **L'addition** : bloc moutarde pleine largeur : `L'ADDITION.` + total en très gros (`90€`), case `C'est noté : pas de remboursement, billet cessible.`, bouton noir texte moutarde `PAYER`, puis petite ligne « Paiement sécurisé par SumUp ».
- État **complet** : remplacer le bon par l'énoncé `COMPLET. À LA PROCHAINE.` et masquer l'addition.
- Messages d'erreur sous le champ, en `--alert`, tutoiement : « Il manque la fin de l'adresse. Ton billet arrive par là. » ; « Il ne reste que 1 place. » ; « 2 couverts max. par personne. »

### `/merci` (`merci.reference.html`)
Fond inox. Kicker `C'EST RÉSERVÉ - ON SE VOIT À TABLE`. Énoncé `MERCI {PRÉNOM}. / TON COUVERT EST POSÉ.` Le billet (voir ci-dessous). Bouton moutarde `ENREGISTRER MON BILLET` (télécharge le PNG 1080×1920). Ligne « Un email arrive avec ton billet. L'after commence à 15h30. » Logo en pied.
- Tant que le statut est `held` : afficher `ON VÉRIFIE LE PAIEMENT…` et réinterroger toutes les 2 s (max ~60 s), puis message de repli : « Le paiement met du temps à arriver. Tu recevras l'email dès qu'il est confirmé. »
- Statut `failed` / `expired` : `LE PAIEMENT N'EST PAS PASSÉ.` + lien retour vers `/`.

### Le billet (`billet.reference.html`, image 1080×1920)
Bon de commande papier sur fond inox, tourné de -2°, scotch bleu en haut, petite tache de sauce. Contenu : `SNACK SNACK / ÉDITION #1`, `Nº07` (deux chiffres), grille `TABLE: 1` · `COVERS: 2 (1 VG)` · `DATE: 22.11 · 12H` · `SERVER: SILK`, nom en Nohemi capitales. En haut : `DIMANCHE 22 NOVEMBRE - 12H00`. En bas : logo + `SILK - MARSEILLE`. **Uniquement Nohemi et Satoshi**, aucune police manuscrite.

### Email de confirmation (`email.reference.html`, 600 px)
- Objet : `Ton couvert est posé. Nº07`
- En-tête photo `plat-os.jpg` + logo ; énoncé `MERCI CAMILLE. / DIMANCHE 22 NOVEMBRE. / 12H00. SILK, MARSEILLE.` ; adresse `54 Rue Vacon, 13001 Marseille` ; récap papier (Nº, covers, payé) ; trois phrases : lien vers le billet, « Une allergie, une remarque ? Réponds simplement à ce mail. », rappel de l'after à 15h30 ; bouton `VOIR MON BILLET` → `/billet?ref=…` ; signature `BISOU BISOU`.
- **Modifier la maquette sur un point** : elle dit « Ton billet est en pièce jointe » ; en v1 (sans pièce jointe) écrire « Ton billet t'attend en un clic, garde-le sur ton téléphone. »
- Email = HTML en tables, styles inline, polices web avec repli `Arial Black` / `Arial` (beaucoup de clients mail n'affichent pas les polices web). Images hébergées sur le site. `reply-to` = adresse des organisateurs.

## 7. Règles de design à respecter

- Fond toujours sombre. Un seul accent : moutarde `#ffbd00`. Sur moutarde, texte noir.
- Peu d'éléments, beaucoup d'air : kicker gris en haut, un énoncé moutarde, le logo. Pas d'icônes, pas de cartes arrondies, pas de dégradés décoratifs.
- Coins vifs partout. Le logo est **le PNG** (`public/img/snack-snack-logo*.png`, halo noir intégré) : ne jamais le recomposer en texte ni lui ajouter d'ombre.
- Polices : Nohemi ExtraBold (titres, valeurs du bon, chiffres, boutons), Satoshi Bold / Black (texte, kickers). Il n'y a pas de Satoshi Regular/Medium dans les fichiers fournis.
- Accessibilité : vrais `<label>`, `aria-label` sur −/+, cibles ≥ 44 px, champs à 18 px min (pas de zoom iOS), contrastes déjà vérifiés dans les tokens, le logo a `alt="Snack Snack"` et sert de `h1` sur le premier écran.
- Licence : vérifier que la licence de Nohemi autorise l'usage web avant la mise en ligne.

## 8. Ordre de travail proposé

1. Initialiser le projet front + `event.ts` + `tokens.css` + polices.
2. Page `/` statique fidèle à la maquette (compteur, bon, addition, états erreur / complet).
3. Supabase : migration (table + `hold_seats`), fonction `seats-left`, brancher le compteur.
4. `create-checkout` avec SumUp en **sandbox** (compte marchand de test SumUp), redirection.
5. `sumup-webhook` + `reservation` + page `/merci` (sondage du statut).
6. Billet : composant + export PNG 1080×1920 ; page `/billet`.
7. Email (Resend) + test de bout en bout en sandbox.
8. Passage en production : clés live, domaine, test réel à 1 € puis remboursement, nettoyage des réservations de test.

## 9. Questions encore ouvertes

- Quel compte SumUp encaisse (lié à l'association PTT, qui n'a pas encore de SIRET) et a-t-il accès à l'API Online Payments ?
- Nom de domaine et adresse d'expédition de l'email.
- Adresse « reply-to » des organisateurs pour les allergies.
- Mention RGPD courte en pied de page : données utilisées uniquement pour l'événement, supprimées après.
