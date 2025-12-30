# ✅ Commandes Exactes pour DigitalOcean

## 🔧 Configuration Backend

### Si Source Directory = `backend` :

```
Build Command:
npm install && npm run build

Run Command:
node dist/server.js

HTTP Port:
3000
```

### Si Source Directory = `.` (racine) :

```
Build Command:
cd backend && npm install && npm run build

Run Command:
cd backend && node dist/server.js

HTTP Port:
3000
```

---

## 🔧 Configuration Frontend Conciergerie

```
Source Directory:
frontend

Build Command:
npm install && npm run build

Output Directory:
dist
```

---

## 🔧 Configuration Frontend Admin

```
Source Directory:
frontend-admin

Build Command:
npm install && npm run build

Output Directory:
dist
```

---

## ⚠️ Erreurs Communes et Solutions

### Erreur : "Cannot find module 'typescript'"

**Solution :** Utilisez `npm ci` au lieu de `npm install` :

```
Build Command:
npm ci && npm run build
```

### Erreur : "TypeScript compilation failed"

**Solution :** Vérifiez que les corrections TypeScript sont poussées sur GitHub :

```bash
git pull
cd backend && npm run build
```

Si ça échoue localement, il faut corriger les erreurs TypeScript d'abord.

### Erreur : "ENOENT: no such file or directory"

**Solution :** Vérifiez que le Source Directory est correct :
- Backend : `backend` (pas `.` ou `./backend`)
- Frontend : `frontend`
- Admin : `frontend-admin`

---

## 📋 Checklist Avant de Déployer

1. ✅ Le build fonctionne localement :
   ```bash
   cd backend && npm run build
   ```

2. ✅ Tous les fichiers sont poussés sur GitHub :
   ```bash
   git status
   git push
   ```

3. ✅ Les commandes dans DigitalOcean sont exactement :
   - Build : `npm install && npm run build` (si Source Directory = `backend`)
   - Run : `node dist/server.js`

4. ✅ Le Source Directory est `backend` (pas `.`)

---

## 🔍 Comment Voir l'Erreur Exacte

Dans DigitalOcean :

1. Allez dans votre App
2. Cliquez sur **"Deployments"**
3. Cliquez sur le dernier déploiement (celui qui a échoué)
4. Cliquez sur **"View Logs"**
5. Regardez les dernières lignes pour voir l'erreur exacte

---

## 💡 Solution Rapide

Si vous ne savez pas quelle erreur vous avez, essayez cette configuration :

### Backend :
- **Source Directory** : `backend`
- **Build Command** : `npm ci && npm run build`
- **Run Command** : `node dist/server.js`
- **HTTP Port** : `3000`

### Frontends :
- **Source Directory** : `frontend` (ou `frontend-admin`)
- **Build Command** : `npm ci && npm run build`
- **Output Directory** : `dist`

(`npm ci` installe exactement les versions du package-lock.json, plus fiable)

