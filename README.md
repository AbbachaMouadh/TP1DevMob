# TP 1 – Ma première API REST avec Node.js, Express et MongoDB

API d'un cabinet médical : **patients**, **consultations** (exercice) et **mesures** (bonus IoT).

## Démarrage

```bash
npm install
cp .env.example .env      # puis adapter MONGO_URI si besoin (local ou Atlas)
npm run dev               # redémarre automatiquement à chaque sauvegarde
```

Test rapide : <http://localhost:5000/api/health> → `{"status":"ok"}`

Tests automatiques (le serveur doit tourner) : `node tests/run-tests.js`
Collection Postman : `postman/TP1_API_Cabinet.postman_collection.json` (variable `baseUrl`).

## Structure

```
tp-node-mongo/
├── server.js                    point d'entrée
├── .env / .env.example          configuration (.env n'est pas versionné)
├── models/   patient.js  consultation.js  mesure.js
├── routes/   patientRoutes.js  consultationRoutes.js  mesureRoutes.js
├── postman/  collection exportée
└── tests/    run-tests.js
```

## Routes

| Méthode | URL | Succès | Erreurs |
|---|---|---|---|
| POST | /api/patients | 201 | 400 |
| GET | /api/patients[?statut=Actif] | 200 | – |
| GET | /api/patients/:id | 200 | 400, 404 |
| PUT | /api/patients/:id | 200 | 400, 404 |
| DELETE | /api/patients/:id | 204 | 400, 404, **409** (a des consultations) |
| POST | /api/consultations | 201 | 400, 404 (patient inexistant) |
| GET | /api/consultations[?patient=<id>&statut=Terminée] | 200 | 400 |
| GET / PUT / DELETE | /api/consultations/:id | 200 / 200 / 204 | 400, 404 |
| POST | /api/mesures | 201 | 400 |
| GET | /api/mesures?capteur=&type=&limit= | 200 | – |

URL de base : PC `http://localhost:5000/api/` · émulateur Android `http://10.0.2.2:5000/api/` · téléphone `http://<IP du PC>:5000/api/`.

---

# Réponses aux questions de compréhension

**1. Pourquoi l'application Android ne se connecte-t-elle pas directement à MongoDB ?**

- **Sécurité** : se connecter à MongoDB exige une adresse et des identifiants. Les mettre dans l'application les rend récupérables par n'importe qui (une APK se décompile) et exposerait toute la base.
- **Règles centralisées** : la validation (nom obligatoire, âge ≥ 0, statut autorisé) et les codes d'erreur sont écrits une seule fois, dans l'API, au lieu d'être recopiés dans chaque application.
- **Plusieurs clients** : Android, Flutter ou un site web partagent la même API et les mêmes données.
- **Indépendance** : on peut changer de base de données ou modifier le schéma sans republier l'application.
- **Réseau** : une base de données n'est pas faite pour être ouverte sur Internet ; HTTP/JSON est le langage standard des applications mobiles.

**2. Différence entre `req.body`, `req.params` et `req.query`**

| Propriété | Contient | Exemple |
|---|---|---|
| `req.body` | le corps JSON envoyé (POST, PUT) | `{ "nom": "Ben Salah" }` → `req.body.nom` |
| `req.params` | les parties variables du chemin (`:id`) | `/api/patients/6ab5…` → `req.params.id` |
| `req.query` | les filtres après le `?` | `/api/patients?statut=Actif` → `req.query.statut` |

**3. Pourquoi 404 et non 400 quand un identifiant valide ne correspond à aucun patient ?**

Un **400** signale une requête **mal formée** : le client a fait une erreur dans ce qu'il envoie (par exemple `abc`, qui n'est pas un identifiant possible). Un identifiant au bon format mais inexistant est une requête **correcte** : c'est la **ressource** qui n'existe pas (ou plus). Le bon code est donc **404 Not Found**. Côté Android, cela permet de distinguer « corrige ta saisie » (400) de « cet élément n'existe plus » (404).

**4. Que se passerait-il si l'on oubliait `app.use(express.json())` ?**

Le serveur ne lirait pas le corps JSON : `req.body` resterait `undefined` (avec Express 5), même si Postman envoie bien les données. Un `POST /api/patients` créerait un patient vide, rejeté en **400** (« Le nom est obligatoire », « Le prénom est obligatoire ») alors que le JSON est correct. Un `PUT` ne modifierait rien. Dans mon code, les routes consultations utilisent `req.body || {}` pour éviter un plantage dans ce cas.

**5. Pourquoi l'émulateur doit-il utiliser `10.0.2.2` au lieu de `localhost` ?**

Sur l'émulateur (comme sur un vrai téléphone), `localhost` désigne **l'appareil lui-même** : l'émulateur chercherait un serveur sur son propre système Android, où il n'y en a pas. L'émulateur tourne dans un réseau virtuel ; l'adresse spéciale `10.0.2.2` est l'alias qui pointe vers le **PC hôte**, où tourne l'API. Pour un téléphone réel, on utilise l'IP du PC sur le Wi-Fi (ex. `192.168.1.20`).

**6. À quoi sert `await` ? Quelle notion de Kotlin lui correspond ?**

Une opération sur la base de données prend du temps. `await` **attend le résultat de la promesse sans bloquer le serveur**, qui continue de traiter les autres requêtes pendant ce temps. La fonction qui l'utilise doit être déclarée `async`. En Kotlin, cela correspond aux **coroutines** et aux fonctions **`suspend`**.

---

# Pour aller plus loin – code HTTP du refus de suppression

Le code le plus juste est **409 Conflict**. La requête est bien formée (donc pas 400), le patient existe (donc pas 404), et le client y est autorisé (donc pas 403). Le problème est que la suppression **entre en conflit avec l'état actuel** des données : le patient est encore référencé par des consultations. Le 409 dit au client « la requête est valide mais impossible dans l'état actuel » ; il suffit de supprimer d'abord les consultations pour la rejouer. Le corps de la réponse indique le nombre de consultations bloquantes.
(Un **422 Unprocessable Entity** serait défendable, mais 409 exprime mieux un conflit avec l'état de la ressource.)

---

# Livrables

- [x] Dépôt Git du projet, sans `node_modules` ni `.env` (voir `.gitignore`)
- [x] Collection Postman exportée : `postman/TP1_API_Cabinet.postman_collection.json` (cas nominaux et cas d'erreur)
- [ ] Capture du navigateur du téléphone ou de l'émulateur affichant `/api/health` (à faire sur ta machine)
- [x] Réponses aux questions de compréhension (ce fichier)
