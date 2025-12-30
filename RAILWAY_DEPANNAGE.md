# 🔧 Dépannage Railway

## Problèmes Courants

### 1. Railway ne détecte pas les services automatiquement

**Solution :** Ajoutez-les manuellement

1. Dans Railway, cliquez sur **"New"** > **"GitHub Repo"**
2. Sélectionnez votre repository
3. Railway va créer un service, mais il faut en ajouter 3 :

**Service 1 - Backend :**
- Cliquez sur **"New"** > **"Empty Service"**
- Cliquez sur le service > **"Settings"**
- **Source** : Connectez GitHub et sélectionnez `backend` comme **Root Directory**
- **Build Command** : `npm install && npm run build`
- **Start Command** : `node dist/server.js`
- **Variables** : Ajoutez vos clés API

**Service 2 - Frontend :**
- Cliquez sur **"New"** > **"Static Site"**
- **Source** : Connectez GitHub et sélectionnez `frontend` comme **Root Directory**
- **Build Command** : `npm install && npm run build`
- **Output Directory** : `dist`

**Service 3 - Frontend Admin :**
- Cliquez sur **"New"** > **"Static Site"**
- **Source** : Connectez GitHub et sélectionnez `frontend-admin` comme **Root Directory**
- **Build Command** : `npm install && npm run build`
- **Output Directory** : `dist`

---

### 2. Erreur de build

**Vérifiez les logs :**
1. Cliquez sur le service qui échoue
2. Allez dans l'onglet **"Deployments"**
3. Cliquez sur le dernier déploiement
4. Regardez les logs pour voir l'erreur

**Erreurs communes :**
- **"Cannot find module"** → Vérifiez que `npm install` est dans la commande de build
- **"TypeScript error"** → Vérifiez que les corrections sont poussées sur GitHub
- **"Command failed"** → Vérifiez les commandes de build

---

### 3. Le backend ne démarre pas

**Vérifiez :**
- Les variables d'environnement sont bien définies
- Le Start Command est : `node dist/server.js`
- Le port est bien configuré (Railway le détecte automatiquement)

---

## 🚀 Alternative : Render (Encore plus simple)

Si Railway pose problème, essayez **Render** :

### Étapes :

1. **Allez sur** https://render.com
2. **Créez un compte** (gratuit)
3. **"New" > "Web Service"**
4. **Connectez GitHub** et sélectionnez votre repo
5. **Configurez :**
   - **Name** : `conciergerie-backend`
   - **Root Directory** : `backend`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `node dist/server.js`
   - **Plan** : Free (ou Starter pour toujours actif)
6. **Ajoutez les variables d'environnement**
7. **"Create Web Service"**

**Pour les frontends :**
- **"New" > "Static Site"**
- **Root Directory** : `frontend` (ou `frontend-admin`)
- **Build Command** : `npm install && npm run build`
- **Publish Directory** : `dist`

**Temps : 10 minutes** ⏱️

---

## 🎯 Solution la plus simple : Votre Droplet DigitalOcean

Si les plateformes cloud posent problème, utilisez votre **Droplet DigitalOcean** que vous avez déjà :

### Étapes :

1. **Connectez-vous** : `ssh root@178.128.205.135`
2. **Mettez à jour le code** :
   ```bash
   cd /root/conciergerie-whatsapp-ai
   git pull
   ```
3. **Rebuild et redémarrez** :
   ```bash
   cd backend && npm install && npm run build
   pm2 restart conciergerie-backend
   ```

**C'est tout !** Votre app est accessible sur `http://178.128.205.135`

---

## 💡 Recommandation

**Si Railway ne fonctionne pas :**
1. ✅ Essayez **Render** (plus simple, moins de problèmes)
2. ✅ Ou utilisez votre **Droplet DigitalOcean** (déjà configuré)

**Render est souvent plus fiable** pour les débuts car :
- Interface plus simple
- Moins de problèmes de détection automatique
- Configuration manuelle claire

