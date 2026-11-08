# Snack Snack #1 — Billetterie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un mini-site de billetterie Snack Snack (20 couverts, 45 €, 2 max par email, option VG) qui encaisse via SumUp Hosted Checkout, délivre un billet PNG, envoie un email perso, et offre aux organisateurs une page admin (tableau, CSV, capacité, ajout/annulation manuels).

**Architecture:** Front Vite + React + TS multi-pages (`/`, `/merci`, `/billet`, `/admin`). API Hono dans une seule Netlify Function sous `/api/*`. Toute logique qui touche au compteur de places est une fonction SQL Postgres sous un même verrou consultatif ; l'API valide, authentifie, parle à SumUp et Gmail, et appelle ces fonctions.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind v4 (`@tailwindcss/vite`), Vitest, Hono, `postgres` (porsager), Supabase (Postgres + Auth, CLI en local), `nodemailer` (Gmail SMTP), `html-to-image`, `netlify-cli` (dev).

**Spec:** `docs/superpowers/specs/2026-11-06-billetterie-design.md` (l'emporte), puis `HANDOFF.md`, `CLAUDE.md`, maquettes `design/mockups/*.reference.html`.

## Global Constraints

- Tous les faits de l'événement dans `src/event.ts`, importé par le front **et** l'API. Rien en dur ailleurs. Exception : capacité courante en base (`settings`).
- Couleurs, polices, espacements, ombres : uniquement les tokens de `design/tokens.css`, exposés à Tailwind via `@theme`. Aucune nouvelle couleur. Coins vifs partout (`--radius-0`).
- Logo = PNG `public/img/snack-snack-logo*.png`, `alt="Snack Snack"`, jamais de texte ni d'ombre. Sur `/`, le logo est le `h1`.
- Polices : Nohemi ExtraBold (titres, valeurs du bon, chiffres, boutons), Satoshi Bold/Black (texte, kickers). Rien d'autre, aucune police manuscrite.
- Textes en français, tutoiement, phrases courtes, capitales pour les énoncés.
- Le navigateur n'accède jamais à la table. Aucun secret dans le front ni dans le repo (`.env` gitignoré, `.env.example` commité).
- SumUp en **sandbox** tant que l'équipe n'a pas validé la production. Avant d'agir sur un webhook : toujours relire le checkout via l'API SumUp.
- **Ne rien créer ni déployer sur Supabase ou Netlify** (comptes distants) avant confirmation d'Hugo. Tout le développement se fait en local : `supabase start` (Docker) + `netlify dev`.
- **Un commit par tâche**, fait par l'agent une fois la relecture de la tâche passée, sur la branche `feature/billetterie` (jamais sur `main`, pas de push sans demande d'Hugo). Message à l'impératif, < 72 caractères, **sans** ligne `Co-Authored-By` ni pied « Generated with Claude Code ». Seul arrêt obligatoire pour Hugo : la validation de la page `/` (Tâche 3), puis les étapes qui demandent ses clés (Tâches 6 et 8).
- **Front (Tâches 3, 7, 9)** : en plus des maquettes, utiliser le skill **impeccable** (le projet a des maquettes et un design system établis) pour la mise en page, la typo, les états, l'accessibilité et la vérification visuelle. Les maquettes et `tokens.css` restent la référence : impeccable affine, il ne réinvente pas la direction artistique.
- Nouvelles dépendances : uniquement celles listées en Tâche 1 (validées par Hugo avant `npm install`). Toute autre → demander.
- Mobile d'abord : colonne 390 px, qui s'élargit jusqu'à 480 px max, centrée sur desktop. Cibles ≥ 44 px, champs ≥ 18 px, vrais `<label>`, `aria-label` sur −/+.
- Conventions : composants `PascalCase.tsx` (un par fichier), hooks `useX`, utilitaires `kebab-case.ts`, pas de `any`, pas de `console.log` commité (sauf l'étape temporaire de la Tâche 3), pas de styles inline (sauf la rotation/position calculée si Tailwind ne suffit pas).

## Review Focus

1. **Deux personnes paient les dernières places en même temps** → jamais plus de `capacity` couverts pris ; la seconde reçoit `SOLD_OUT`. Test : Tâche 4, `hold_seats concurrency`.
2. **Même email, casse/espaces différents** (`" Camille@Gmail.com "` puis `"camille@gmail.com"`) → la limite de 2 s'applique. Test : Tâche 4 (`max per email is case-insensitive`) + Tâche 6 (trim côté API).
3. **Retour sur `/merci` après un paiement annulé ou échoué** → message « LE PAIEMENT N'EST PAS PASSÉ. » et places libérées tout de suite (pas au bout de 30 min). Test : Tâche 6, `reservation marks failed when SumUp says FAILED`.
4. **Webhook reçu deux fois, ou webhook et polling de `/merci` en course** → un seul Nº de billet, un seul email. Test : Tâche 4 (`confirm_payment is idempotent`) + Tâche 8 (`sends email once`).
5. **Admin baisse la capacité sous le nombre de couverts pris, ou ajoute à la main quand c'est complet** → refus avec message clair, rien ne change. Test : Tâche 4 (`set_capacity refuses below taken`, `admin_add refuses when full`).

---

## File Structure

```
index.html  merci.html  billet.html  admin.html     # entrées Vite (multi-page)
netlify.toml                                         # build, functions dir, pretty URLs
.env.example
src/
  event.ts                    # faits de l'événement (front + API)
  styles/index.css            # @import tokens, @font-face (/fonts/...), @theme Tailwind
  lib/api.ts                  # appels fetch vers /api/* (front)
  lib/format.ts               # formatEuros, formatTicketNo, formatSeatsLeft
  lib/order.ts                # validation et calcul du bon (pur)
  pages/billetterie/          # BilletteriePage.tsx, Hero.tsx, SeatCounter.tsx, OrderSlip.tsx,
                              # Stepper.tsx, Addition.tsx, SoldOut.tsx, useOrderForm.ts, useSeatsLeft.ts
  pages/merci/                # MerciPage.tsx, useReservationStatus.ts
  pages/billet/               # BilletPage.tsx
  components/Ticket.tsx       # billet (partagé /merci et /billet)
  lib/export-ticket.ts        # PNG 1080×1920 via html-to-image
  pages/admin/                # AdminPage.tsx, Login.tsx, Totals.tsx, ReservationsTable.tsx,
                              # CapacityForm.tsx, AddReservationForm.tsx, useAdmin.ts
  lib/csv.ts                  # toCsv(rows) (pur)
  main-*.tsx                  # un point d'entrée par page
netlify/functions/api.ts      # export default handler Hono, config.path = "/api/*"
server/
  app.ts                      # createApp(deps) : routes Hono (testable sans Netlify)
  db.ts                       # client postgres + wrappers typés des fonctions SQL
  sumup.ts                    # createCheckout, getCheckout
  mailer.ts                   # sendMail via nodemailer
  email-template.ts           # renderConfirmationEmail(data) -> { subject, html, text }
  admin-auth.ts               # middleware : jeton Supabase + ADMIN_EMAILS
  validation.ts               # parseCheckoutBody
supabase/
  config.toml                 # généré par `supabase init`
  migrations/20261106000000_init.sql
  purge.sql
tests/
  db/*.test.ts                # contre Postgres local (supabase start)
  server/*.test.ts            # Hono app.request avec deps mockées
  lib/*.test.ts
```

`server/` est importé par `netlify/functions/api.ts` ; `createApp(deps)` reçoit `db`, `sumup`, `mailer`, `verifyAdmin`, `now` pour être testé sans réseau.

---

### Task 1: Scaffold, tokens, event config

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `merci.html`, `billet.html`, `admin.html`, `src/main-*.tsx` (pages vides « À venir »), `src/styles/index.css`, `src/event.ts`, `src/lib/format.ts`, `.gitignore`, `.env.example`, `netlify.toml`
- Test: `tests/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `src/event.ts` : `export const EVENT = { name: "Snack Snack — Édition #1", edition: 1, venue: { name: "Silk", address: "54 Rue Vacon, 13001 Marseille", city: "Marseille" }, dateISO: "2026-11-22T12:00:00+01:00", dateLabel: "Dimanche 22 novembre", lunchTime: "12h00", afterTime: "15h30", priceCents: 4500, initialCapacity: 20, maxPerEmail: 2, holdMinutes: 30, terms: "Pas de remboursement, billet cessible.", contactEmail: "snack.snack.kitchen@gmail.com" } as const`
  - `src/lib/format.ts` : `formatEuros(cents: number): string` (`9000 → "90€"`, `4500 → "45€"`), `formatTicketNo(n: number): string` (`7 → "Nº07"`, `12 → "Nº12"`), `formatSeatsLeft(n: number): string` (`7 → "07"`).
  - Tailwind utilities from tokens: `bg-ground`, `text-mustard`, `bg-paper`, `text-ticket-ink`, `text-ticket-value`, `text-label`, `text-alert`, `font-display`, `font-text`, `shadow-paper`, `shadow-hard`, spacing `1/2/3/4/6/8/12/16` = token values.

- [ ] **Step 1: Dependency check with Hugo.** List and get approval before installing: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `hono`, `postgres`, `nodemailer`, `@types/nodemailer`, `@supabase/supabase-js`, `html-to-image`, `@netlify/functions` (types), `netlify-cli` (dev). Only Task 1's front subset is installed now; the rest at the task that needs it.
- [ ] **Step 2: Write failing test** `tests/lib/format.test.ts`: `formatEuros(9000) === "90€"`, `formatEuros(4500) === "45€"`, `formatTicketNo(7) === "Nº07"`, `formatTicketNo(12) === "Nº12"`, `formatSeatsLeft(7) === "07"`, `formatSeatsLeft(20) === "20"`.
- [ ] **Step 3: Run** `npx vitest run tests/lib/format.test.ts` → FAIL (module missing).
- [ ] **Step 4: Implement** `src/event.ts` and `src/lib/format.ts`. Vite multi-page via `build.rollupOptions.input` (4 html). `src/styles/index.css` : `@import "tailwindcss";`, import `design/tokens.css` for variables, re-declare `@font-face` with `/fonts/*.woff2` URLs (public dir), `@theme inline` mapping every token. `body` : `bg-ground text-text font-text`. `netlify.toml` : `build.command = "npm run build"`, `publish = "dist"`, `functions = "netlify/functions"`. `.env.example` lists: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `SITE_URL`, `SMTP_USER`, `SMTP_APP_PASSWORD`, `MAIL_FROM`, `ADMIN_EMAILS`, `PRICE_CENTS_OVERRIDE`.
- [ ] **Step 5: Run** `npx vitest run` → PASS ; `npx tsc --noEmit` → 0 error ; `npm run dev` → les 4 pages répondent.
- [ ] **Step 6: Commit** `chore: scaffold vite react app with tokens and event config` (after task review passes).

### Task 2: Order form logic (pure)

**Files:**
- Create: `src/lib/order.ts`
- Test: `tests/lib/order.test.ts`

**Interfaces:**
- Consumes: `EVENT`.
- Produces:
  - `type OrderInput = { fullName: string; email: string; covers: number; vg: number; acceptTerms: boolean }`
  - `type OrderErrors = Partial<Record<"fullName" | "email" | "covers" | "terms", string>>`
  - `validateOrder(input: OrderInput, seatsLeft: number): OrderErrors`
  - `orderTotalCents(covers: number): number`
  - `clampCovers(n: number, seatsLeft: number): number` (borne 1..min(maxPerEmail, seatsLeft)), `clampVg(vg: number, covers: number): number` (0..covers)
  - `ORDER_COPY` : messages exacts ci-dessous.

Copy (handoff, verbatim) : email invalide → `"Il manque la fin de l'adresse. Ton billet arrive par là."` ; plus assez de places → `"Il ne reste que 1 place."` (forme générale `Il ne reste que ${n} place${n > 1 ? "s" : ""}.`) ; > max → `"2 couverts max. par personne."` (2 issu de `EVENT.maxPerEmail`). Copy choisie par Claude (à valider par Hugo en Tâche 3) : nom vide/trop court → `"Il manque ton prénom et ton nom."` ; conditions non cochées → `"Coche la case pour continuer."`

- [ ] **Step 1: Failing tests:** `validateOrder` returns `{}` for `{fullName:"Camille Durand", email:"camille@mail.fr", covers:2, vg:1, acceptTerms:true}` with seatsLeft 7 ; `email:"camille@mail"` → `errors.email === ORDER_COPY.email` ; `covers:2` with seatsLeft 1 → `errors.covers === "Il ne reste que 1 place."` ; `covers:3` → `"2 couverts max. par personne."` ; `fullName:" A "` → name error ; `acceptTerms:false` → terms error ; `orderTotalCents(2) === 9000` ; `clampVg(2, 1) === 1` ; `clampCovers(5, 7) === 2` ; `clampCovers(2, 1) === 1`.
- [ ] **Step 2: Run** `npx vitest run tests/lib/order.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Email regex identical to the SQL check: `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`. `fullName` trimmed, 2–120 chars.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: add order validation and total` (after task review passes).

### Task 3: Page `/` (static, simulated seats)

**Files:**
- Create: `src/pages/billetterie/*` (see File Structure), `src/lib/api.ts` (stub)
- Modify: `src/main-index.tsx`

**Interfaces:**
- Consumes: `EVENT`, `format.ts`, `order.ts`.
- Produces: `src/lib/api.ts` → `getSeatsLeft(): Promise<{ left: number; capacity: number }>` (stub : lit `?seats=N` dans l'URL pour simuler, défaut `{ left: 7, capacity: 20 }`), `createCheckout(input: OrderInput): Promise<{ url: string }>` (stub : `console.log` des données validées, retourne `{ url: "#" }`). Tâches 5–6 remplacent le corps, pas la signature.

Layout, copy and values: `design/mockups/affiche.reference.html` + HANDOFF §6 `/`. Reproduce the layout, not the `<x-dc>` markup. Images: `/img/tablier-chaise.jpg` (hero, `100svh`, cover, vignettage noir), `/img/fond-inox.jpg` assombri (section formulaire), `/img/snack-snack-logo.png` (150 px, `h1`).

- Hero : kicker `DÉJEUNER ET AFTER-DÉJEUNER` ; énoncé moutarde `DIMANCHE 22 NOVEMBRE.` / `12H00. 45€ LE COUVERT.` (built from `EVENT`) ; logo.
- SeatCounter : `capacity` squares of 9 px (taken `#3b3c3f` → take it from the mockup ; it's the one non-token value the handoff pins, add it to `tokens.css` as `--seat-taken` and say so to Hugo), free = mustard ; text `ENCORE {07} PLACES SUR {20}` (number mustard). Singular when 1 : `ENCORE 01 PLACE SUR 20`.
- OrderSlip (paper, `-1deg`, `shadow-paper`) : `PRÉNOM ET NOM:` (input, value in Nohemi caps), `EMAIL:`, `COVERS:` Stepper 1–2, `DONT VG:` Stepper 0–covers. Errors under each field in `text-alert`.
- Addition (mustard full width) : `L'ADDITION.`, total huge (`formatEuros(orderTotalCents(covers))`), checkbox `C'est noté : pas de remboursement, billet cessible.`, button black/mustard `PAYER` (→ `PAIEMENT…` and disabled while the call runs), line `Paiement sécurisé par SumUp`.
- SoldOut (when `left === 0`) : replaces OrderSlip with `COMPLET. À LA PROCHAINE.` and hides Addition.
- Footer RGPD : `Tes données servent uniquement à organiser ce déjeuner et seront supprimées après. Contact : snack.snack.kitchen@gmail.com`.

- [ ] **Step 1: Build components** per the bullets, using the **impeccable** skill alongside the mockup (same for Tasks 7 and 9). Logic in `useOrderForm` (state, `validateOrder` on submit then live per touched field, clamps when covers or seatsLeft change) and `useSeatsLeft`.
- [ ] **Step 2: Run** `npx tsc --noEmit` and `npx vitest run` → PASS.
- [ ] **Step 3: Visual verification** (Playwright or Chrome DevTools MCP, via a subagent) at 390×844 and 1440×900, for `/`, `/?seats=1`, `/?seats=0` ; submit empty form ; set covers to 2 with `?seats=1` ; valid submit → data in console. Screenshot the mockup at the same sizes for side by side.
- [ ] **Step 4: Stop — gate.** Show Hugo the screenshots and **the list of differences from the mockup** + the two copy lines chosen by Claude. Do not start Task 4 before Hugo validates the page. Commit `feat: build billetterie page` after task review passes (Hugo can request changes in a follow-up commit).

### Task 4: Database (local Supabase)

**Files:**
- Create: `supabase/config.toml` (`supabase init`), `supabase/migrations/20261106000000_init.sql`, `supabase/purge.sql`, `tests/db/seats.test.ts`, `tests/db/helpers.ts` (connect to local `DATABASE_URL`, truncate between tests)

**Interfaces:**
- Produces (SQL, all `security definer`, `set search_path = public`, `revoke all ... from public, anon, authenticated`, all mutating ones take `pg_advisory_xact_lock(hashtext('snack-snack-seats'))`) :
  - table `reservations` : HANDOFF §4 columns + `status` check adds `'cancelled'` ; `needs_refund boolean not null default false` ; `source text not null default 'online' check (source in ('online','manual'))` ; `payment_method text check (payment_method in ('sumup','liquide','tpe','offert'))` (default `'sumup'`) ; `email` nullable when `source = 'manual'` (check : `source = 'manual' or email is not null`) ; `cancelled_at timestamptz`.
  - table `settings (id int primary key default 1 check (id = 1), capacity int not null check (capacity >= 0))`, seeded with 20 (migration comment: value from `EVENT.initialCapacity`).
  - `seats_taken() returns int` : sum covers where (`paid` and not `needs_refund`) or (`held` and `hold_expires_at > now()`).
  - `hold_seats(p_name text, p_email text, p_covers int, p_vg int, p_price_cents int, p_max_per_email int, p_hold_minutes int) returns uuid` : capacity read from `settings` ; raises `SOLD_OUT` / `MAX_PER_EMAIL` ; stores `lower(trim(p_email))`.
  - `attach_checkout(p_id uuid, p_checkout_id text) returns void`.
  - `confirm_payment(p_id uuid) returns table (ticket_no int, needs_refund boolean, newly_paid boolean)` : no-op if already `paid` (returns `newly_paid = false`) ; if hold expired and `seats_taken() + covers > capacity` → `paid`, `needs_refund = true`, no `ticket_no` ; else `paid`, `ticket_no = max+1`, `paid_at = now()`.
  - `mark_failed(p_id uuid, p_status text) returns void` (`failed` or `expired`, only from `held`).
  - `admin_add(p_name text, p_email text, p_covers int, p_vg int, p_payment_method text, p_price_cents int) returns table (id uuid, ticket_no int)` : raises `SOLD_OUT` if no room ; no per-email limit ; `source = 'manual'`, `status = 'paid'`, `amount_cents = 0` if `offert` else `p_covers * p_price_cents`.
  - `admin_cancel(p_id uuid) returns void` : → `cancelled`, `cancelled_at = now()`.
  - `set_capacity(p_capacity int) returns void` : raises `CAPACITY_BELOW_TAKEN` if `p_capacity < seats_taken()`.
  - `expire_holds() returns int` : `held` past expiry → `expired` (called at the start of `seats_taken` readers in the API, no cron).
  - `purge.sql` : `truncate reservations;` with a header comment: run only after the final CSV export.

- [ ] **Step 1: `supabase init` then `supabase start`**, record the local `DATABASE_URL` in `.env`.
- [ ] **Step 2: Failing tests** (`tests/db/seats.test.ts`): `hold_seats concurrency` — 25 parallel `hold_seats(…, covers 1)` with distinct emails → exactly 20 ids, 5 `SOLD_OUT` ; `max per email is case-insensitive` — `" Camille@Gmail.com "` 2 covers then `"camille@gmail.com"` 1 cover → `MAX_PER_EMAIL` ; `expired hold frees seats` (set `hold_expires_at` in the past → `seats_taken()` drops) ; `confirm_payment is idempotent` — twice → same `ticket_no`, second `newly_paid = false` ; ticket numbers 1, 2, 3 in confirmation order ; `late payment over capacity` → `needs_refund = true`, `ticket_no` null, not counted ; `set_capacity refuses below taken` ; `admin_add refuses when full` ; `admin_add ignores per-email limit` ; `admin_cancel frees seats and keeps ticket_no`.
- [ ] **Step 3: Run** `npx vitest run tests/db` → FAIL.
- [ ] **Step 4: Write the migration**, `supabase db reset` to apply.
- [ ] **Step 5: Run** `npx vitest run tests/db` → PASS (all).
- [ ] **Step 6: Commit** `feat: add reservations schema and seat functions` (after task review passes).

### Task 5: Hono API skeleton + seats-left wired

**Files:**
- Create: `server/app.ts`, `server/db.ts`, `netlify/functions/api.ts`, `tests/server/seats-left.test.ts`
- Modify: `src/lib/api.ts` (`getSeatsLeft` real fetch), `package.json` (`"dev": "netlify dev"`, `"dev:front": "vite"`)

**Interfaces:**
- Consumes: SQL functions from Task 4.
- Produces:
  - `type Deps = { db: Db; sumup: SumUp; mailer: Mailer; verifyAdmin: (authHeader: string | undefined) => Promise<{ email: string } | null>; env: { siteUrl: string; priceCents: number } }`
  - `createApp(deps: Deps): Hono` ; `server/db.ts` → `createDb(url: string): Db` with typed methods wrapping each SQL function (`seatsLeft(): Promise<{ left: number; capacity: number }>`, `holdSeats(...)`, `attachCheckout`, `confirmPayment`, `markFailed`, `getReservation(id)`, `getByCheckoutId(checkoutId)`, `listReservations()`, `adminAdd`, `adminCancel`, `setCapacity`, `markEmailSent(id)`), SQL errors mapped to `SeatError("SOLD_OUT" | "MAX_PER_EMAIL" | "CAPACITY_BELOW_TAKEN")`.
  - `GET /api/seats-left` → `{ left, capacity }`, header `Cache-Control: public, max-age=10`.
  - `netlify/functions/api.ts` : `export default (req: Request) => app.fetch(req)` and `export const config = { path: "/api/*" }` (verify against current Netlify Functions + Hono docs via context7 ; adjust only the wiring). `env.priceCents = Number(process.env.PRICE_CENTS_OVERRIDE) || EVENT.priceCents`.

- [ ] **Step 1: Failing test:** `app.request("/api/seats-left")` with a fake `db.seatsLeft` returning `{left: 7, capacity: 20}` → 200, body equal, cache header present.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Manual check:** `npm run dev`, `curl localhost:8888/api/seats-left` → `{"left":20,"capacity":20}` ; page `/` shows 20 free squares.
- [ ] **Step 6: Commit** `feat: add hono api and wire seat counter` (after task review passes).

### Task 6: SumUp checkout, reservation status, webhook

**Files:**
- Create: `server/sumup.ts`, `server/validation.ts`, `tests/server/checkout.test.ts`, `tests/server/reservation.test.ts`, `tests/server/webhook.test.ts`
- Modify: `server/app.ts`, `src/lib/api.ts` (`createCheckout` real ; add `getReservation(ref)`), `src/pages/billetterie/useOrderForm.ts` (redirect to `url`, show server errors)

**Interfaces:**
- Produces:
  - `server/sumup.ts` : `createSumUp({ apiKey, merchantCode }): SumUp` with `createCheckout({ amountCents, reference, description, redirectUrl, returnUrl }): Promise<{ id: string; hostedCheckoutUrl: string }>` and `getCheckout(id: string): Promise<{ status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" }>`. Body per HANDOFF §5 (`hosted_checkout: { enabled: true }`, `currency: "EUR"`, `description: "Snack Snack #1 — 2 couverts"`). **Before coding, verify on https://developer.sumup.com/api** : read endpoint, exact status list, sandbox merchant availability. Report findings to Hugo.
  - `server/validation.ts` : `parseCheckoutBody(body: unknown): { ok: true; value: OrderInput } | { ok: false }` — trims name/email, lowercases email, reuses `validateOrder` rules, requires `acceptTerms === true`.
  - `POST /api/checkout` → 200 `{ url }` | 400 `{ error: "INVALID" }` | 409 `{ error: "SOLD_OUT" | "MAX_PER_EMAIL" }`. If SumUp fails → `markFailed(id, "failed")`, 502 `{ error: "PAYMENT_UNAVAILABLE" }`. `redirectUrl = ${siteUrl}/merci?ref=${id}` ; `returnUrl = ${siteUrl}/api/webhook/sumup`.
  - `src/lib/api.ts` : `type ReservationStatus = "held" | "paid" | "failed" | "expired" | "cancelled"` ; `getReservation(ref: string): Promise<{ status: ReservationStatus; ticketNo: number | null; fullName: string; covers: number; vg: number; needsRefund: boolean }>`.
  - `GET /api/reservation?ref=` → `{ status, ticketNo, fullName, covers, vg, needsRefund }` (never the email). If `held` and has checkout id → `getCheckout` : `PAID` → `confirmPayment` (+ email, Task 8) ; `FAILED`/`EXPIRED` → `markFailed`.
  - `POST /api/webhook/sumup` → always 200 immediately for valid JSON ; ignore `event_type !== "CHECKOUT_STATUS_CHANGED"` ; look up by checkout id, re-read status via `getCheckout`, same transitions as above. Shared helper `syncReservation(deps, reservation)` used by both routes.
  - Front errors: `SOLD_OUT` → refresh counter + `"C'est complet, désolé."` (Claude's copy) ; `MAX_PER_EMAIL` → `"2 couverts max. par personne."` ; `PAYMENT_UNAVAILABLE` → `"Le paiement ne répond pas. Réessaie dans une minute."` (Claude's copy).

- [ ] **Step 1: Failing tests** with fake `db`/`sumup` : valid body → 200 `{url}` and `createCheckout` called with `amountCents 9000` for 2 covers ; `acceptTerms:false` → 400 ; `SeatError("SOLD_OUT")` → 409 ; SumUp throws → `markFailed` called, 502 ; `reservation marks failed when SumUp says FAILED` ; reservation `PAID` → `confirmPayment` called, response `status: "paid"` with `ticketNo` ; response never contains `email` ; webhook with other `event_type` → 200, no `getCheckout` ; webhook `PAID` → `confirmPayment` once ; `PRICE_CENTS_OVERRIDE=100` → `amountCents 200` for 2 covers.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Sandbox check (needs Hugo's SumUp sandbox key in `.env`)** : real checkout from `/`, pay with SumUp test card, land on `/merci?ref=…`, `curl /api/reservation?ref=…` → `paid`, `ticketNo: 1`. If no sandbox exists: stop and ask Hugo before any live 1 € test.
- [ ] **Step 6: Commit** `feat: add sumup checkout, status sync and webhook` (after task review passes).

### Task 7: `/merci`, ticket, PNG export, `/billet`

**Files:**
- Create: `src/components/Ticket.tsx`, `src/lib/export-ticket.ts`, `src/pages/merci/*`, `src/pages/billet/BilletPage.tsx`, `tests/lib/reservation-status.test.ts`

**Interfaces:**
- Consumes: `getReservation(ref)`.
- Produces: `Ticket` props `{ ticketNo: number; fullName: string; covers: number; vg: number }` ; `exportTicketPng(node: HTMLElement, fileName: string): Promise<void>` (1080×1920, `html-to-image`, wait for `document.fonts.ready`) ; `nextPollState(state: { attempts: number }, status: ReservationStatus): "show" | "poll" | "timeout" | "failed"` (pure : `paid` → show ; `held` and attempts < 30 → poll ; `held` and ≥ 30 → timeout ; `failed`/`expired`/`cancelled` → failed).

Layout and copy: `merci.reference.html`, `billet.reference.html`, HANDOFF §6. Ticket: `SNACK SNACK / ÉDITION #1`, `Nº07`, grid `TABLE: 1` · `COVERS: 2 (1 VG)` · `DATE: 22.11 · 12H` · `SERVER: SILK`, name in Nohemi caps, header `DIMANCHE 22 NOVEMBRE - 12H00`, footer logo + `SILK - MARSEILLE`, paper `-2deg`, blue tape, sauce stain. `COVERS: 2` without parenthesis when vg = 0. Polling every 2 s.
- `/merci` : `held` → `ON VÉRIFIE LE PAIEMENT…` ; timeout → `Le paiement met du temps à arriver. Tu recevras l'email dès qu'il est confirmé.` ; failed → `LE PAIEMENT N'EST PAS PASSÉ.` + link to `/` ; paid → kicker `C'EST RÉSERVÉ - ON SE VOIT À TABLE`, `MERCI {PRÉNOM}.` / `TON COUVERT EST POSÉ.` (first word of fullName), Ticket, button `ENREGISTRER MON BILLET` (file `snack-snack-billet-07.png`), line `Un email arrive avec ton billet. L'after commence à 15h30.`, logo. `needs_refund` reservations: status `paid` but no ticketNo → show `ON A UN SOUCI DE PLACE. ON TE RECONTACTE TRÈS VITE.` (Claude's copy).
- `/billet?ref=` : same Ticket + download button, no polling (if not paid → failed message).

- [ ] **Step 1: Failing test** for `nextPollState` (the 4 branches + boundary 29/30).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** pure function, then components. **Step 4: Run** → PASS.
- [ ] **Step 5: Visual verification** at 390 and desktop for each `/merci` state (mock `getReservation` via `?mock=held|paid|failed`, dev only) and the downloaded PNG (open it: 1080×1920, fonts are Nohemi/Satoshi, nothing cut off).
- [ ] **Step 6: Commit** `feat: add merci page and downloadable ticket` (after task review passes).

### Task 8: Confirmation email

**Files:**
- Create: `server/email-template.ts`, `server/mailer.ts`, `tests/server/email.test.ts`
- Modify: `server/app.ts` (`syncReservation` sends after `newly_paid`)

**Interfaces:**
- Produces: `renderConfirmationEmail({ firstName, ticketNo, covers, vg, amountCents, ticketUrl, siteUrl }): { subject: string; html: string; text: string }` ; `createMailer({ user, appPassword, from }): Mailer` with `send({ to, subject, html, text, replyTo }): Promise<void>` (nodemailer, `service: "gmail"`). Alert: `sendRefundAlert(reservation)` to `EVENT.contactEmail`.

Template: `email.reference.html` + HANDOFF §6 email. Subject `Ton couvert est posé. Nº07`. Tables + inline styles, font stacks with `Arial Black` / `Arial` fallback, images absolute `${siteUrl}/img/plat-os.jpg` and logo, address `54 Rue Vacon, 13001 Marseille`, recap (Nº, covers, payé), sentence **replaced**: `Ton billet t'attend en un clic, garde-le sur ton téléphone.`, `Une allergie, une remarque ? Réponds simplement à ce mail.`, after reminder 15h30, button `VOIR MON BILLET` → `${siteUrl}/billet?ref=…`, signature `BISOU BISOU`. `replyTo = EVENT.contactEmail`.

- [ ] **Step 1: Failing tests:** subject `"Ton couvert est posé. Nº07"` for ticketNo 7 ; html contains `MERCI CAMILLE.`, `/billet?ref=abc`, `BISOU BISOU`, not `pièce jointe` ; `sends email once` — `syncReservation` called twice on a paid reservation → `mailer.send` called once (relies on `newly_paid` + `email_sent_at`) ; mailer failure doesn't fail the request and leaves `email_sent_at` null ; `needs_refund` → `sendRefundAlert` called, no confirmation email.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Real send** (needs Hugo's Gmail app password in `.env`) : complete a sandbox payment, email arrives in Hugo's inbox (not spam), renders in Gmail web + iOS Mail. Screenshot for Hugo.
- [ ] **Step 6: Commit** `feat: send confirmation email via gmail` (after task review passes).

### Task 9: Admin

**Files:**
- Create: `server/admin-auth.ts`, `src/lib/csv.ts`, `src/pages/admin/*`, `tests/server/admin.test.ts`, `tests/lib/csv.test.ts`
- Modify: `server/app.ts`, `admin.html` (`<meta name="robots" content="noindex">`)

**Interfaces:**
- Produces:
  - `createVerifyAdmin({ supabaseUrl, anonKey, adminEmails: string[] })` → `verifyAdmin(authHeader)` using `supabase.auth.getUser(token)` ; email must be in `ADMIN_EMAILS` (comma-separated, lowercased).
  - Routes (all 401 without valid admin) : `GET /api/admin/reservations` → `{ totals: { coversPaid, capacity, vgCovers, amountCents, reservations }, rows: AdminRow[] }` ; `POST /api/admin/capacity { capacity }` → 200 | 409 `CAPACITY_BELOW_TAKEN` ; `POST /api/admin/reservations { fullName, email?, covers, vg, paymentMethod, sendEmail }` → 200 `{ id, ticketNo }` | 409 `SOLD_OUT` ; `POST /api/admin/reservations/:id/cancel` → 200.
  - `AdminRow = { id, ticketNo, fullName, email, covers, vg, status, source, paymentMethod, needsRefund, paidAt, createdAt }`.
  - `toCsv(rows: AdminRow[]): string` : BOM `﻿`, separator `;`, header `Nº;Nom;Email;Couverts;Dont VG;Statut;Source;Paiement;À rembourser;Payé le`, values quoted when they contain `;`, `"` or newline.
- UI : `Login` (magic link via `@supabase/supabase-js` `signInWithOtp`, `emailRedirectTo = ${origin}/admin`) ; `Totals` ; `ReservationsTable` (default filter `paid`, toggle « Tout afficher », `needs_refund` rows highlighted with `text-alert` label `À REMBOURSER`) ; `CapacityForm` ; `AddReservationForm` (send-email checkbox only when email filled, unchecked by default) ; cancel button with `confirm()` and, for `source = 'online'` paid rows, the reminder `Pense à rembourser dans SumUp.` ; `Exporter en CSV` button. Styled with tokens, sober.

- [ ] **Step 1: Failing tests:** each admin route → 401 without header and with a non-whitelisted email ; totals exclude `cancelled` and `needs_refund` ; capacity below taken → 409 ; add when full → 409 ; `toCsv` : BOM first char, header line exact, `Durand; Camille` quoted, `À rembourser` = `oui`/`non`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Manual check** against local Supabase (Auth emails land in the local Inbucket at `http://localhost:54324`) : log in, see rows, export CSV and open it in Numbers/Excel (accents OK), change capacity → `/` counter follows, add a manual reservation, cancel one.
- [ ] **Step 6: Commit** `feat: add admin dashboard with csv export` (after task review passes).

### Task 10: Launch readiness (no deploy)

**Files:**
- Create: `docs/launch.md`
- Modify: `README.md`

- [ ] **Step 1: Write `docs/launch.md`** : env vars per environment ; Supabase remote steps for Hugo (create project on the right account, `supabase link`, `supabase db push`, Auth → SMTP settings with Gmail app password, Auth redirect URL `${SITE_URL}/admin`) ; Netlify steps (create site **with the final name**, env vars, deploy) ; SumUp steps (webhook reachable at `${SITE_URL}/api/webhook/sumup`, switch to live keys only on team validation) ; pre-opening checklist : 1 € live test then refund, `truncate` test rows (`supabase/purge.sql`) and confirm ticket numbers restart at 1, QR code generated from the final URL and scanned on a phone ; post-event : final CSV export then `purge.sql`.
- [ ] **Step 2: Full local run-through** : `npx vitest run` (all green), `npx tsc --noEmit`, `npm run build`, one complete sandbox purchase from a phone-sized viewport.
- [ ] **Step 3: Commit** `docs: add launch checklist`, then stop : Hugo relit `docs/launch.md` et choisit les comptes et le nom Netlify. Le déploiement est une demande séparée.
