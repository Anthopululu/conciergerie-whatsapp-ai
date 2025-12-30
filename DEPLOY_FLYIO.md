# Guide de Déploiement Fly.io

Guide complet pour déployer votre application sur Fly.io.

---

## Prérequis

1. Installer Fly CLI sur votre Mac :
```bash
curl -L https://fly.io/install.sh | sh
```

2. Se connecter à Fly.io :
```bash
fly auth login
```

---

## Étape 1 : Déployer le Backend

1. **Aller dans le dossier backend** :
```bash
cd backend
```

2. **Initialiser Fly.io** :
```bash
fly launch
```

Répondez aux questions :
- **App name** : `conciergerie-backend` (ou laissez Fly.io générer un nom)
- **Region** : Choisissez la région la plus proche (ex: `cdg` pour Paris, `ord` pour Chicago)
- **PostgreSQL** : `No`
- **Redis** : `No`

3. **Configurer les secrets (variables d'environnement)** :
```bash
fly secrets set TWILIO_ACCOUNT_SID=your_account_sid
fly secrets set TWILIO_AUTH_TOKEN=your_auth_token
fly secrets set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
fly secrets set ANTHROPIC_API_KEY=your_api_key
fly secrets set PORT=3000
fly secrets set NODE_ENV=production
fly secrets set ADMIN_EMAIL=admin@example.com
fly secrets set ADMIN_PASSWORD=your_secure_password
```

4. **Déployer** :
```bash
fly deploy
```

5. **Vérifier l'URL générée** :
```bash
fly status
```
Notez l'URL (ex: `https://conciergerie-backend.fly.dev`)

---

## Étape 2 : Déployer le Frontend Conciergerie

1. **Aller dans le dossier frontend** :
```bash
cd ../frontend
```

2. **Initialiser Fly.io** :
```bash
fly launch
```

Répondez aux questions :
- **App name** : `conciergerie-frontend`
- **Region** : Même région que le backend
- **PostgreSQL** : `No`
- **Redis** : `No`

3. **Modifier le Dockerfile** pour pointer vers le bon backend :
Ouvrez `frontend/Dockerfile` et remplacez :
```
proxy_pass http://conciergerie-backend.fly.dev;
```
par l'URL réelle de votre backend (récupérée à l'étape 1).

4. **Déployer** :
```bash
fly deploy
```

---

## Étape 3 : Déployer le Frontend Admin

1. **Aller dans le dossier frontend-admin** :
```bash
cd ../frontend-admin
```

2. **Initialiser Fly.io** :
```bash
fly launch
```

Répondez aux questions :
- **App name** : `conciergerie-admin`
- **Region** : Même région que le backend
- **PostgreSQL** : `No`
- **Redis** : `No`

3. **Modifier le Dockerfile** pour pointer vers le bon backend :
Ouvrez `frontend-admin/Dockerfile` et remplacez :
```
proxy_pass http://conciergerie-backend.fly.dev;
```
par l'URL réelle de votre backend.

4. **Déployer** :
```bash
fly deploy
```

---

## Étape 4 : Configuration du Webhook Twilio

1. Dans votre console Twilio
2. **Messaging** > **Settings** > **WhatsApp Sandbox Settings**
3. Webhook URL : `https://conciergerie-backend.fly.dev/webhook/whatsapp`
   (Utilisez l'URL réelle de votre backend)
4. Méthode : **HTTP POST**

---

## Commandes Utiles Fly.io

### Voir les logs
```bash
fly logs
```

### Voir le statut
```bash
fly status
```

### Redémarrer une app
```bash
fly apps restart conciergerie-backend
```

### Voir les secrets
```bash
fly secrets list
```

### Ouvrir l'app dans le navigateur
```bash
fly open
```

---

## Mise à Jour

Pour mettre à jour après un push sur GitHub :

```bash
# Backend
cd backend
fly deploy

# Frontend
cd ../frontend
fly deploy

# Frontend Admin
cd ../frontend-admin
fly deploy
```

---

## Coûts Fly.io

- **Gratuit** : 3 machines partagées gratuites
- **Payant** : ~$1.94/mois par machine après les gratuites
- **Total estimé** : ~$6-10/mois pour les 3 apps

---

## Avantages Fly.io

- ✅ Déploiement rapide
- ✅ SSL automatique
- ✅ Scaling automatique
- ✅ Machines qui s'arrêtent automatiquement (économie)
- ✅ Global edge network (rapide partout)

---

## Problèmes Courants

### Build échoue
- Vérifiez que tous les fichiers nécessaires sont présents
- Vérifiez les logs : `fly logs`

### Variables d'environnement
- Utilisez `fly secrets set` (pas `fly env set`)
- Les secrets sont sécurisés et chiffrés

### Frontend ne peut pas joindre le backend
- Vérifiez l'URL dans le Dockerfile
- Vérifiez que le backend est déployé et accessible


