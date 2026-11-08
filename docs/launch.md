# Mise en ligne de la billetterie

Pour Hugo. Rien n'est créé ni déployé tant que tu n'as pas choisi les comptes (perso ou asso, **pas** le compte pro) et le nom du site Netlify. Suis les étapes dans l'ordre : le nom du site fixe `SITE_URL`, dont Supabase et SumUp ont besoin, et les variables Netlify ont besoin des valeurs Supabase.

Ne colle jamais une valeur secrète dans le repo, un ticket ou un message : le repo GitHub est **public**. Les secrets vivent dans `.env` (local, ignoré par git) et dans les variables du site Netlify.

## 1. Variables d'environnement

| Variable | Rôle | Local (`.env`) | Netlify prod | Où la trouver |
|---|---|---|---|---|
| `DATABASE_URL` | Postgres, côté serveur | `postgresql://postgres:postgres@127.0.0.1:55422/postgres` | chaîne du **transaction pooler** (port 6543) | Supabase → Connect → Transaction pooler. Remplace `[YOUR-PASSWORD]` par le mot de passe de la base, encodé URL s'il a des caractères spéciaux. Le code est réglé pour ce mode (`prepare: false`). |
| `SUPABASE_URL` | Auth admin, côté serveur | `http://127.0.0.1:55421` | `https://<ref>.supabase.co` | Supabase → Project Settings → API (Project URL) |
| `SUPABASE_ANON_KEY` | clé **publique** du projet, côté serveur | `npx supabase status` | la clé publique (voir sous le tableau) | Supabase → Project Settings → API Keys |
| `VITE_SUPABASE_URL` | même URL, lue par le site au build | comme `SUPABASE_URL` | comme `SUPABASE_URL` | idem |
| `VITE_SUPABASE_ANON_KEY` | même clé publique, lue par le site au build | comme `SUPABASE_ANON_KEY` | comme `SUPABASE_ANON_KEY` | idem |
| `SUMUP_API_KEY` | clé API SumUp | clé **sandbox** | clé sandbox, puis clé live après validation (§5) | SumUp Dashboard → Developer Settings. En local, la paire live est rangée sous `SUMUP_API_KEY_LIVE`. |
| `SUMUP_MERCHANT_CODE` | code marchand SumUp | code sandbox | code sandbox, puis live | idem. Paire live locale : `SUMUP_MERCHANT_CODE_LIVE`. |
| `SITE_URL` | adresse publique, sans `/` final : retours SumUp, webhook, liens des emails | `http://localhost:8888` | `https://<nom>.netlify.app` | le nom choisi au §2 |
| `ADMIN_EMAILS` | liste blanche de l'admin, séparée par des virgules | les adresses organisateurs | idem | chaque adresse doit aussi avoir un compte Supabase (§3) |
| `PRICE_CENTS_OVERRIDE` | prix de test en centimes | absente | **absente**, sauf pendant le test à 1 € (`100`) | Absente = prix de `src/event.ts`. Sinon un nombre entier de centimes, de 1 au prix de `src/event.ts` : au-delà, ou toute autre valeur, l'API refuse de démarrer. |
| `SMTP_USER`, `SMTP_APP_PASSWORD`, `MAIL_FROM` | envoi automatique des emails de confirmation | absentes | **absentes au lancement** | Voir §8 avant de les ajouter. |

**La clé publique Supabase.** Selon l'âge du projet, la page API Keys montre la clé `anon` (longue, commence par `eyJ`) ou une clé `sb_publishable_…`. Prends l'une ou l'autre, la même pour `SUPABASE_ANON_KEY` et `VITE_SUPABASE_ANON_KEY`. **Jamais** la clé `service_role` ni une clé `sb_secret_…`, et surtout pas dans une variable `VITE_*` : tout ce qui commence par `VITE_` finit dans le code du site, lisible par n'importe qui.

**Emails : le lancement se fait sans.** Les trois variables SMTP vont ensemble : toutes absentes = aucun email automatique, les organisateurs envoient les billets à la main (§7). Une ou deux seulement = l'API refuse de démarrer. Pour retirer une variable, **supprime-la** dans Netlify (ne la laisse pas vide), puis redéploie.

## 2. Code et site Netlify

1. **Mets le code dans `main`** (c'est toi qui le fais, pas nous). Aujourd'hui `main` ne contient que le premier commit ; le site part de `main`. Une fois le travail relu, en un seul commit (squash) via une pull request :
   ```
   git fetch origin
   git switch -c release/billetterie origin/main
   git merge --squash feature/billetterie
   git commit -m "feat: add the Snack Snack ticketing site"
   git diff feature/billetterie   # contrôle : ne doit rien afficher
   git push -u origin release/billetterie
   ```
   Puis sur GitHub : ouvre la pull request `release/billetterie` → `main`, fusionne-la en **« Squash and merge »**, supprime la branche.
   - **Ne pousse jamais `feature/billetterie`** : son historique contient un identifiant qui doit rester privé (le repo est public). Seule `release/billetterie` part sur GitHub, en un seul commit sans cet historique.
2. Sur le bon compte Netlify : Add new site → Import an existing project → GitHub → `HugoWith/Snack.Snack`, branche de production `main`. Le build vient de `netlify.toml` (`npm run build`, publication `dist`, fonctions `netlify/functions`). Tant que les variables manquent, le site déployé ne marche pas : normal, on les ajoute au §4.
3. **Choisis le nom final tout de suite** (Site configuration → Change site name). L'adresse `https://<nom>.netlify.app` part dans le QR code imprimé et ne doit plus jamais changer. Si un domaine arrive plus tard, cette adresse continue de marcher (§9).

## 3. Supabase

1. Crée le projet sur le bon compte et la bonne organisation (asso ou perso, pas le compte pro). Région Europe (Paris, `eu-west-3`). Note le mot de passe de la base dans ton gestionnaire de mots de passe.
2. Depuis le repo :
   ```
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
   `db push` crée les tables et les fonctions de `supabase/migrations/`. Ne lance **pas** `supabase config push` : `supabase/config.toml` contient les réglages locaux (`localhost:8888`).
3. Authentication → Sign In / Providers :
   - décoche **« Allow new users to sign up »** ;
   - garde le fournisseur **Email activé** (sinon les liens de connexion des organisateurs sont bloqués) ;
   - garde **« Confirm email » activé** (sinon un compte existant pourrait prendre l'adresse d'un organisateur).
4. Authentication → Users → pour **chaque** adresse de `ADMIN_EMAILS` : **« Add user » → « Create new user »**, avec l'adresse, **« Auto Confirm User » coché** (le mot de passe ne sert pas, mets-en un long au hasard). **Pas « Invite user »** : un compte invité reste non confirmé et son lien de connexion est refusé. Même chose pour toute adresse ajoutée plus tard à `ADMIN_EMAILS` (puis mets à jour la variable Netlify et redéploie).
5. Authentication → URL Configuration : `Site URL` = `https://<nom>.netlify.app/admin`, et ajoute `https://<nom>.netlify.app/admin` dans Redirect URLs.
6. **Envoi des liens de connexion admin.** C'est Supabase qui envoie le lien de connexion de `/admin`, avec son propre réglage email, **séparé** de celui du site (§1). Son envoi intégré est fait pour les tests : très peu d'emails par heure, et il peut refuser les adresses qui ne sont pas membres de l'équipe du projet Supabase. Pour être tranquille, configure un SMTP dans Authentication → Emails → SMTP Settings :
   - un compte qui peut envoyer par SMTP : hôte, port, utilisateur, mot de passe. Pour Gmail : `smtp.gmail.com`, port `465`, l'adresse Gmail et un **mot de passe d'application** (Compte Google → Sécurité → Validation en deux étapes → Mots de passe des applications) ;
   - expéditeur et nom affiché (par exemple « Snack Snack »).

   Le compte `snack.snack.kitchen@gmail.com` est bloqué pour ses réglages de sécurité, donc pas de mot de passe d'application pour l'instant : utilise un autre compte, ou reste sur l'envoi intégré si les organisateurs se connectent rarement (et vérifie au §4.4 que ça passe).
7. Récupère `DATABASE_URL` (transaction pooler), `SUPABASE_URL` et la clé publique pour Netlify (§1).

## 4. Variables et déploiement Netlify

1. Site configuration → Environment variables : ajoute les variables du §1, valeurs prod. **Pas** de variables SMTP, **pas** de `PRICE_CENTS_OVERRIDE` pour l'instant. Portée par défaut « All scopes » : ça va (les `VITE_*` servent au build, les autres aux fonctions).
2. Déploie (Deploys → Trigger deploy). **Après chaque changement de variable, redéploie** : une fonction déjà déployée garde les anciennes valeurs.
3. Contrôle : `https://<nom>.netlify.app/api/seats-left` répond `{"left":20,"capacity":20}`.
4. Contrôle admin : sur `/admin`, demande un lien pour une adresse organisateur. Il arrive (regarde aussi les spams) et ouvre le tableau de bord. Une adresse hors liste ne reçoit rien.

Note : les fonctions Netlify tournent aux États-Unis par défaut. Si ton plan le permet, mets-les en Europe (Site configuration → Functions → Region), près de la base. Sinon ça marche quand même, un peu plus lentement.

## 5. SumUp

- Rien à configurer dans SumUp pour le webhook : chaque paiement envoie à SumUp `return_url = ${SITE_URL}/api/webhook/sumup`. Il faut seulement que `SITE_URL` soit l'adresse publique, sans `/` final.
- Si le webhook n'arrive pas, ouvrir `/admin` sert de filet : la page revérifie chez SumUp les paiements en cours des dernières 48 h.
- Commence en prod avec les clés **sandbox** : parcours complet avec la carte de test VISA `4200 0000 0000 0091` (date future, CVV quelconque).
- **Passe aux clés live seulement quand l'équipe a validé** : dans Netlify, `SUMUP_API_KEY` et `SUMUP_MERCHANT_CODE` prennent les valeurs rangées en local sous `SUMUP_API_KEY_LIVE` et `SUMUP_MERCHANT_CODE_LIVE`. Redéploie.

## 6. Avant d'ouvrir la vente

Toutes les vérifications se font **pendant** le test à 1 €, parce qu'elles ont besoin d'une vraie réservation. La purge vient en dernier.

- [ ] **Test réel à 1 €** (clés live) : ajoute `PRICE_CENTS_OVERRIDE=100` sur Netlify, redéploie, réserve **1 couvert** depuis un iPhone avec ta vraie carte. Le site affiche toujours 45 € (prix de `src/event.ts`), la page SumUp doit demander 1,00 €. Puis, avec cette réservation :
  - [ ] `/merci` montre le billet ;
  - [ ] **Billet PNG** : « Enregistrer mon billet » sur l'iPhone. L'image arrive (Photos ou Fichiers), lisible : nom, Nº, date, bonne police ;
  - [ ] `/admin` montre la ligne en **Payé** ;
  - [ ] **Email à la main** : « Copier le lien du billet » dans l'admin, envoie-le-toi depuis Gmail (§7). Ouvre-le dans Mail sur l'iPhone : le lien ouvre `/billet` ;
  - [ ] **CSV** : « Exporter en CSV », ouvre-le dans Excel ou Numbers, les accents sont corrects ;
  - [ ] **Retour arrière** : lance une réservation d'1 couvert, puis reviens en arrière depuis la page SumUp sans payer. Le bouton redevient « Payer » ;
  - [ ] connexion des deux organisateurs à `/admin`.
- [ ] **Payer puis fermer l'onglet** : refais une réservation d'1 couvert à 1 €, paie, puis ferme l'onglet sur la page SumUp sans revenir au site. Ouvre `/admin` : la ligne passe en **Payé**.
- [ ] **Rembourse** les deux paiements dans le tableau de bord SumUp.
- [ ] **Retour au vrai prix** : **supprime** la variable `PRICE_CENTS_OVERRIDE` sur Netlify, redéploie, lance une réservation d'1 couvert **avec une autre adresse email que celle des tests** (elle a déjà atteint la limite de couverts par personne) et vérifie que la page SumUp demande 45,00 €, puis abandonne.
- [ ] **QR code** généré depuis l'adresse finale `https://<nom>.netlify.app/` (pas une adresse d'aperçu de déploiement), puis scanné avec l'appareil photo d'un téléphone : il ouvre la page de réservation.
- [ ] **Purge des données de test**, en dernier : Supabase → SQL Editor, colle `supabase/purge.sql`, exécute. La table vide, le prochain billet repart à Nº01. Contrôle : `/admin` à 0 réservation et 0/20 ; si la capacité a été changée pendant les tests, remets 20 dans l'admin.

## 7. Chaque jour pendant la vente : les emails à la main

Sans SMTP, le site n'envoie aucun email. `/merci` dit à la personne qu'un email arrive : c'est à toi de l'envoyer.

1. Ouvre `/admin` (ça confirme au passage les paiements dont le webhook n'est pas arrivé).
2. Pour chaque nouvelle ligne **Payé** : « Copier le lien du billet », puis envoie un email depuis `snack.snack.kitchen@gmail.com` à l'adresse de la ligne, avec ce lien.
3. **Rien ne note qui a déjà reçu son email** : tiens ta propre liste (par exemple le Nº de billet du dernier envoi).
4. Regarde la colonne **« À rembourser »** : un paiement arrivé sans place disponible y apparaît. Aucun email d'alerte ne part tant que le SMTP est coupé. Rembourse à la main dans SumUp et préviens la personne.

## 8. Rallumer les emails automatiques plus tard

Ce n'est **pas** juste ajouter les trois variables SMTP. Les réservations déjà payées (et envoyées à la main) sont notées « email pas envoyé » en base. Dès qu'une personne ouvre son lien `/billet`, le site lui enverrait un deuxième email. Et l'ouverture de `/admin` ne fait que confirmer les paiements : elle n'envoie aucun email.

Il faut donc décider avant quoi faire de ces réservations. Décide avant de brancher le SMTP.

## 9. Nom de domaine (plus tard)

Si un domaine est ajouté au site Netlify :
- `SITE_URL` = la nouvelle adresse (sans `/` final), puis redéploie ;
- Supabase → Authentication → URL Configuration : `Site URL` = `https://<domaine>/admin`, et ajoute `https://<domaine>/admin` dans Redirect URLs (garde aussi l'adresse `netlify.app`) ;
- le QR code imprimé garde l'adresse `netlify.app` : elle continue de marcher.

## 10. Après l'événement

1. `/admin` → **Exporter en CSV** (export final, à garder hors du repo).
2. Supabase → SQL Editor → `supabase/purge.sql`. Ça supprime toutes les réservations (noms, emails, billets), sans retour possible. Les comptes organisateurs restent ; supprime-les dans Authentication → Users si tu veux tout effacer.

## 11. En local

- `npm run dev` lance le site et l'API sans aucune variable SMTP : aucun email ne part.
- `npx vitest run` **remet à zéro la base locale** (projet de tests `db` : `truncate reservations`). Ces tests refusent de tourner si `DATABASE_URL` ne pointe pas sur `127.0.0.1:55422`, pour ne jamais vider la base hébergée.
- `npx supabase db reset` vide aussi `auth.users` : recrée les comptes organisateurs locaux (Mailpit sur `http://127.0.0.1:55424` reçoit les liens) :
  ```
  eval "$(npx supabase status -o env | grep -E '^SERVICE_ROLE_KEY=')"
  curl -X POST http://127.0.0.1:55421/auth/v1/admin/users \
    -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H 'Content-Type: application/json' \
    -d '{"email":"<adresse organisateur>","email_confirm":true}'
  ```
  Une fois par adresse de `ADMIN_EMAILS`.
