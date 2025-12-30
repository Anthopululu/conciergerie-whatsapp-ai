# 🚀 Déploiement sur Render (Ultra-Simple)

Render est souvent plus simple et fiable que Railway.

## 📋 Étapes (10 minutes)

### 1. Créer un compte

1. Allez sur https://render.com
2. Cliquez sur **"Get Started for Free"**
3. Créez un compte avec GitHub (gratuit)

### 2. Déployer le Backend

1. Cliquez sur **"New"** > **"Web Service"**
2. Cliquez sur **"Connect GitHub"** et autorisez Render
3. Sélectionnez : `Anthopululu/conciergerie-whatsapp-ai`
4. Configurez :

   **Basics :**
   - **Name** : `conciergerie-backend`
   - **Region** : Choisissez la plus proche (ex: Frankfurt)
   - **Branch** : `main`
   - **Root Directory** : `backend`

   **Build & Deploy :**
   - **Runtime** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `node dist/server.js`

   **Plan :**
   - **Free** : Gratuit (se met en veille après 15 min)
   - **Starter** : $7/mois (toujours actif)

5. Cliquez sur **"Advanced"** et ajoutez les **Environment Variables** :
   ```
   NODE_ENV = production
   PORT = 3000
   TWILIO_ACCOUNT_SID = votre_valeur
   TWILIO_AUTH_TOKEN = votre_valeur
   ANTHROPIC_API_KEY = votre_valeur
   ADMIN_PASSWORD = votre_valeur
   ```

6. Cliquez sur **"Create Web Service"**
7. Attendez 5-10 minutes que le déploiement se termine

### 3. Déployer le Frontend Conciergerie

1. Cliquez sur **"New"** > **"Static Site"**
2. Sélectionnez : `Anthopululu/conciergerie-whatsapp-ai`
3. Configurez :

   **Basics :**
   - **Name** : `conciergerie-frontend`
   - **Branch** : `main`
   - **Root Directory** : `frontend`

   **Build Settings :**
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`

4. Cliquez sur **"Create Static Site"**

### 4. Déployer le Frontend Admin

1. Cliquez sur **"New"** > **"Static Site"**
2. Sélectionnez : `Anthopululu/conciergerie-whatsapp-ai`
3. Configurez :

   **Basics :**
   - **Name** : `conciergerie-admin`
   - **Branch** : `main`
   - **Root Directory** : `frontend-admin`

   **Build Settings :**
   - **Build Command** : `npm install && npm run build`
   - **Publish Directory** : `dist`

4. Cliquez sur **"Create Static Site"**

### 5. Configurer les URLs

Une fois déployé, vous obtiendrez :
- **Backend** : `https://conciergerie-backend.onrender.com`
- **Frontend** : `https://conciergerie-frontend.onrender.com`
- **Admin** : `https://conciergerie-admin.onrender.com`

**Note :** Sur le plan gratuit, le backend se met en veille après 15 minutes d'inactivité. Le premier démarrage prend 30-60 secondes.

---

## ✅ C'est tout !

Votre application est maintenant déployée et accessible.

---

## 🔄 Mise à jour Automatique

Render déploie automatiquement à chaque push sur `main`. Pas besoin de faire quoi que ce soit !

---

## 💰 Coûts

- **Plan Free** : Gratuit (backend en veille après inactivité)
- **Plan Starter** : $7/mois (backend toujours actif)

---

## 🆘 Dépannage

### Le build échoue

1. Allez dans votre service sur Render
2. Cliquez sur l'onglet **"Logs"**
3. Regardez les dernières lignes pour voir l'erreur

### Le backend ne démarre pas

1. Vérifiez que toutes les variables d'environnement sont définies
2. Vérifiez les logs dans Render
3. Vérifiez que le Start Command est correct : `node dist/server.js`

### Le frontend ne se charge pas

1. Vérifiez que le Publish Directory est `dist`
2. Vérifiez que le build a réussi (regardez les logs)
3. Vérifiez que le Root Directory est correct (`frontend` ou `frontend-admin`)

---

## 🎯 Avantages de Render

- ✅ Interface simple et claire
- ✅ Configuration manuelle (pas de problèmes de détection)
- ✅ Gratuit pour commencer
- ✅ Déploiement automatique depuis GitHub
- ✅ SSL automatique
- ✅ Logs détaillés

