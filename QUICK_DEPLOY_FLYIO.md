# Déploiement Rapide Fly.io - Guide CLI

Guide rapide pour déployer avec la CLI Fly.io.

---

## Étape 1 : Installer et Se Connecter

```bash
# Installer Fly CLI (si pas déjà installé)
curl -L https://fly.io/install.sh | sh

# Se connecter à Fly.io
fly auth login
```

Suivez les instructions pour vous connecter avec votre compte Fly.io.

---

## Étape 2 : Déployer le Backend

```bash
cd backend

# Initialiser Fly.io (première fois seulement)
fly launch --no-deploy --name conciergerie-backend --region cdg

# Configurer les secrets (variables d'environnement)
fly secrets set TWILIO_ACCOUNT_SID=your_account_sid
fly secrets set TWILIO_AUTH_TOKEN=your_auth_token
fly secrets set TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
fly secrets set ANTHROPIC_API_KEY=your_api_key
fly secrets set PORT=3000
fly secrets set NODE_ENV=production
fly secrets set ADMIN_EMAIL=admin@example.com
fly secrets set ADMIN_PASSWORD=your_secure_password

# Déployer
fly deploy

# Noter l'URL générée
fly status
# Notez l'URL (ex: https://conciergerie-backend.fly.dev)
```

---

## Étape 3 : Déployer le Frontend Conciergerie

```bash
cd ../frontend

# Initialiser Fly.io
fly launch --no-deploy --name conciergerie-frontend --region cdg

# IMPORTANT: Modifier le Dockerfile pour pointer vers votre backend
# Remplacez dans frontend/Dockerfile:
# proxy_pass http://conciergerie-backend.fly.dev;
# Par l'URL réelle de votre backend (récupérée à l'étape 2)

# Déployer
fly deploy
```

---

## Étape 4 : Déployer le Frontend Admin

```bash
cd ../frontend-admin

# Initialiser Fly.io
fly launch --no-deploy --name conciergerie-admin --region cdg

# IMPORTANT: Modifier le Dockerfile pour pointer vers votre backend
# Remplacez dans frontend-admin/Dockerfile:
# proxy_pass http://conciergerie-backend.fly.dev;
# Par l'URL réelle de votre backend

# Déployer
fly deploy
```

---

## Commandes Utiles

### Voir les logs
```bash
fly logs
```

### Voir le statut
```bash
fly status
```

### Ouvrir l'app dans le navigateur
```bash
fly open
```

### Voir toutes vos apps
```bash
fly apps list
```

### Redémarrer une app
```bash
fly apps restart conciergerie-backend
```

---

## Configuration du Webhook Twilio

1. Récupérez l'URL de votre backend :
```bash
cd backend
fly status
```

2. Dans Twilio, configurez le webhook :
   - URL : `https://conciergerie-backend.fly.dev/webhook/whatsapp`
   - Méthode : HTTP POST

---

## Mise à Jour

Pour mettre à jour après un push sur GitHub :

```bash
# Backend
cd backend && fly deploy

# Frontend
cd ../frontend && fly deploy

# Frontend Admin
cd ../frontend-admin && fly deploy
```

---

## Script Automatique

J'ai créé un script `deploy-flyio.sh` qui automatise tout :

```bash
./deploy-flyio.sh
```

Le script vous guidera étape par étape.


