# Guide de Déploiement Railway - Étape par Étape

Railway est la solution la plus simple pour déployer votre application.

---

## Étape 1 : Créer un Compte Railway

1. Allez sur https://railway.app
2. Cliquez sur **"Start a New Project"**
3. Connectez-vous avec **GitHub**
4. Autorisez Railway à accéder à vos repositories

---

## Étape 2 : Déployer le Backend

1. Dans Railway, cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Choisissez votre repository : `Anthopululu/conciergerie-whatsapp-ai`
4. Railway va détecter automatiquement Node.js

5. **Configuration du Service Backend** :
   - Cliquez sur le service créé
   - Allez dans **"Settings"**
   - **Root Directory** : `backend`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Watch Paths** : `backend/**`

6. **Variables d'Environnement** :
   - Allez dans l'onglet **"Variables"**
   - Cliquez sur **"New Variable"** et ajoutez une par une :
     ```
     TWILIO_ACCOUNT_SID = votre_account_sid
     TWILIO_AUTH_TOKEN = votre_auth_token
     TWILIO_WHATSAPP_NUMBER = whatsapp:+14155238886
     ANTHROPIC_API_KEY = votre_api_key
     PORT = 3000
     NODE_ENV = production
     ADMIN_EMAIL = admin@example.com
     ADMIN_PASSWORD = votre_mot_de_passe_securise
     ```

7. Railway va automatiquement :
   - Build l'application
   - Déployer
   - Générer une URL HTTPS (ex: `conciergerie-backend.railway.app`)

---

## Étape 3 : Déployer le Frontend Conciergerie

1. Dans votre projet Railway, cliquez sur **"New"** > **"Service"**
2. Sélectionnez **"GitHub Repo"**
3. Choisissez le même repository : `Anthopululu/conciergerie-whatsapp-ai`

4. **Configuration** :
   - **Root Directory** : `frontend`
   - Railway détectera automatiquement que c'est un site statique
   - **Build Command** : `npm install && npm run build`
   - **Output Directory** : `dist`

5. **Variables d'Environnement** (optionnel) :
   - Si vous voulez pointer vers le backend Railway :
     ```
     VITE_API_URL = https://conciergerie-backend.railway.app
     ```

6. Railway génère automatiquement une URL HTTPS

---

## Étape 4 : Déployer le Frontend Admin

1. Répétez l'Étape 3 mais avec :
   - **Root Directory** : `frontend-admin`

---

## Étape 5 : Configurer les Routes API (Important)

Pour que les frontends puissent communiquer avec le backend :

### Option A : Utiliser l'URL Railway du backend

1. Dans chaque frontend, modifiez les appels API pour utiliser l'URL Railway
2. Ou configurez un proxy dans Railway (voir Option B)

### Option B : Configurer un Proxy dans Railway

1. Dans chaque frontend, allez dans **"Settings"** > **"Networking"**
2. Ajoutez une route :
   - **Path** : `/api/*`
   - **Target** : `conciergerie-backend` (le nom de votre service backend)

---

## Étape 6 : Configuration du Webhook Twilio

1. Dans votre console Twilio
2. **Messaging** > **Settings** > **WhatsApp Sandbox Settings**
3. Webhook URL : `https://conciergerie-backend.railway.app/webhook/whatsapp`
   (Utilisez l'URL du backend affichée dans Railway)
4. Méthode : **HTTP POST**

---

## Étape 7 : Mise à Jour Automatique

À chaque push sur `main`, Railway redéploie automatiquement ! 🚀

---

## URLs Générées

Railway génère automatiquement des URLs HTTPS pour chaque service :
- Backend : `https://conciergerie-backend.railway.app`
- Frontend : `https://conciergerie-frontend.railway.app`
- Admin : `https://conciergerie-admin.railway.app`

Vous pouvez aussi configurer des domaines personnalisés dans **"Settings"** > **"Domains"**.

---

## Coûts

- **Gratuit** : $5 de crédit/mois (suffisant pour tester)
- **Starter** : $5/mois (après les crédits gratuits)
- **Pro** : $20/mois (pour la production)

---

## Avantages Railway

- ✅ Déploiement en 10 minutes
- ✅ SSL automatique
- ✅ Logs en temps réel
- ✅ Redéploiement automatique
- ✅ Interface très simple
- ✅ Support excellent

---

## Problèmes Courants

### Build échoue
- Vérifiez que `package.json` existe dans `backend/`
- Vérifiez les logs dans Railway

### Variables d'environnement
- Assurez-vous qu'elles sont bien définies
- Pas d'espaces avant/après les valeurs

### Frontend ne peut pas joindre le backend
- Vérifiez que l'URL du backend est correcte
- Configurez les routes proxy dans Railway

---

## Support

- Documentation Railway : https://docs.railway.app
- Discord Railway : https://discord.gg/railway


