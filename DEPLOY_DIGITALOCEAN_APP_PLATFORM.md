# Guide de Déploiement - DigitalOcean App Platform

## Configuration Manuelle des Composants

DigitalOcean n'a pas détecté automatiquement les composants. Voici comment les configurer manuellement.

---

## Étape 1 : Créer l'Application

1. Dans DigitalOcean, allez dans **App Platform**
2. Cliquez sur **Create App**
3. Connectez votre repository GitHub : `Anthopululu/conciergerie-whatsapp-ai`
4. Branch : `main`
5. Cliquez sur **Next**

---

## Étape 2 : Configurer le Backend

1. Cliquez sur **Edit** à côté de "No components detected"
2. Cliquez sur **Add Component** > **Web Service**

**Configuration Backend :**
- **Name** : `backend`
- **Source Directory** : `backend`
- **Build Command** : `npm install && npm run build`
- **Run Command** : `npm start`
- **HTTP Port** : `3000`
- **Environment** : Node.js
- **Node Version** : 18.x

**Environment Variables** (cliquez sur **Edit** à côté de Environment Variables) :
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
ANTHROPIC_API_KEY=your_api_key
PORT=3000
NODE_ENV=production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password
```

---

## Étape 3 : Configurer le Frontend Conciergerie

1. Cliquez sur **Add Component** > **Static Site**

**Configuration Frontend :**
- **Name** : `frontend`
- **Source Directory** : `frontend`
- **Build Command** : `npm install && npm run build`
- **Output Directory** : `dist`
- **Environment** : Node.js
- **Node Version** : 18.x

**Routes** (cliquez sur **Edit Routes**) :
- Ajoutez une route : `/api/*` → Pointe vers le composant `backend`

---

## Étape 4 : Configurer le Frontend Admin

1. Cliquez sur **Add Component** > **Static Site**

**Configuration Frontend Admin :**
- **Name** : `frontend-admin`
- **Source Directory** : `frontend-admin`
- **Build Command** : `npm install && npm run build`
- **Output Directory** : `dist`
- **Environment** : Node.js
- **Node Version** : 18.x

**Routes** (cliquez sur **Edit Routes**) :
- Ajoutez une route : `/api/*` → Pointe vers le composant `backend`

---

## Étape 5 : Configurer les Domaines (Optionnel)

1. Dans **Settings** > **Domains**
2. Ajoutez vos domaines :
   - `api.votre-domaine.com` → Backend
   - `app.votre-domaine.com` → Frontend Conciergerie
   - `admin.votre-domaine.com` → Frontend Admin
3. DigitalOcean configure automatiquement SSL

---

## Étape 6 : Déployer

1. Cliquez sur **Next** pour passer en revue la configuration
2. Vérifiez que les 3 composants sont bien configurés
3. Cliquez sur **Create Resources**
4. DigitalOcean va build et déployer automatiquement

---

## Vérification

Une fois déployé, vous verrez les URLs de chaque composant :
- Backend : `https://backend-xxxxx.ondigitalocean.app`
- Frontend Conciergerie : `https://frontend-xxxxx.ondigitalocean.app`
- Frontend Admin : `https://frontend-admin-xxxxx.ondigitalocean.app`

---

## Configuration du Webhook Twilio

1. Dans votre console Twilio
2. **Messaging** > **Settings** > **WhatsApp Sandbox Settings**
3. Webhook URL : `https://backend-xxxxx.ondigitalocean.app/webhook/whatsapp`
   (Utilisez l'URL du backend affichée dans DigitalOcean)
4. Méthode : **HTTP POST**

---

## Mise à Jour Automatique

À chaque push sur `main`, DigitalOcean redéploie automatiquement ! 🚀

---

## Problèmes Courants

### Build échoue
- Vérifiez que `package.json` existe dans chaque dossier
- Vérifiez les logs de build dans DigitalOcean

### Variables d'environnement
- Assurez-vous que toutes les variables sont définies
- Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs

### Routes ne fonctionnent pas
- Vérifiez que les routes `/api/*` pointent vers le composant `backend`
- Les routes sont sensibles à la casse


