# 🔧 Configuration Manuelle sur DigitalOcean App Platform

Si DigitalOcean ne détecte pas automatiquement les composants, configurez-les manuellement.

## 📋 Étapes Détaillées

### Étape 1 : Créer une Nouvelle App

1. Allez sur https://cloud.digitalocean.com
2. Cliquez sur **"Create"** > **"Apps"**
3. Cliquez sur **"GitHub"**
4. **Autorisez DigitalOcean** si demandé
5. **Sélectionnez** : `Anthopululu/conciergerie-whatsapp-ai`
6. **Sélectionnez la branche** : `main`
7. Cliquez sur **"Next"**

### Étape 2 : Ignorer le Message d'Erreur

Si vous voyez "No components detected", **c'est normal**. Cliquez sur **"Edit"** ou **"Skip"** pour continuer.

### Étape 3 : Ajouter le Backend Manuellement

1. Cliquez sur **"Edit Components"** ou **"Add Component"**
2. Sélectionnez **"Web Service"**
3. Configurez :

   **Source :**
   - **Source Directory** : `backend`
   - **GitHub Branch** : `main`

   **Build Settings :**
   - **Build Command** : `npm install && npm run build`
   - **Run Command** : `node dist/server.js`
   - **Environment** : `Node.js`

   **Resources :**
   - **Instance Size** : Basic - Regular - $5/mois (ou plus si besoin)
   - **Instance Count** : 1

   **HTTP Port :**
   - **HTTP Port** : `3000`

   **Routes :**
   - **Route** : `/` (ou `/api` si vous préférez)

4. Cliquez sur **"Save"**

### Étape 4 : Ajouter les Variables d'Environnement pour le Backend

1. Cliquez sur le composant **"backend"**
2. Allez dans l'onglet **"Environment Variables"**
3. Cliquez sur **"Add Variable"** et ajoutez :

   ```
   NODE_ENV = production
   PORT = 3000
   ```

4. Cliquez sur **"Add Variable"** > **"Secret"** et ajoutez :

   ```
   TWILIO_ACCOUNT_SID = [votre valeur]
   TWILIO_AUTH_TOKEN = [votre valeur]
   ANTHROPIC_API_KEY = [votre valeur]
   ADMIN_PASSWORD = [votre valeur]
   ```

### Étape 5 : Ajouter le Frontend Conciergerie

1. Cliquez sur **"Add Component"**
2. Sélectionnez **"Static Site"**
3. Configurez :

   **Source :**
   - **Source Directory** : `frontend`
   - **GitHub Branch** : `main`

   **Build Settings :**
   - **Build Command** : `npm install && npm run build`
   - **Output Directory** : `dist`

   **Routes :**
   - **Route** : `/app` (ou `/` si vous préférez)

4. Cliquez sur **"Save"**

### Étape 6 : Ajouter le Frontend Admin

1. Cliquez sur **"Add Component"**
2. Sélectionnez **"Static Site"**
3. Configurez :

   **Source :**
   - **Source Directory** : `frontend-admin`
   - **GitHub Branch** : `main`

   **Build Settings :**
   - **Build Command** : `npm install && npm run build`
   - **Output Directory** : `dist`

   **Routes :**
   - **Route** : `/admin`

4. Cliquez sur **"Save"**

### Étape 7 : Vérifier la Configuration

Vous devriez maintenant voir 3 composants :
- ✅ **backend** (Web Service)
- ✅ **frontend** (Static Site)
- ✅ **frontend-admin** (Static Site)

### Étape 8 : Déployer

1. Cliquez sur **"Next"**
2. **Nom de l'application** : `conciergerie-whatsapp` (ou autre)
3. **Région** : Choisissez la plus proche (ex: `Frankfurt`)
4. Cliquez sur **"Create Resources"**
5. Attendez 5-10 minutes que le déploiement se termine

### Étape 9 : Accéder à l'Application

Une fois déployé, vous obtiendrez :
- **Backend** : `https://votre-app.ondigitalocean.app`
- **Frontend** : `https://votre-app.ondigitalocean.app/app`
- **Admin** : `https://votre-app.ondigitalocean.app/admin`

---

## 📸 Résumé des Configurations

### Backend (Web Service)
```
Source Directory: backend
Build Command: npm install && npm run build
Run Command: node dist/server.js
HTTP Port: 3000
Route: /
```

### Frontend (Static Site)
```
Source Directory: frontend
Build Command: npm install && npm run build
Output Directory: dist
Route: /app
```

### Frontend Admin (Static Site)
```
Source Directory: frontend-admin
Build Command: npm install && npm run build
Output Directory: dist
Route: /admin
```

---

## 🔍 Vérifications

### Si le build échoue :

1. **Vérifiez les logs** dans DigitalOcean Dashboard
2. **Vérifiez que les commandes sont correctes** :
   - Build : `npm install && npm run build`
   - Run : `node dist/server.js`
3. **Vérifiez les variables d'environnement** sont bien définies

### Si le backend ne démarre pas :

1. **Vérifiez les logs** dans DigitalOcean
2. **Vérifiez que le port est 3000**
3. **Vérifiez que toutes les variables d'environnement sont définies**

### Si les frontends ne se chargent pas :

1. **Vérifiez que l'Output Directory est `dist`**
2. **Vérifiez que le build a réussi** (regardez les logs)
3. **Vérifiez les routes** dans la configuration

---

## 💡 Astuce

Si vous avez des problèmes, vous pouvez aussi :
1. **Déployer seulement le backend** d'abord
2. **Tester que le backend fonctionne**
3. **Ajouter les frontends ensuite**

---

## 📚 Alternative : Utiliser un Droplet VPS

Si App Platform continue à poser problème, vous pouvez utiliser un **Droplet VPS** qui est plus simple à configurer :

Voir le guide : `INSTALL_DROPLET.md`

