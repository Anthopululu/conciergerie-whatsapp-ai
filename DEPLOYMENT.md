# Guide de Déploiement

Ce guide vous explique comment déployer l'application Conciergerie WhatsApp avec IA en production.

## Options de Déploiement

### Option 1 : VPS (Recommandé)
- **DigitalOcean**, **Linode**, **Hetzner**, **OVH**
- Contrôle total, coût modéré (~5-20€/mois)
- Nécessite configuration serveur

### Option 2 : Cloud Platform
- **Railway**, **Render**, **Fly.io**, **Heroku**
- Plus simple, gestion automatique
- Coût variable selon usage

### Option 3 : Docker + VPS
- Déploiement containerisé
- Plus facile à gérer et mettre à jour

## Prérequis

- Node.js 18+ installé sur le serveur
- Un domaine (optionnel mais recommandé)
- Certificat SSL (Let's Encrypt gratuit)
- Compte Twilio configuré
- Clé API Anthropic Claude

## Déploiement sur VPS (Ubuntu/Debian)

### 1. Préparation du Serveur

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer PM2 pour gérer les processus
sudo npm install -g pm2

# Installer Nginx (pour reverse proxy)
sudo apt install nginx -y

# Installer Certbot (pour SSL)
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Cloner le Projet

```bash
# Sur votre serveur
cd /var/www
sudo git clone <votre-repo> conciergerie-whatsapp-ai
cd conciergerie-whatsapp-ai
sudo chown -R $USER:$USER .
```

### 3. Configuration des Variables d'Environnement

```bash
# Créer le fichier .env à la racine
nano .env
```

Contenu du fichier `.env` :

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Anthropic
ANTHROPIC_API_KEY=your_api_key

# Server
PORT=3000
NODE_ENV=production

# Admin credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_password

# URLs (remplacer par votre domaine)
BACKEND_URL=https://api.votre-domaine.com
FRONTEND_URL=https://app.votre-domaine.com
ADMIN_URL=https://admin.votre-domaine.com
```

### 4. Build et Installation

```bash
# Installer les dépendances backend
cd backend
npm install
npm run build

# Installer les dépendances frontend conciergerie
cd ../frontend
npm install
npm run build

# Installer les dépendances frontend admin
cd ../frontend-admin
npm install
npm run build
```

### 5. Configuration Nginx

Créer les fichiers de configuration Nginx :

**Backend API** (`/etc/nginx/sites-available/api.votre-domaine.com`) :

```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Frontend Conciergerie** (`/etc/nginx/sites-available/app.votre-domaine.com`) :

```nginx
server {
    listen 80;
    server_name app.votre-domaine.com;
    root /var/www/conciergerie-whatsapp-ai/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Frontend Admin** (`/etc/nginx/sites-available/admin.votre-domaine.com`) :

```nginx
server {
    listen 80;
    server_name admin.votre-domaine.com;
    root /var/www/conciergerie-whatsapp-ai/frontend-admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activer les sites :

```bash
sudo ln -s /etc/nginx/sites-available/api.votre-domaine.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/app.votre-domaine.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.votre-domaine.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Configuration SSL avec Let's Encrypt

```bash
sudo certbot --nginx -d api.votre-domaine.com
sudo certbot --nginx -d app.votre-domaine.com
sudo certbot --nginx -d admin.votre-domaine.com

# Renouvellement automatique
sudo certbot renew --dry-run
```

### 7. Démarrer l'Application avec PM2

Créer un fichier `ecosystem.config.js` à la racine :

```javascript
module.exports = {
  apps: [{
    name: 'conciergerie-backend',
    script: './backend/dist/server.js',
    cwd: '/var/www/conciergerie-whatsapp-ai',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

Démarrer avec PM2 :

```bash
# Créer le dossier logs
mkdir -p logs

# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
```

### 8. Configuration du Webhook Twilio

Dans votre console Twilio :
1. Allez dans **Messaging** > **Settings** > **WhatsApp Sandbox Settings**
2. Configurez le webhook : `https://api.votre-domaine.com/webhook/whatsapp`
3. Méthode : **HTTP POST**

## Déploiement avec Docker (Optionnel)

### Dockerfile Backend

Créer `backend/Dockerfile` :

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Dockerfile Frontend

Créer `frontend/Dockerfile` :

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./backend/concierge.db:/app/concierge.db
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  frontend-admin:
    build: ./frontend-admin
    ports:
      - "8080:80"
    depends_on:
      - backend
    restart: unless-stopped
```

## Déploiement sur Railway

1. Créer un compte sur [Railway](https://railway.app)
2. Connecter votre repository GitHub
3. Ajouter les variables d'environnement dans Railway
4. Railway détecte automatiquement Node.js et déploie

## Déploiement sur Render

1. Créer un compte sur [Render](https://render.com)
2. Créer un nouveau **Web Service**
3. Connecter votre repository
4. Configuration :
   - **Build Command** : `cd backend && npm install && npm run build`
   - **Start Command** : `cd backend && npm start`
   - **Environment** : Node
5. Ajouter les variables d'environnement

## Déploiement avec CapRover (Recommandé - Très Simple)

CapRover est une plateforme auto-hébergée open-source qui transforme n'importe quel serveur en votre propre PaaS (Platform as a Service). C'est comme Heroku, mais gratuit et sur votre propre serveur.

### Avantages
- ✅ Interface graphique intuitive
- ✅ Déploiement en un clic depuis GitHub
- ✅ SSL automatique (Let's Encrypt)
- ✅ Gestion des domaines facile
- ✅ Monitoring intégré
- ✅ Redémarrage automatique
- ✅ Logs en temps réel

### 1. Installation de CapRover sur votre VPS

```bash
# Sur votre serveur Ubuntu/Debian
# Installer Docker (requis pour CapRover)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer CapRover
docker run -p 80:80 -p 443:443 -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v /captain:/captain caprover/caprover

# Accéder à l'interface CapRover
# Ouvrir http://votre-ip-serveur dans votre navigateur
```

### 2. Configuration Initiale

1. Accéder à `http://votre-ip-serveur` ou `http://captain.caprover.votre-domaine.com`
2. Suivre l'assistant de configuration
3. Définir un mot de passe admin
4. Configurer votre domaine (optionnel mais recommandé)

### 3. Créer les Applications

#### Application Backend

1. Dans CapRover, cliquer sur **Apps** > **One-Click Apps/Databases** > **Create New App**
2. Nommer l'app : `conciergerie-backend`
3. Cliquer sur **App Configs** > **Deployment**
4. Méthode : **GitHub**
5. Connecter votre repository GitHub
6. Branch : `main`
7. Dockerfile Location : `backend/Dockerfile`

**Créer `backend/Dockerfile`** :

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copier le code source
COPY . .

# Build l'application
RUN npm run build

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "dist/server.js"]
```

8. Dans **App Configs** > **Environment Variables**, ajouter :
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

9. Dans **HTTP Settings**, activer **HTTPS** (SSL automatique)
10. Cliquer sur **Save & Update**

#### Application Frontend Conciergerie

1. Créer une nouvelle app : `conciergerie-frontend`
2. Méthode : **GitHub**
3. Dockerfile Location : `frontend/Dockerfile`

**Créer `frontend/Dockerfile`** :

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://conciergerie-backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
```

4. Activer HTTPS
5. **Save & Update**

#### Application Frontend Admin

1. Créer une nouvelle app : `conciergerie-admin`
2. Même processus que le frontend conciergerie
3. Dockerfile Location : `frontend-admin/Dockerfile`

**Créer `frontend-admin/Dockerfile`** (identique au frontend mais pour `frontend-admin`) :

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://conciergerie-backend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
```

### 4. Configuration des Domaines

Dans chaque application :
1. Aller dans **HTTP Settings**
2. Ajouter votre domaine (ex: `app.votre-domaine.com`)
3. CapRover configure automatiquement SSL avec Let's Encrypt

### 5. Persistance de la Base de Données

Pour que la base de données SQLite persiste :

1. Dans l'app backend, aller dans **App Configs** > **Volumes**
2. Ajouter un volume :
   - **Host Path** : `/captain/data/conciergerie-backend`
   - **Container Path** : `/app/concierge.db`
3. Sauvegarder

### 6. Mise à Jour Automatique

CapRover peut mettre à jour automatiquement depuis GitHub :
1. Dans **App Configs** > **Deployment**
2. Activer **Automatic Deployment**
3. À chaque push sur `main`, l'app se met à jour automatiquement

### Avantages de CapRover

- 🚀 Déploiement en quelques minutes
- 🔒 SSL automatique
- 📊 Monitoring intégré
- 🔄 Redéploiement automatique depuis GitHub
- 💰 Gratuit (juste le coût du VPS)
- 🛠️ Interface graphique intuitive

## Déploiement avec GitHub Actions (CI/CD Automatique)

Cette méthode automatise complètement le déploiement à chaque push sur GitHub.

### 1. Créer le Workflow GitHub Actions

Créer `.github/workflows/deploy.yml` :

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Build Backend
      run: |
        cd backend
        npm ci
        npm run build
    
    - name: Build Frontend
      run: |
        cd frontend
        npm ci
        npm run build
    
    - name: Build Frontend Admin
      run: |
        cd frontend-admin
        npm ci
        npm run build
    
    - name: Deploy to Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USER }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/conciergerie-whatsapp-ai
          git pull origin main
          cd backend && npm ci && npm run build
          cd ../frontend && npm ci && npm run build
          cd ../frontend-admin && npm ci && npm run build
          pm2 restart conciergerie-backend
```

### 2. Configurer les Secrets GitHub

Dans votre repository GitHub :
1. Aller dans **Settings** > **Secrets and variables** > **Actions**
2. Ajouter :
   - `SSH_HOST` : IP de votre serveur
   - `SSH_USER` : utilisateur SSH (ex: `root` ou `ubuntu`)
   - `SSH_KEY` : clé privée SSH

### 3. Utilisation

À chaque push sur `main`, l'application se déploie automatiquement !

## Comparaison des Méthodes

| Méthode | Difficulté | Coût | Automatisation | Recommandé pour |
|---------|-----------|------|----------------|-----------------|
| **VPS + PM2** | ⭐⭐⭐ | 5-20€/mois | Manuel | Contrôle total |
| **CapRover** | ⭐⭐ | 5-20€/mois | Auto (GitHub) | Simplicité + Contrôle |
| **Railway/Render** | ⭐ | Variable | Auto | Démarrage rapide |
| **Docker Compose** | ⭐⭐⭐ | 5-20€/mois | Manuel | Environnements isolés |
| **GitHub Actions** | ⭐⭐ | Gratuit | Auto | CI/CD professionnel |

## Mise à Jour de l'Application

```bash
# Sur votre serveur
cd /var/www/conciergerie-whatsapp-ai

# Récupérer les dernières modifications
git pull

# Rebuild backend
cd backend
npm install
npm run build

# Rebuild frontends
cd ../frontend
npm install
npm run build

cd ../frontend-admin
npm install
npm run build

# Redémarrer avec PM2
pm2 restart conciergerie-backend

# Redémarrer Nginx
sudo systemctl reload nginx
```

## Vérification du Déploiement

1. **Backend** : `https://api.votre-domaine.com/api/health` (si endpoint existe)
2. **Frontend Conciergerie** : `https://app.votre-domaine.com`
3. **Frontend Admin** : `https://admin.votre-domaine.com`
4. **Webhook Twilio** : Envoyer un message test depuis WhatsApp

## Sécurité

- ✅ Utiliser HTTPS (SSL)
- ✅ Variables d'environnement sécurisées
- ✅ Mots de passe forts pour admin
- ✅ Firewall configuré (UFW)
- ✅ Mises à jour régulières

## Monitoring

```bash
# Voir les logs
pm2 logs conciergerie-backend

# Voir le statut
pm2 status

# Monitoring en temps réel
pm2 monit
```

## Sauvegarde

```bash
# Sauvegarder la base de données
cp backend/concierge.db backups/concierge-$(date +%Y%m%d).db

# Automatiser avec cron
0 2 * * * cp /var/www/conciergerie-whatsapp-ai/backend/concierge.db /var/backups/concierge-$(date +\%Y\%m\%d).db
```

## Support

En cas de problème :
1. Vérifier les logs : `pm2 logs`
2. Vérifier Nginx : `sudo nginx -t && sudo systemctl status nginx`
3. Vérifier les ports : `sudo netstat -tulpn | grep :3000`

