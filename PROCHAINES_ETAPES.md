# 🚀 Prochaines Étapes - Migration PostgreSQL

## 📋 Vue d'ensemble

Pour finaliser la migration vers PostgreSQL et résoudre les problèmes de persistance sur Render, voici les étapes à suivre :

---

## Étape 1 : Créer la base PostgreSQL sur Render ⏱️ 5 minutes

### 1.1 Accéder à Render Dashboard
1. Connectez-vous à [https://dashboard.render.com](https://dashboard.render.com)
2. Cliquez sur **"New +"** en haut à droite
3. Sélectionnez **"PostgreSQL"**

### 1.2 Configurer la base de données
- **Name** : `conciergerie-db` (ou un nom de votre choix)
- **Database** : `conciergerie` (ou laissez par défaut)
- **User** : `conciergerie_user` (ou laissez par défaut)
- **Region** : **Choisissez la même région que votre backend** (important pour les performances)
- **PostgreSQL Version** : `16` (ou la plus récente disponible)
- **Plan** : **Free** (suffisant pour commencer, peut être upgradé plus tard)

### 1.3 Créer la base
- Cliquez sur **"Create Database"**
- Attendez 2-3 minutes que la base soit créée

---

## Étape 2 : Récupérer la connection string ⏱️ 2 minutes

### 2.1 Accéder aux informations de connexion
1. Une fois la base créée, cliquez dessus dans votre dashboard
2. Dans la section **"Connections"**, vous verrez :
   - **Internal Database URL** (à utiliser)
   - **External Database URL** (pour connexions externes)

### 2.2 Copier l'URL
- Copiez l'**Internal Database URL**
- Format : `postgresql://user:password@host:port/database`
- ⚠️ **Ne partagez jamais cette URL publiquement** (elle contient le mot de passe)

---

## Étape 3 : Configurer la variable d'environnement ⏱️ 3 minutes

### 3.1 Accéder au service backend
1. Dans Render Dashboard, allez dans votre service **backend**
2. Cliquez sur **"Environment"** dans le menu de gauche

### 3.2 Ajouter la variable DATABASE_URL
1. Cliquez sur **"Add Environment Variable"**
2. Remplissez :
   - **Key** : `DATABASE_URL`
   - **Value** : Collez l'URL PostgreSQL que vous avez copiée à l'étape 2
3. Cliquez sur **"Save Changes"**

### 3.3 Vérifier
- La variable `DATABASE_URL` doit apparaître dans la liste
- Render va automatiquement redéployer votre backend

---

## Étape 4 : Corriger les erreurs TypeScript ⏱️ 15-20 minutes

### 4.1 Problèmes à corriger
Les erreurs TypeScript dans `database-wrapper.ts` sont dues à :
- Des signatures de fonctions qui ne correspondent pas entre SQLite et PostgreSQL
- Des types manquants (Template, Tag, ConversationNote)
- Des fonctions qui n'existent pas dans la version SQLite

### 4.2 Corrections nécessaires
1. **Aligner les signatures** dans `database-wrapper.ts` avec celles de `database.ts`
2. **Ajouter les types manquants** dans `database.ts` :
   ```typescript
   export interface Template { ... }
   export interface Tag { ... }
   export interface ConversationNote { ... }
   ```
3. **Adapter les fonctions** pour qu'elles fonctionnent avec les deux bases

### 4.3 Tester localement
```bash
cd backend
npm run build
```
- Vérifier qu'il n'y a plus d'erreurs TypeScript
- Si des erreurs persistent, les corriger une par une

---

## Étape 5 : Adapter server.ts pour async ⏱️ 30-45 minutes

### 5.1 Problème
`server.ts` utilise actuellement des fonctions synchrones de SQLite. Avec PostgreSQL, tout doit être async.

### 5.2 Solution
Utiliser les helpers de `db-helper.ts` qui gèrent automatiquement async/sync :

**Avant (SQLite) :**
```typescript
const conciergerie = dbQueries.getConciergerieByEmail(email);
```

**Après (PostgreSQL compatible) :**
```typescript
import * as dbHelper from './db-helper';
const conciergerie = await dbHelper.getConciergerieByEmail(email);
```

### 5.3 Endpoints à modifier
Tous les endpoints qui utilisent `dbQueries` doivent être rendus `async` :
- `/api/auth/login` → `async (req, res) => { ... }`
- `/api/conversations` → `async (req, res) => { ... }`
- `/webhook/whatsapp` → Déjà async, mais adapter les appels
- Et tous les autres endpoints...

### 5.4 Exemple de modification
```typescript
// Avant
app.post('/api/auth/login', (req: Request, res: Response) => {
  const conciergerie = dbQueries.loginConciergerie(email, password);
  // ...
});

// Après
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const conciergerie = await dbHelper.loginConciergerie(email, password);
    // ...
  } catch (error) {
    // ...
  }
});
```

---

## Étape 6 : Tester la migration ⏱️ 10 minutes

### 6.1 Vérifier les logs Render
1. Allez dans les logs de votre backend sur Render
2. Vérifiez que vous voyez :
   ```
   📊 Using PostgreSQL database
   ✅ Connected to PostgreSQL database
   ✅ PostgreSQL schema initialized
   ```

### 6.2 Tester les endpoints
1. **Health check** : `GET https://votre-backend.onrender.com/health`
2. **Login** : `POST https://votre-backend.onrender.com/api/auth/login`
3. **Seed data** : `POST https://votre-backend.onrender.com/api/setup/seed`

### 6.3 Vérifier la persistance
1. Créer des données (conciergeries, FAQs)
2. Redémarrer le service backend sur Render
3. Vérifier que les données sont toujours là ✅

---

## Étape 7 : Réinitialiser les données ⏱️ 2 minutes

### 7.1 Initialiser les données de test
```bash
curl -X POST https://votre-backend.onrender.com/api/setup/seed
```

### 7.2 Vérifier
- Les conciergeries sont créées
- Les FAQs sont créées
- Vous pouvez vous connecter avec les identifiants par défaut

---

## 📊 Résumé des étapes

| Étape | Description | Temps | Priorité |
|-------|-------------|-------|----------|
| 1 | Créer PostgreSQL sur Render | 5 min | ⭐⭐⭐ |
| 2 | Récupérer connection string | 2 min | ⭐⭐⭐ |
| 3 | Configurer DATABASE_URL | 3 min | ⭐⭐⭐ |
| 4 | Corriger erreurs TypeScript | 15-20 min | ⭐⭐ |
| 5 | Adapter server.ts pour async | 30-45 min | ⭐⭐ |
| 6 | Tester la migration | 10 min | ⭐⭐⭐ |
| 7 | Réinitialiser les données | 2 min | ⭐⭐⭐ |

**Temps total estimé : 1h15 - 1h30**

---

## ⚠️ Notes importantes

1. **Backup** : Avant de migrer, assurez-vous d'avoir un backup de vos données actuelles
2. **Downtime** : Il y aura un court downtime pendant la migration
3. **Tests** : Testez bien tous les endpoints après la migration
4. **Rollback** : Si quelque chose ne va pas, supprimez simplement `DATABASE_URL` pour revenir à SQLite

---

## 🆘 En cas de problème

### Erreur de connexion
- Vérifiez que `DATABASE_URL` est bien configurée
- Vérifiez que la base PostgreSQL est dans la même région
- Vérifiez que la base n'est pas en pause

### Données perdues
- Utilisez `/api/setup/seed` pour réinitialiser
- Les données seront maintenant persistantes après migration

### Erreurs TypeScript
- Vérifiez que toutes les dépendances sont installées : `npm install`
- Vérifiez que le build fonctionne : `npm run build`

---

## ✅ Checklist finale

- [ ] Base PostgreSQL créée sur Render
- [ ] `DATABASE_URL` configurée dans Render
- [ ] Erreurs TypeScript corrigées
- [ ] `server.ts` adapté pour async
- [ ] Tests locaux réussis
- [ ] Déploiement sur Render réussi
- [ ] Logs montrent "Using PostgreSQL database"
- [ ] Données de test initialisées
- [ ] Persistance vérifiée (redémarrage)

---

Une fois toutes ces étapes terminées, vos données seront **persistantes** et ne seront plus perdues à chaque redéploiement ! 🎉

